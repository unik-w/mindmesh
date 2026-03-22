import os
import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel

from backend import deps

GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]

router = APIRouter(prefix="/auth", tags=["Auth"])


class GoogleLoginRequest(BaseModel):
    token: str


@router.post("/login")
def login(body: GoogleLoginRequest):
    try:
        info = id_token.verify_oauth2_token(
            body.token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception as e:
        raise HTTPException(401, f"Invalid Google token: {e}")

    result = deps.db.table("users").select("*").eq("google_id", info["sub"]).execute()

    if result.data:
        user = result.data[0]
    else:
        user = (
            deps.db.table("users")
            .insert({
                "id": str(uuid.uuid4()),
                "google_id": info["sub"],
                "email": info["email"],
                "name": info.get("name", ""),
                "profile_picture": info.get("picture"),
            })
            .execute()
            .data[0]
        )

    token = jwt.encode(
        {"user_id": user["id"], "email": user["email"]},
        deps.JWT_SECRET,
        algorithm="HS256",
    )
    return {"token": token, "user": user}


@router.get("/me")
def me(user: dict = Depends(deps.get_current_user)):
    result = deps.db.table("users").select("*").eq("id", user["user_id"]).execute()
    if not result.data:
        raise HTTPException(404, "User not found")
    return result.data[0]
