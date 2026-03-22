import asyncio
import logging
import os
import re
import textwrap
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from backend import deps

log = logging.getLogger(__name__)

router = APIRouter(prefix="/llm", tags=["LLM"])

# OpenAI-compatible HTTP API (Featherless, OpenAI, Azure OpenAI path-style, etc.)
_DEFAULT_LLM_BASE_URL = "https://api.featherless.ai/v1"
_DEFAULT_LLM_MODEL = "meta-llama/Meta-Llama-3.1-8B-Instruct"

MAX_LLM_CONCURRENCY = 3
PDF_MAX_CHARS = 15_000


def _llm_api_key() -> str | None:
    for name in ("LLM_API_KEY", "FEATHERLESS_API_KEY", "OPENAI_API_KEY"):
        v = (os.getenv(name) or "").strip()
        if v:
            return v
    return None


def _llm_base_url() -> str:
    u = (os.getenv("LLM_BASE_URL") or os.getenv("FEATHERLESS_BASE_URL") or "").strip()
    if u:
        return u.rstrip("/")
    return _DEFAULT_LLM_BASE_URL.rstrip("/")


def _llm_model() -> str:
    m = (os.getenv("LLM_MODEL") or os.getenv("FEATHERLESS_MODEL") or "").strip()
    return m or _DEFAULT_LLM_MODEL


def _get_llm_client() -> AsyncOpenAI:
    api_key = _llm_api_key()
    if not api_key:
        raise HTTPException(
            500,
            "Missing LLM API key: set LLM_API_KEY, FEATHERLESS_API_KEY, or OPENAI_API_KEY",
        )
    return AsyncOpenAI(api_key=api_key, base_url=_llm_base_url())


# ---------------------------------------------------------------------------
# 1. Feed summary  –  batch-summarize papers from recommend_papers()
# ---------------------------------------------------------------------------
# The recommend_papers RPC returns rows shaped like:
#   { id, title, summary, authors, categories, links, published, similarity }
# This endpoint accepts that list directly and produces a short LLM summary
# for each paper using its title + abstract.
# ---------------------------------------------------------------------------


class FeedPaper(BaseModel):
    """Matches the row shape returned by public.recommend_papers()."""

    id: str
    title: str
    summary: Optional[str] = None
    authors: Optional[list] = []
    categories: Optional[list] = []
    links: Optional[dict | list] = None
    published: Optional[str] = None
    similarity: Optional[float] = None


class FeedSummaryRequest(BaseModel):
    papers: list[FeedPaper] = Field(..., min_length=1, max_length=6)


class PaperSummaryItem(BaseModel):
    paper_id: str
    title: str
    summary: str
    error: Optional[str] = None


class FeedSummaryResponse(BaseModel):
    total: int
    summaries: list[PaperSummaryItem]


async def _summarize_one_paper(
    client: AsyncOpenAI, paper: FeedPaper
) -> PaperSummaryItem:
    if not paper.summary:
        return PaperSummaryItem(
            paper_id=paper.id,
            title=paper.title,
            summary="",
            error="No abstract available for this paper",
        )

    prompt = textwrap.dedent(f"""\
        Summarize the following research paper in 2-3 concise sentences.
        Focus on what the paper does, the approach taken, and the key finding.
        Be clear and accessible to a broad scientific audience.
        Do not repeat the title verbatim.

        Title: {paper.title}
        Abstract: {paper.summary}
    """)

    try:
        completion = await client.chat.completions.create(
            model=_llm_model(),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a concise scientific summarizer. "
                        "Output only the summary text, no labels or prefixes."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_completion_tokens=200,
        )
        text = (completion.choices[0].message.content or "").strip()
        return PaperSummaryItem(
            paper_id=paper.id, title=paper.title, summary=text
        )
    except Exception as exc:
        log.error("LLM error for paper %s: %s", paper.id, exc)
        return PaperSummaryItem(
            paper_id=paper.id,
            title=paper.title,
            summary="",
            error=str(exc),
        )


@router.post("/feed-summary", response_model=FeedSummaryResponse)
async def summarize_feed(
    body: FeedSummaryRequest,
    _user: dict = Depends(deps.get_current_user),
):
    """
    Accepts the list of papers returned by /user/feed (recommend_papers RPC)
    and generates a short LLM summary for each paper using title + abstract.
    Papers are processed concurrently with a bounded semaphore.
    """
    client = _get_llm_client()
    sem = asyncio.Semaphore(MAX_LLM_CONCURRENCY)

    async def _bounded(paper: FeedPaper) -> PaperSummaryItem:
        async with sem:
            return await _summarize_one_paper(client, paper)

    results = await asyncio.gather(*[_bounded(p) for p in body.papers])
    return FeedSummaryResponse(total=len(results), summaries=list(results))


# ---------------------------------------------------------------------------
# 2. PDF analysis  –  5-paragraph description + research directions
# ---------------------------------------------------------------------------


class PdfAnalysisRequest(BaseModel):
    pdf_url: str = Field(..., min_length=1)
    title: Optional[str] = None


