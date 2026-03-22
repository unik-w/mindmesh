import json
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend import deps

log = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["User"])


class LikeRequest(BaseModel):
    paper_id: str


class UpdateInterestsRequest(BaseModel):
    interests: list[str]


@router.put("/update_interests")
def update_interests(body: UpdateInterestsRequest, user: dict = Depends(deps.get_current_user)):
    result = (
        deps.db.table("users")
        .update({"interests": json.dumps(body.interests)})
        .eq("id", user["user_id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "User not found")
    return result.data[0]


@router.get("/likes")
def get_likes(user: dict = Depends(deps.get_current_user)):
    result = (
        deps.db.table("likes")
        .select("papers:paper_id(id, title, summary, authors, categories, links, published)")
        .eq("user_id", user["user_id"])
        .execute()
    )
    return [row["papers"] for row in result.data if row.get("papers")]


def _interest_fallback_feed(user_id: str, limit: int, offset: int) -> list:
    """When recommend_papers returns nothing (no likes yet), fetch papers
    from the arXiv API matching the user's saved interests."""
    import requests
    from backend.routers.arxiv import ARXIV_API, _parse_feed

    row = deps.db.table("users").select("interests").eq("id", user_id).execute()
    if not row.data:
        return []

    raw = row.data[0].get("interests", "[]")
    interests = json.loads(raw) if isinstance(raw, str) else (raw or [])
    if not interests:
        return []

    stop = {"and", "&", "the", "of", "in", "for", "a", "an", "to"}
    terms: list[str] = []
    for label in interests:
        words = [
            w.strip("&,;. ").lower()
            for w in str(label).split()
            if w.strip("&,;. ").lower() not in stop and len(w.strip("&,;. ")) > 2
        ]
        if words:
            terms.append("all:" + "+".join(words))

    if not terms:
        return []

    search_query = " OR ".join(terms[:8])

    try:
        resp = requests.get(
            ARXIV_API,
            params={
                "search_query": search_query,
                "start": offset,
                "max_results": limit,
                "sortBy": "relevance",
                "sortOrder": "descending",
            },
            headers={"User-Agent": "mindmesh/1"},
            timeout=120,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        log.error("arXiv interest search failed: %s", exc)
        return []

    feed = _parse_feed(resp.text)
    return feed.get("papers", [])


@router.get("/feed")
def feed(
    user: dict = Depends(deps.get_current_user),
    limit: int = Query(6, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    result = deps.db.rpc(
        "recommend_papers",
        {"p_user_id": user["user_id"], "p_limit": limit, "p_offset": offset},
    ).execute()

    if result.data:
        return result.data

    log.info("No recommendations for user %s, falling back to interest search", user["user_id"])
    return _interest_fallback_feed(user["user_id"], limit, offset)


@router.post("/like")
def like_paper(body: LikeRequest, user: dict = Depends(deps.get_current_user)):
    result = (
        deps.db.table("likes")
        .upsert(
            {
                "id": str(uuid.uuid4()),
                "user_id": user["user_id"],
                "paper_id": body.paper_id,
            },
            on_conflict="user_id,paper_id",
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Failed to save like")
    return result.data[0]


@router.delete("/dislike")
def dislike_paper(body: LikeRequest, user: dict = Depends(deps.get_current_user)):
    deps.db.table("likes").delete().eq("user_id", user["user_id"]).eq(
        "paper_id", body.paper_id
    ).execute()
    return {"message": "Like removed"}
