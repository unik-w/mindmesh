import asyncio
import dotenv

dotenv.load_dotenv()

import os
import re
import textwrap
import xml.etree.ElementTree as ET
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional, Dict, Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from openai import AsyncOpenAI
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Keep-alive background task
# ---------------------------------------------------------------------------

KEEPALIVE_INTERVAL = 240

async def _keepalive_loop():
    api_key = os.getenv("FEATHERLESS_API_KEY")
    if not api_key:
        return

    client = AsyncOpenAI(
        api_key=api_key,
        base_url=os.getenv("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1"),
    )
    model = os.getenv("FEATHERLESS_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct")

    while True:
        await asyncio.sleep(KEEPALIVE_INTERVAL)
        try:
            await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=1,
                temperature=0.0,
            )
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_keepalive_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Mindmash Summary API", version="2.0.0", lifespan=lifespan)

FEATHERLESS_BASE_URL = os.getenv("FEATHERLESS_BASE_URL", "https://api.featherless.ai/v1")
FEATHERLESS_MODEL    = os.getenv("FEATHERLESS_MODEL",    "meta-llama/Meta-Llama-3.1-8B-Instruct")


# ---------------------------------------------------------------------------
# Input model
# ---------------------------------------------------------------------------

class PaperLinks(BaseModel):
    pdf: Optional[str] = None
    text_html: Optional[str] = Field(None, alias="text/html")

    class Config:
        populate_by_name = True


class PaperInput(BaseModel):
    id: str
    title: str
    summary: str
    authors: List[str]
    categories: Optional[List[str]] = []
    links: Optional[PaperLinks] = None
    published: Optional[str] = None
    similarity: Optional[float] = None


class SummarizeFromPaperRequest(BaseModel):
    keyword: str = Field(..., min_length=1)
    papers: List[PaperInput] = Field(..., min_length=1, max_length=10)


# ---------------------------------------------------------------------------
# Output models
# ---------------------------------------------------------------------------

class FAQItem(BaseModel):
    question: str
    answer: str


class SummarizeResponse(BaseModel):
    keyword: str
    paper_id: str
    paper_title: str
    catchy_heading: str
    summary_paragraphs: List[str]   # P1 and P2 only — intro overview
    summary_full: str               # P1 through P5 — complete detailed text
    authors: List[str]
    categories: List[str]
    arxiv_url: str
    pdf_url: Optional[str]
    published: Optional[str]
    similarity: Optional[float]
    faqs: List[FAQItem]


