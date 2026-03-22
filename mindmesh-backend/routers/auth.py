import os
import uuid

import jwt
import requests as stdlib_requests
from fastapi import APIRouter, Depends, HTTPException
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel

from backend import deps

GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]

router = APIRouter(prefix="/auth", tags=["Auth"])


class GoogleLoginRequest(BaseModel):
    token: str


def _resolve_google_identity(token: str) -> dict:
    """Accept either a Google ID token (JWT) or an access token (opaque)."""
    # Try ID token verification first
    try:
        return id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except Exception:
        pass

    # Fallback: treat as an access token and call Google userinfo
    try:
        resp = stdlib_requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("sub"):
                return data
    except Exception:
        pass

    raise HTTPException(401, "Invalid Google token: not a valid ID token or access token")


@router.post("/login")
def login(body: GoogleLoginRequest):
    info = _resolve_google_identity(body.token)

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
