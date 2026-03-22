import os

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client

load_dotenv()

JWT_SECRET = os.environ["JWT_SECRET"]

db: Client | None = None
tokenizer = None
embed_model = None
embed_device = None

bearer_scheme = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except Exception as e:
        raise HTTPException(401, f"Invalid or expired token: {e}")
