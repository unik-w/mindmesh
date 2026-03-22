import logging
from typing import Any
from xml.etree import ElementTree as ET

import requests
from fastapi import APIRouter, Depends, HTTPException, Query

from backend import deps
from backend.routers.paper import _compute_embedding

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


def _upsert_papers(papers: list[dict[str, Any]]) -> None:
    rows = []
    for p in papers:
        try:
            embedding = _compute_embedding(p.get("title", ""), p.get("summary"))
            rows.append({
                "id": p["id"],
                "title": p.get("title", ""),
                "summary": p.get("summary"),
                "authors": p.get("authors", []),
                "categories": p.get("categories", []),
                "links": p.get("links", {}),
                "published": p.get("published"),
                "embedding": "[" + ",".join(str(x) for x in embedding) + "]",
            })
        except Exception:
            log.exception("Failed to embed paper %s", p.get("id"))
    if rows:
        deps.db.table("papers").upsert(rows).execute()


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


@router.get("/search")
def search_arxiv(
    q: str = Query(..., min_length=1, description="Search query, arXiv URL, or arXiv ID"),
    start: int = Query(0, ge=0, description="Pagination offset"),
    max_results: int = Query(20, ge=1, le=100, description="Number of results"),
    _user: dict = Depends(deps.get_current_user),
):
    arxiv_id = _extract_arxiv_id(q)
    if arxiv_id:
        search_query = f"id:{arxiv_id}"
        params = {"search_query": search_query, "start": 0, "max_results": 1}
    else:
        search_query = f"all:{q}"
        params = {
            "search_query": search_query,
            "start": start,
            "max_results": max_results,
            "sortBy": "relevance",
            "sortOrder": "descending",
        }

    try:
        resp = requests.get(
            ARXIV_API,
            params=params,
            headers={"User-Agent": "mindmesh/1"},
            timeout=120,
        )
        resp.raise_for_status()
    except requests.Timeout:
        raise HTTPException(504, "arXiv API timed out — try again")
    except requests.RequestException as e:
        log.error("arXiv request failed: %s", e)
        raise HTTPException(502, f"arXiv API error: {e}")

    if resp.status_code != 200:
        log.error("arXiv returned %s: %s", resp.status_code, resp.text[:500])
        raise HTTPException(502, f"arXiv returned status {resp.status_code}")

    data = _parse_feed(resp.text)
    _upsert_papers(data.get("papers", []))
    return data