class ResearchDirection(BaseModel):
    question: str
    explanation: str


class PdfAnalysisResponse(BaseModel):
    title: str
    description_paragraphs: list[str]
    research_directions: list[ResearchDirection]


async def _download_pdf_text(url: str) -> str:
    import fitz  # pymupdf

    async with httpx.AsyncClient(follow_redirects=True, timeout=60) as http:
        resp = await http.get(url)
        resp.raise_for_status()

    doc = fitz.open(stream=resp.content, filetype="pdf")
    pages: list[str] = []
    for page in doc:
        pages.append(page.get_text())
    doc.close()

    full = "\n".join(pages)
    if len(full) > PDF_MAX_CHARS:
        full = full[:PDF_MAX_CHARS] + "\n[...truncated...]"
    return full


def _parse_pdf_analysis(
    content: str,
) -> tuple[list[str], list[ResearchDirection]]:
    lines = [ln.strip() for ln in content.splitlines() if ln.strip()]

    paragraphs: dict[int, str] = {}
    directions: list[ResearchDirection] = []

    for line in lines:
        p_match = re.match(r"^P(\d):\s*(.+)$", line, re.IGNORECASE)
        r_match = re.match(r"^R(\d):\s*(.+)$", line, re.IGNORECASE)

        if p_match:
            paragraphs[int(p_match.group(1))] = p_match.group(2).strip()
        elif r_match:
            raw = r_match.group(2).strip()
            if "|" in raw:
                q, expl = raw.split("|", 1)
                directions.append(
                    ResearchDirection(
                        question=q.strip(), explanation=expl.strip()
                    )
                )
            else:
                directions.append(
                    ResearchDirection(question=raw, explanation="")
                )

    para_list = [paragraphs[i] for i in range(1, 6) if i in paragraphs]

    if not para_list:
        non_r = [
            ln
            for ln in lines
            if not re.match(r"^R\d:", ln, re.IGNORECASE)
        ]
        full = " ".join(non_r)
        sentences = re.split(r"(?<=[.!?])\s+", full)
        per = max(1, len(sentences) // 5)
        for i in range(5):
            start = i * per
            end = start + per if i < 4 else len(sentences)
            chunk = " ".join(sentences[start:end]).strip()
            if chunk:
                para_list.append(chunk)

    return para_list, directions[:5]


def _infer_title(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if 10 < len(stripped) < 200:
            return stripped
    return "Untitled Paper"


@router.post("/pdf-analysis", response_model=PdfAnalysisResponse)
async def analyze_pdf(
    body: PdfAnalysisRequest,
    _user: dict = Depends(deps.get_current_user),
):
    """
    Downloads a paper PDF, extracts its text, and generates:
      - A 5-paragraph description covering problem, prior work, methods,
        results, and conclusions.
      - 5 open-ended research questions / future directions the paper
        could lead to.
    """
    try:
        paper_text = await _download_pdf_text(body.pdf_url)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            502, f"Failed to download PDF: HTTP {exc.response.status_code}"
        )
    except Exception as exc:
        raise HTTPException(502, f"Failed to download or parse PDF: {exc}")

    if not paper_text.strip():
        raise HTTPException(422, "Could not extract any text from the PDF")

    client = _get_llm_client()

    prompt = textwrap.dedent(f"""\
        You are given the extracted text of a research paper.
        Analyze it and produce two parts.

        PART 1 — DESCRIPTION (5 paragraphs, 80-100 words each)
        P1: What is this paper about? What problem does it address and why does it matter?
        P2: What prior work exists and what gap does this paper fill?
        P3: What methodology or approach did the authors use?
        P4: What are the key results and findings?
        P5: What are the conclusions, limitations, and broader impact?

        PART 2 — RESEARCH DIRECTIONS (5 open-ended questions)
        For each, provide a thought-provoking question and a 1-2 sentence
        explanation of why it matters. These should be genuine directions
        future researchers could pursue.

        Output format — follow EXACTLY, one item per line:
        P1: [paragraph]
        P2: [paragraph]
        P3: [paragraph]
        P4: [paragraph]
        P5: [paragraph]
        R1: [question] | [explanation]
        R2: [question] | [explanation]
        R3: [question] | [explanation]
        R4: [question] | [explanation]
        R5: [question] | [explanation]

        Paper text:
        {paper_text}
    """)

    try:
        completion = await client.chat.completions.create(
            model=_llm_model(),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a meticulous research analyst. "
                        "Follow the output format exactly. "
                        "Do not add any text before P1: or after R5:."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_completion_tokens=2000,
        )
        raw = (completion.choices[0].message.content or "").strip()
    except Exception as exc:
        raise HTTPException(502, f"LLM call failed: {exc}")

    paragraphs, directions = _parse_pdf_analysis(raw)
    title = body.title or _infer_title(paper_text)

    return PdfAnalysisResponse(
        title=title,
        description_paragraphs=paragraphs,
        research_directions=directions,
    )
