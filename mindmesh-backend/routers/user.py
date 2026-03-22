import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from backend import deps

router = APIRouter(prefix="/user", tags=["User"])


class LikeRequest(BaseModel):
    paper_id: str


class UpdateInterestsRequest(BaseModel):
    interests: list[str]


@router.put("/update_interests")
def update_interests(body: UpdateInterestsRequest, user: dict = Depends(deps.get_current_user)):
    import json
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


@router.get("/feed")
def feed(
    user: dict = Depends(deps.get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    result = deps.db.rpc(
        "recommend_papers",
        {"p_user_id": user["user_id"], "p_limit": limit, "p_offset": offset},
    ).execute()
    return result.data


@router.post("/like")
def like_paper(body: LikeRequest, user: dict = Depends(deps.get_current_user)):
    try:
        result = (
            deps.db.table("likes")
            .insert({
                "id": str(uuid.uuid4()),
                "user_id": user["user_id"],
                "paper_id": body.paper_id,
            })
            .execute()
        )
    except Exception:
        raise HTTPException(409, "Already liked or paper not found")

    return result.data[0]


@router.delete("/dislike")
def dislike_paper(body: LikeRequest, user: dict = Depends(deps.get_current_user)):
    result = (
        deps.db.table("likes")
        .delete()
        .eq("user_id", user["user_id"])
        .eq("paper_id", body.paper_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(404, "Like not found")
    return {"message": "Like removed"}
