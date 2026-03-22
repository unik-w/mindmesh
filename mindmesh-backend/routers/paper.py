import logging

import torch
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from backend import deps

log = logging.getLogger(__name__)

router = APIRouter(prefix="/paper", tags=["Paper"])


class PaperInsertRequest(BaseModel):
    id: str
    title: str
    summary: str | None = None
    authors: list[str] = []
    categories: list[str] = []
    links: dict = {}
    published: str | None = None


def _compute_embedding(title: str, summary: str | None) -> list[float]:
    text = title + deps.tokenizer.sep_token + (summary or "")
    inputs = deps.tokenizer(
        [text],
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors="pt",
        return_token_type_ids=False,
    )
    inputs = {k: v.to(deps.embed_device) for k, v in inputs.items()}
    with torch.inference_mode():
        out = deps.embed_model(**inputs)
    return out.last_hidden_state[:, 0, :].float().cpu()[0].tolist()


def _is_doi_or_url(q: str) -> bool:
    return q.startswith("10.") or q.startswith("http://") or q.startswith("https://")


def paper_like_total(paper_id: str) -> int:
    """Supabase SQL function `paper_like_count` (see create_tables.sql)."""
    try:
        r = deps.db.rpc("paper_like_count", {"p_paper_id": paper_id}).execute()
        d = r.data
        # PostgREST sometimes returns a bare number, sometimes a one-element list.
        if isinstance(d, list) and d:
            d = d[0]
        return max(0, int(d))
    except Exception as exc:
        log.warning("paper_like_count(%s): %s", paper_id, exc)
        return 0


@router.get("/search")
def search_papers(
    q: str = Query(..., min_length=1, description="Search query, DOI, or URL"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    if _is_doi_or_url(q):
        result = (
            deps.db.table("papers")
            .select("id, title, summary, authors, categories, links, published")
            .or_(f"id.eq.{q},links.cs.{q}")
            .range(offset, offset + limit - 1)
            .execute()
        )
    else:
        result = (
            deps.db.table("papers")
            .select("id, title, summary, authors, categories, links, published")
            .or_(f"title.ilike.%{q}%,summary.ilike.%{q}%,authors.cs.[\"{q}\"]")
            .order("published", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
    return result.data


@router.get("/list")
def list_papers(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    result = (
        deps.db.table("papers")
        .select("id, title, summary, authors, categories, links, published")
        .order("published", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


@router.get("/likes")
def get_paper_like_count(
    paper_id: str = Query(..., min_length=1, description="Paper id (papers.id)"),
):
    """Count rows in `likes` for this paper (global total)."""
    return {"likes": paper_like_total(paper_id)}


@router.post("/insert")
def insert_paper(body: PaperInsertRequest, user: dict = Depends(deps.get_current_user)):
    existing = deps.db.table("papers").select("id").eq("id", body.id).execute()
    if existing.data:
        return existing.data[0]

    embedding = _compute_embedding(body.title, body.summary)

    row = body.model_dump()
    row["embedding"] = "[" + ",".join(str(x) for x in embedding) + "]"

    result = deps.db.table("papers").upsert(row).execute()
    log.info("Inserted new paper: %s", body.id)
    return result.data[0]
