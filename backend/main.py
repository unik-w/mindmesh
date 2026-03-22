import logging
import os
from contextlib import asynccontextmanager

import torch

logging.basicConfig(level=logging.INFO)
from adapters import AutoAdapterModel
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from transformers import AutoTokenizer

from backend import deps
from backend.routers import auth, user, paper, arxiv
from backend import llm

load_dotenv()

SPECTER_BASE = "allenai/specter_plus_plus"
SPECTER_ADAPTER = "allenai/specter2"


def _pick_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    deps.db = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

    deps.embed_device = _pick_device()
    deps.tokenizer = AutoTokenizer.from_pretrained(SPECTER_BASE)
    deps.embed_model = AutoAdapterModel.from_pretrained(SPECTER_BASE)
    deps.embed_model.load_adapter(SPECTER_ADAPTER, source="hf", set_active=True)
    deps.embed_model.to(deps.embed_device)
    deps.embed_model.eval()

    yield


app = FastAPI(title="MindMesh", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(user.router)
app.include_router(paper.router)
app.include_router(arxiv.router)
app.include_router(llm.router)
