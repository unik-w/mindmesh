import logging
import os
from contextlib import asynccontextmanager

# Lambda: default HF cache is under $HOME (read-only). Image stores models in /opt/hf.
if os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    _hf = "/opt/hf"
    os.environ["HF_HOME"] = _hf
    os.environ["TRANSFORMERS_CACHE"] = _hf
    os.environ["HF_HUB_CACHE"] = _hf

import torch

logging.basicConfig(level=logging.INFO)
from adapters import AutoAdapterModel
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from supabase import create_client
from transformers import BertTokenizer

from backend import deps
from backend.routers import auth, user, paper, arxiv, llm

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
    # BertTokenizer avoids AutoTokenizer→AutoConfig (rejects specter_plus_plus on newer transformers)
    deps.tokenizer = BertTokenizer.from_pretrained(SPECTER_BASE)
    deps.embed_model = AutoAdapterModel.from_pretrained(
        SPECTER_BASE, trust_remote_code=True
    )
    deps.embed_model.load_adapter(SPECTER_ADAPTER, source="hf", set_active=True)
    deps.embed_model.to(deps.embed_device)
    deps.embed_model.eval()

    yield


app = FastAPI(title="MindMesh", lifespan=lifespan)

# Lambda Function URL CORS is configured in deploy.sh. Adding CORSMiddleware here too
# produces duplicate Access-Control-Allow-Origin headers (browser: "cannot contain more than one origin").
if not os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
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

handler = Mangum(app)
