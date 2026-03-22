import json
import logging
import uuid
from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from backend import deps
from backend.routers.paper import paper_like_total

log = logging.getLogger(__name__)

router = APIRouter(prefix="/user", tags=["User"])


class LikeRequest(BaseModel):
    paper_id: str
    session_id: str | None = None
    title: str | None = None
    summary: str | None = None
    authors: list[str] = []
    categories: list[str] = []
    links: dict = {}
    published: str | None = None


class CreateSessionBody(BaseModel):
    name: str = Field(default="New session", min_length=1, max_length=500)


class UpdateInterestsRequest(BaseModel):
    interests: list[str]


def _assert_session_owned(session_id: str, user_id: str) -> None:
    row = (
        deps.db.table("sessions")
        .select("id")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not row.data:
        raise HTTPException(status_code=404, detail="Session not found")


@router.post("/sessions")
def create_session(body: CreateSessionBody, user: dict = Depends(deps.get_current_user)):
    sid = str(uuid.uuid4())
    name = body.name.strip() or "New session"
    # postgrest-py: insert() returns SyncQueryRequestBuilder (no .select()); default returning=representation returns the row.
    result = (
        deps.db.table("sessions")
        .insert({"id": sid, "user_id": user["user_id"], "name": name})
        .execute()
    )
    if not result.data:
        log.error("sessions insert returned no rows (check DB schema, RLS, and SUPABASE_KEY)")
        raise HTTPException(status_code=500, detail="Failed to create session")
    return result.data[0]


@router.get("/sessions")
def list_sessions(user: dict = Depends(deps.get_current_user)):
    uid = user["user_id"]
    result = (
        deps.db.table("sessions")
        .select("id, name, created_at")
        .eq("user_id", uid)
        .order("created_at", desc=True)
        .execute()
    )
    rows = result.data or []
    likes_res = (
        deps.db.table("likes")
        .select("session_id")
        .eq("user_id", uid)
        .execute()
    )
    by_session = Counter()
    for row in likes_res.data or []:
        sid = row.get("session_id")
        if sid:
            by_session[sid] += 1
    for s in rows:
        s["like_count"] = by_session.get(s["id"], 0)
    return rows


@router.delete("/session/delete")
def delete_session(
    session_id: str = Query(..., min_length=1, description="Session UUID"),
    user: dict = Depends(deps.get_current_user),
):
    """Remove a workspace session. Likes for this session become unscoped (session_id set NULL)."""
    _assert_session_owned(session_id, user["user_id"])
    deps.db.table("sessions").delete().eq("id", session_id).eq(
        "user_id", user["user_id"]
    ).execute()
    return {"deleted": True, "session_id": session_id}


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


_INTEREST_TO_ARXIV_CATS: dict[str, list[str]] = {
    "Machine learning": ["cs.LG", "stat.ML"],
    "AI": ["cs.AI", "cs.CL", "cs.CV"],
    "Biology": ["q-bio"],
    "Genomics": ["q-bio.GN"],
    "Climate": ["physics.ao-ph", "physics.geo-ph"],
    "Sustainability": ["cs.CY"],
    "Physics": ["physics"],
    "Applied math": ["math.AP", "math-ph"],
    "Medicine": ["q-bio.QM"],
    "Health": ["q-bio"],
    "HCI": ["cs.HC"],
    "Design": ["cs.HC", "cs.GR"],
    "Computing": ["cs.DC", "cs.PF"],
    "Neuroscience": ["q-bio.NC"],
    "Cognition": ["q-bio.NC"],
    "Chemistry": ["physics.chem-ph"],
    "Materials": ["cond-mat.mtrl-sci"],
    "Robotics": ["cs.RO"],
    "Systems": ["cs.SY", "eess.SY"],
    "Economics": ["econ"],
    "Policy": ["cs.CY", "econ.GN"],
    "Social science": ["cs.SI", "cs.CY"],
    "Behavioral science": ["q-bio.NC"],
    "Energy": ["eess.SP", "physics.app-ph"],
    "Infrastructure": ["cs.NI"],
}


def _arxiv_feed_for_interests(user_id: str, limit: int, offset: int) -> list:
    """Fetch recent arXiv papers matching the user's saved interests."""
    from backend.routers.arxiv import query_arxiv

    row = deps.db.table("users").select("interests").eq("id", user_id).execute()
    if not row.data:
        return []

    raw = row.data[0].get("interests", "[]")
    interests = json.loads(raw) if isinstance(raw, str) else (raw or [])
    if not interests:
        return []

    cats: set[str] = set()
    keyword_terms: list[str] = []
    stop = {"and", "&", "the", "of", "in", "for", "a", "an", "to"}

    for label in interests:
        mapped = _INTEREST_TO_ARXIV_CATS.get(label)
        if mapped:
            cats.update(mapped)
        else:
            words = [
                w.strip("&,;. ").lower()
                for w in str(label).split()
                if w.strip("&,;. ").lower() not in stop and len(w.strip("&,;. ")) > 1
            ]
            if words:
                keyword_terms.append("ti:" + "+".join(words))

    terms: list[str] = [f"cat:{c}" for c in sorted(cats)]
    terms.extend(keyword_terms)

    if not terms:
        return []

    search_query = " OR ".join(terms[:12])

    log.info("[arxiv-feed] user=%s interests=%s query=%s", user_id, interests, search_query)

    try:
        result = query_arxiv(search_query, start=offset, max_results=limit)
        papers = result.get("papers", [])
        log.info("[arxiv-feed] returned %d papers", len(papers))
        return papers
    except Exception as exc:
        log.error("arXiv interest search failed: %s", exc)
        return []


@router.get("/feed")
def feed(
    user: dict = Depends(deps.get_current_user),
    limit: int = Query(6, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session_id: str | None = Query(None, description="Scope recommendations to likes in this session"),
):
    MIN_SIMILARITY = 0.75
    uid = user["user_id"]

    if session_id:
        _assert_session_owned(session_id, uid)

    # Check if user has likes in scope (determines DB vs arXiv path)
    likes_q = deps.db.table("likes").select("id", count="exact").eq("user_id", uid)
    if session_id:
        likes_q = likes_q.eq("session_id", session_id)
    likes_check = likes_q.limit(1).execute()
    has_likes = bool(likes_check.data)

    if has_likes:
        rpc_args: dict = {
            "p_user_id": uid,
            "p_limit": limit,
            "p_offset": offset,
            "p_session_id": session_id,
        }
        result = deps.db.rpc("recommend_papers", rpc_args).execute()
        db_papers = result.data or []

        if db_papers:
            best_sim = max((r.get("similarity") or 0) for r in db_papers)
            log.info("[feed] user=%s DB best_sim=%.4f threshold=%.2f", uid, best_sim, MIN_SIMILARITY)
            if best_sim >= MIN_SIMILARITY:
                return db_papers
            log.info("[feed] DB similarity too low, falling back to arXiv")

    # New user (no likes) OR DB similarity below threshold → arXiv by interests
    arxiv_papers = _arxiv_feed_for_interests(uid, limit, offset)
    log.info("[feed] user=%s arxiv_papers=%d", uid, len(arxiv_papers))
    if arxiv_papers:
        return arxiv_papers

    log.info("[feed] arXiv returned nothing, returning DB fallback")
    if has_likes:
        return db_papers  # type: ignore[possibly-undefined]
    return []


@router.post("/like")
def like_paper(body: LikeRequest, user: dict = Depends(deps.get_current_user)):
    if body.session_id:
        _assert_session_owned(body.session_id, user["user_id"])

    existing = deps.db.table("papers").select("id").eq("id", body.paper_id).execute()
    if not existing.data and body.title:
        from backend.routers.paper import _compute_embedding

        embedding = _compute_embedding(body.title, body.summary)
        deps.db.table("papers").upsert(
            {
                "id": body.paper_id,
                "title": body.title,
                "summary": body.summary or "",
                "authors": body.authors,
                "categories": body.categories,
                "links": body.links,
                "published": body.published,
                "embedding": "[" + ",".join(str(x) for x in embedding) + "]",
            }
        ).execute()
        log.info("[like] inserted missing paper %s", body.paper_id)

    like_row = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "paper_id": body.paper_id,
        "session_id": body.session_id,
    }
    result = (
        deps.db.table("likes")
        .upsert(
            like_row,
            on_conflict="user_id,paper_id",
        )
        .execute()
    )
    if not result.data:
        raise HTTPException(500, "Failed to save like")
    return {
        "liked": True,
        "paper_id": body.paper_id,
        "likes": paper_like_total(body.paper_id),
    }


@router.delete("/dislike")
def dislike_paper(body: LikeRequest, user: dict = Depends(deps.get_current_user)):
    deps.db.table("likes").delete().eq("user_id", user["user_id"]).eq(
        "paper_id", body.paper_id
    ).execute()
    return {
        "liked": False,
        "paper_id": body.paper_id,
        "likes": paper_like_total(body.paper_id),
    }
