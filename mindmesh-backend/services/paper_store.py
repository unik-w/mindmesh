"""
Paper data loader.

Loads papers + precomputed embeddings from a JSON file (test mode).
In production, swap load_from_json() for a DB / S3 fetch.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)


class PaperStore:
    """In-memory store for paper metadata and their embedding matrix."""

    def __init__(self) -> None:
        self.metadata: list[dict] = []
        self.embedding_matrix: np.ndarray | None = None
        self._id_to_idx: dict[str, int] = {}

    def load_from_json(self, path: str | Path) -> None:
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Paper data not found at {path}")

        with open(path) as f:
            data = json.load(f)

        raw = data.get("papers", data) if isinstance(data, dict) else data
        self._ingest(raw)
        logger.info(
            "Loaded %d papers – embedding matrix %s",
            len(self.metadata),
            self.embedding_matrix.shape,
        )

    def _ingest(self, raw_papers: list[dict]) -> None:
        embeddings: list[list[float]] = []
        metadata: list[dict] = []

        for p in raw_papers:
            emb = p.get("embedding")
            if not emb:
                continue
            embeddings.append(emb)
            metadata.append({
                "id": p.get("id", p.get("paperId", "")),
                "title": p.get("title", ""),
                "summary": p.get("summary", p.get("abstract", "")),
                "authors": p.get("authors", []),
                "published": p.get("published", ""),
                "categories": p.get("categories", []),
            })

        self.metadata = metadata
        self.embedding_matrix = np.array(embeddings, dtype=np.float32)
        self._id_to_idx = {m["id"]: i for i, m in enumerate(metadata)}

    # -- lookups --------------------------------------------------------
    def get_index(self, paper_id: str) -> int | None:
        return self._id_to_idx.get(paper_id)

    def get_paper(self, paper_id: str) -> dict | None:
        idx = self.get_index(paper_id)
        return self.metadata[idx] if idx is not None else None

    def get_embeddings(self, paper_ids: list[str]) -> np.ndarray | None:
        indices = [self._id_to_idx[pid] for pid in paper_ids if pid in self._id_to_idx]
        if not indices:
            return None
        return self.embedding_matrix[indices]

    def total(self) -> int:
        return len(self.metadata)
