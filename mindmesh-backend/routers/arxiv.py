import logging
from typing import Any
from xml.etree import ElementTree as ET

import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend import deps

log = logging.getLogger(__name__)

router = APIRouter(prefix="/arxiv", tags=["arXiv"])

ARXIV_API = "https://export.arxiv.org/api/query"
A = "{http://www.w3.org/2005/Atom}"
X = "{http://arxiv.org/schemas/atom}"
OS = "{http://a9.com/-/spec/opensearch/1.1/}"


def _txt(el: ET.Element | None) -> str:
    return (el.text or "").strip() if el is not None else ""


def _parse_entry(e: ET.Element) -> dict[str, Any]:
    authors = [_txt(a.find(f"{A}name")) for a in e.findall(f"{A}author")]
    cats = [c.get("term", "") for c in e.findall(f"{X}primary_category")]
    for c in e.findall(f"{A}category"):
        t = c.get("term", "")
        if t and t not in cats:
            cats.append(t)
    links = {
        ln.get("title", ln.get("type", "link")): ln.get("href", "")
        for ln in e.findall(f"{A}link")
    }
    return {
        "id": _txt(e.find(f"{A}id")),
        "title": " ".join(_txt(e.find(f"{A}title")).split()),
        "summary": " ".join(_txt(e.find(f"{A}summary")).split()),
        "authors": authors,
        "published": _txt(e.find(f"{A}published")),
        "categories": cats,
        "links": links,
    }


def _parse_feed(xml: str) -> dict[str, Any]:
    root = ET.fromstring(xml)
    return {
        "total_results": int(_txt(root.find(f"{OS}totalResults")) or 0),
        "start_index": int(_txt(root.find(f"{OS}startIndex")) or 0),
        "items_per_page": int(_txt(root.find(f"{OS}itemsPerPage")) or 0),
        "papers": [_parse_entry(e) for e in root.findall(f"{A}entry")],
    }


def _extract_arxiv_id(q: str) -> str | None:
    """Extract arXiv ID from a URL, DOI, or bare ID."""
    import re
    # URL: https://arxiv.org/abs/2301.01234
    m = re.search(r"arxiv\.org/(?:abs|pdf)/(\d+\.\d+)", q)
    if m:
        return m.group(1)
    # DOI: 10.48550/arXiv.2509.24857
    m = re.search(r"arXiv\.(\d+\.\d+)", q, re.IGNORECASE)
    if m:
        return m.group(1)
    # Bare ID: 2301.01234 or 2301.01234v2
    if re.match(r"^\d{4}\.\d{4,5}(v\d+)?$", q):
        return q
    return None


def query_arxiv(
    search_query: str,
    *,
    start: int = 0,
    max_results: int = 6,
    sort_by: str = "submittedDate",
    sort_order: str = "descending",
) -> dict[str, Any]:
    """Reusable arXiv API query. Raises on network/HTTP errors."""
    resp = requests.get(
        ARXIV_API,
        params={
            "search_query": search_query,
            "start": start,
            "max_results": max_results,
            "sortBy": sort_by,
            "sortOrder": sort_order,
        },
        headers={"User-Agent": "mindmesh/1"},
        timeout=120,
    )
    resp.raise_for_status()
    return _parse_feed(resp.text)


@router.get("/search")
def search_arxiv(
    q: str = Query(..., min_length=1, description="Search query, arXiv URL, or arXiv ID"),
    start: int = Query(0, ge=0, description="Pagination offset"),
    max_results: int = Query(6, ge=1, le=100, description="Number of results"),
    _user: dict = Depends(deps.get_current_user),
):
    arxiv_id = _extract_arxiv_id(q)
    if arxiv_id:
        return query_arxiv(f"id:{arxiv_id}", max_results=1)

    try:
        return query_arxiv(
            f"all:{q}",
            start=start,
            max_results=max_results,
            sort_by="relevance",
        )
    except requests.Timeout:
        raise HTTPException(504, "arXiv API timed out — try again")
    except requests.RequestException as e:
        log.error("arXiv request failed: %s", e)
        raise HTTPException(502, f"arXiv API error: {e}")


class MoreRequest(BaseModel):
    q: str
    arxiv_start: int = 12
    db_offset: int = 0
    page_size: int = 6
    seed_papers: list[dict] = []  # [{"title": ..., "summary": ...}]


@router.post("/more")
def arxiv_more(body: MoreRequest, _user: dict = Depends(deps.get_current_user)):
    """Load more results for an arXiv search.

    Tries semantic DB search (via seed-paper embeddings) first.
    Falls back to paginated arXiv results when the best DB similarity
    is below MIN_SIM = 0.75.
    """
    import numpy as np
    from backend.routers.paper import _compute_embedding

    MIN_SIM = 0.75

    # --- 1. Try DB semantic search using seed paper embeddings ---
    if body.seed_papers:
        embeddings = []
        for sp in body.seed_papers[:5]:
            title = (sp.get("title") or "").strip()
            summary = (sp.get("summary") or "").strip()
            if title:
                try:
                    embeddings.append(_compute_embedding(title, summary))
                except Exception as exc:
                    log.warning("Embedding failed for seed paper: %s", exc)

        if embeddings:
            avg_emb = np.mean(embeddings, axis=0).tolist()
            emb_str = "[" + ",".join(f"{x:.8f}" for x in avg_emb) + "]"

            try:
                db_result = deps.db.rpc(
                    "search_papers",
                    {
                        "p_query": body.q,
                        "p_embedding": emb_str,
                        "p_limit": body.page_size,
                        "p_offset": body.db_offset,
                    },
                ).execute()
                db_papers = db_result.data or []

                if db_papers:
                    best_sim = max((r.get("similarity") or 0.0) for r in db_papers)
                    log.info(
                        "[arxiv/more] DB best_sim=%.4f threshold=%.2f", best_sim, MIN_SIM
                    )
                    if best_sim >= MIN_SIM:
                        return {
                            "source": "db",
                            "papers": db_papers,
                            "arxiv_start": body.arxiv_start,
                            "db_offset": body.db_offset + body.page_size,
                        }
                    log.info("[arxiv/more] DB similarity below threshold, using arXiv")
            except Exception as exc:
                log.error("[arxiv/more] DB search failed: %s", exc)

    # --- 2. Fallback: more arXiv results ---
    try:
        result = query_arxiv(
            f"all:{body.q}",
            start=body.arxiv_start,
            max_results=body.page_size,
            sort_by="relevance",
        )
        return {
            "source": "arxiv",
            "papers": result.get("papers", []),
            "total_results": result.get("total_results", 0),
            "arxiv_start": body.arxiv_start + body.page_size,
            "db_offset": body.db_offset,
        }
    except requests.Timeout:
        raise HTTPException(504, "arXiv API timed out — try again")
    except requests.RequestException as e:
        log.error("arXiv /more request failed: %s", e)
        raise HTTPException(502, f"arXiv API error: {e}")