class BatchSummarizeResponse(BaseModel):
    keyword: str
    total: int
    results: List[SummarizeResponse]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _clean_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _format_published_date(published_raw: Optional[str]) -> Optional[str]:
    if not published_raw:
        return None
    try:
        return datetime.fromisoformat(published_raw.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return published_raw


def _split_into_paragraphs(text: str, n: int = 5) -> list[str]:
    """Fallback: split a text block into n chunks by sentence boundaries."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    if len(sentences) <= n:
        return [text]
    per_chunk = max(1, len(sentences) // n)
    chunks = []
    for i in range(n):
        start = i * per_chunk
        end = start + per_chunk if i < n - 1 else len(sentences)
        chunk = " ".join(sentences[start:end]).strip()
        if chunk:
            chunks.append(chunk)
    return chunks


# ---------------------------------------------------------------------------
# LLM output parser
# ---------------------------------------------------------------------------

def _parse_llm_output(content: str) -> tuple[str, list[str], list[FAQItem]]:
    lines = [line.strip() for line in content.strip().splitlines() if line.strip()]

    heading    = ""
    paragraphs: dict[int, str] = {}
    questions:  dict[int, str] = {}
    answers:    dict[int, str] = {}

    for line in lines:
        low = line.lower()
        if low.startswith("heading:"):
            heading = line.split(":", 1)[1].strip()
        else:
            p_match = re.match(r"^p(\d):(.+)$", line, re.IGNORECASE)
            q_match = re.match(r"^q(\d):(.+)$", line, re.IGNORECASE)
            a_match = re.match(r"^a(\d):(.+)$", line, re.IGNORECASE)
            if p_match:
                paragraphs[int(p_match.group(1))] = p_match.group(2).strip()
            elif q_match:
                questions[int(q_match.group(1))]  = q_match.group(2).strip()
            elif a_match:
                answers[int(a_match.group(1))]    = a_match.group(2).strip()

    if not heading and lines:
        heading = lines[0]

    heading = _clean_whitespace(heading.strip('"').strip("<>").strip())

    # Collect ALL paragraphs P1 through P5
    if paragraphs:
        summary_parts = [
            _clean_whitespace(paragraphs[i])
            for i in range(1, 6) if paragraphs.get(i)
        ]
    else:
        # Fallback: model ignored labels — split into 5 chunks
        raw_lines = [
            _clean_whitespace(line) for line in lines
            if not line.lower().startswith("heading:")
            and not re.match(r"^[qa]\d:", line, re.IGNORECASE)
        ]
        summary_parts = _split_into_paragraphs(" ".join(raw_lines), n=5)

    # FAQ items with hard 30-word backstop
    faqs: list[FAQItem] = []
    for i in range(1, 5):
        q = _clean_whitespace(questions.get(i, ""))
        a = _clean_whitespace(answers.get(i, ""))
        if a:
            words = a.split()
            if len(words) > 30:
                a = " ".join(words[:28]) + "..."
        if q and a:
            faqs.append(FAQItem(question=q, answer=a))

    return heading, summary_parts, faqs


# ---------------------------------------------------------------------------
# LLM call
# ---------------------------------------------------------------------------

async def generate_catchy_summary(
    keyword: str, paper: PaperInput
) -> tuple[str, list[str], list[FAQItem]]:
    api_key = os.getenv("FEATHERLESS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Missing FEATHERLESS_API_KEY environment variable.")

    client = AsyncOpenAI(api_key=api_key, base_url=FEATHERLESS_BASE_URL)
    authors_str = ", ".join(paper.authors) if paper.authors else "Unknown"

    prompt = textwrap.dedent(f"""
        You are writing a summary card for a research paper discovery app (like Instagram for research).

        User keyword: "{keyword}"
        Paper title: "{paper.title}"
        Authors: {authors_str}
        Published: {paper.published or "Unknown"}
        Abstract:
        {paper.summary}

        Rules you must follow:
        1) Use ONLY facts from the abstract. Do not fabricate or add outside information.
        2) Keep the keyword central — it must feel like the core of both the heading and the summary.
        3) Tone: simple, punchy, and engaging. Write like a smart curious human, not an academic.
        4) Do not copy exact sentences from the abstract.
        5) Write the summary in exactly 5 paragraphs labeled P1 through P5:
           - P1 (60-80 words): High-level overview — what is this paper about and why does it matter?
           - P2 (60-80 words): Complete overview — what did the researchers do, what approach did they take?
           - P3 (60-80 words): Deeper detail — finding a deeper insight into the paper.
           - P4 (60-80 words): Deeper detail — finding a deeper insight into the paper.
           - P5 (60-80 words): Conclusions and implications related to the keyword.
           Total summary must be 300–350 words across all 5 paragraphs.
        6) Heading: a genuine human question that makes the reader feel they MUST read this.
           Accurate to the paper. Keyword must be the anchor. No angle brackets. Plain text only.
        7) Generate exactly 4 FAQ questions with teaser answers (strictly 20–30 words each).
           Answers must feel INCOMPLETE — cut off at the most interesting point, ending with "..."
           Do not exceed 30 words per answer.

        Output format — follow this EXACTLY. Each line must start with the exact label shown.
        Do NOT merge paragraphs. Do NOT skip any label. Do NOT add extra labels:
        Heading: How can X change Y?
        P1: [60-80 words: what this paper is about and why it matters]
        P2: [60-80 words: what the researchers did and what approach they took]
        P3: [60-80 words: deeper detail — insight into the paper]
        P4: [60-80 words: deeper detail — insight into the paper]
        P5: [60-80 words: conclusions and implications related to the keyword]
        Q1: Question one?
        A1: Teaser answer one...
        Q2: Question two?
        A2: Teaser answer two...
        Q3: Question three?
        A3: Teaser answer three...
        Q4: Question four?
        A4: Teaser answer four...
    """).strip()

    async def _call_llm(temperature: float) -> str | None:
        try:
            completion = await client.chat.completions.create(
                model=FEATHERLESS_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a careful scientific summarizer. "
                            "Follow the output format exactly. "
                            "Do not add any text before Heading: or after A4:."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                max_tokens=900,
            )
            return completion.choices[0].message.content if completion.choices else None
        except Exception:
            return None

    TARGET_MIN, TARGET_MAX = 300, 350
    best_heading  = ""
    best_parts:   list[str] = []
    best_faqs:    list[FAQItem] = []
    best_distance = float("inf")

    for temp in [0.5, 0.65, 0.7]:
        message = await _call_llm(temp)
        if not message:
            continue

        heading, parts, faqs = _parse_llm_output(message)
        if not heading or not parts:
            continue

        word_count = len(" ".join(parts).split())

        if TARGET_MIN <= word_count <= TARGET_MAX:
            return heading, parts, faqs

        distance = max(0, TARGET_MIN - word_count, word_count - TARGET_MAX)
        if distance < best_distance:
            best_distance = distance
            best_heading  = heading
            best_parts    = parts
            best_faqs     = faqs

    if best_heading and best_parts:
        return best_heading, best_parts, best_faqs

    raise HTTPException(
        status_code=502,
        detail="LLM returned no usable content after 3 attempts. Try a different keyword.",
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

async def _summarize_single(keyword: str, paper: PaperInput) -> SummarizeResponse:
    """Summarize one paper — used concurrently inside the batch route."""
    try:
        heading, parts, faqs = await generate_catchy_summary(keyword, paper)
    except HTTPException:
        # If one paper fails, return a graceful error entry instead of killing the whole batch
        return SummarizeResponse(
            keyword=keyword,
            paper_id=paper.id,
            paper_title=paper.title,
            catchy_heading="Could not generate summary for this paper.",
            summary_paragraphs=[],
            summary_full="",
            authors=paper.authors,
            categories=paper.categories or [],
            arxiv_url=paper.id,
            pdf_url=None,
            published=_format_published_date(paper.published),
            similarity=paper.similarity,
            faqs=[],
        )

    arxiv_url = ""
    pdf_url   = None
    if paper.links:
        arxiv_url = paper.links.text_html or ""
        pdf_url   = paper.links.pdf
    if not arxiv_url:
        arxiv_url = paper.id

    return SummarizeResponse(
        keyword=keyword,
        paper_id=paper.id,
        paper_title=paper.title,
        catchy_heading=heading,
        summary_paragraphs=parts[:2],       # P1 and P2 — intro overview
        summary_full="\n\n".join(parts),    # P1 through P5 — full detailed text
        authors=paper.authors,
        categories=paper.categories or [],
        arxiv_url=arxiv_url,
        pdf_url=pdf_url,
        published=_format_published_date(paper.published),
        similarity=paper.similarity,
        faqs=faqs,
    )


@app.post("/summarize", response_model=BatchSummarizeResponse)
async def summarize_from_papers(request: SummarizeFromPaperRequest) -> BatchSummarizeResponse:
    """
    Process up to 10 papers concurrently.
    Each paper gets its own: catchy_heading, summary_paragraphs (P1+P2),
    summary_full (P1-P5), faqs, and all original paper fields preserved.
    """
    # Run all papers concurrently — much faster than sequential
    results = await asyncio.gather(
        *[_summarize_single(request.keyword, paper) for paper in request.papers]
    )

    return BatchSummarizeResponse(
        keyword=request.keyword,
        total=len(results),
        results=list(results),
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model": FEATHERLESS_MODEL}