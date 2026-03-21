"""
Recommendation engine for MindMesh.

All functions are plain Python/NumPy — importable from FastAPI routes,
batch scripts, notebooks, or anywhere else.

Core formula:
    user_vector  = normalize( mean( embeddings of liked papers ) )
    score(paper) = cosine_similarity( user_vector, paper_embedding )
"""

from __future__ import annotations

import numpy as np

from services.paper_store import PaperStore


# -------------------------------------------------------------------
# 1.  build_user_vector
# -------------------------------------------------------------------
def build_user_vector(liked_ids: list[str], store: PaperStore) -> np.ndarray:
    """
    Average the embeddings of *liked_ids* and L2-normalise the result.

    Raises ValueError when none of the IDs match any loaded paper.
    """
    emb = store.get_embeddings(liked_ids)
    if emb is None or len(emb) == 0:
        raise ValueError(
            "No matching embeddings for the given liked IDs. "
            f"Sample valid IDs: {[m['id'] for m in store.metadata[:3]]}"
        )
    vec = emb.mean(axis=0)
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec


# -------------------------------------------------------------------
# 2.  recommend  (user_vector → top-k papers)
# -------------------------------------------------------------------
def recommend(
    user_vector: np.ndarray,
    store: PaperStore,
    *,
    exclude_ids: set[str] | None = None,
    k: int = 10,
) -> list[dict]:
    """
    Cosine-similarity ranking against every paper in the store.

    Returns a list of metadata dicts, each with an added ``score`` key.
    Papers whose ID is in *exclude_ids* are skipped.
    """
    mat = store.embedding_matrix
    norms = np.linalg.norm(mat, axis=1, keepdims=True).clip(1e-10)
    scores = (mat / norms) @ user_vector

    exclude = exclude_ids or set()
    ranked = sorted(
        (
            (i, float(scores[i]))
            for i in range(len(store.metadata))
            if store.metadata[i]["id"] not in exclude
        ),
        key=lambda x: x[1],
        reverse=True,
    )

    results: list[dict] = []
    for idx, score in ranked[:k]:
        entry = dict(store.metadata[idx])
        entry["score"] = round(score, 6)
        results.append(entry)
    return results


# -------------------------------------------------------------------
# 3.  recommend_for_user  (liked IDs → top-k, one-liner convenience)
# -------------------------------------------------------------------
def recommend_for_user(
    liked_ids: list[str],
    store: PaperStore,
    k: int = 10,
) -> list[dict]:
    """End-to-end: liked paper IDs → top-k recommendations."""
    vec = build_user_vector(liked_ids, store)
    return recommend(vec, store, exclude_ids=set(liked_ids), k=k)


# -------------------------------------------------------------------
# 4.  diversify  (MMR re-ranking for variety in the feed)
# -------------------------------------------------------------------
def diversify(
    candidates: list[dict],
    store: PaperStore,
    lam: float = 0.7,
    k: int | None = None,
) -> list[dict]:
    """
    Re-rank *candidates* with Maximal Marginal Relevance.

    λ  = 1.0 → pure relevance (no diversity penalty).
    λ  = 0.0 → maximum diversity.
    Default 0.7 is a reasonable starting point.
    """
    if not candidates:
        return []
    k = k or len(candidates)

    ids = [c["id"] for c in candidates]
    emb = store.get_embeddings(ids)
    if emb is None:
        return candidates[:k]

    norms = np.linalg.norm(emb, axis=1, keepdims=True).clip(1e-10)
    normed = emb / norms

    selected: list[int] = []
    remaining = set(range(len(candidates)))

    for _ in range(min(k, len(candidates))):
        best_idx, best_mmr = -1, -np.inf
        for idx in remaining:
            relevance = candidates[idx].get("score", 0.0)
            if selected:
                redundancy = float((normed[idx] @ normed[selected].T).max())
            else:
                redundancy = 0.0
            mmr = lam * relevance - (1 - lam) * redundancy
            if mmr > best_mmr:
                best_mmr = mmr
                best_idx = idx
        if best_idx < 0:
            break
        selected.append(best_idx)
        remaining.discard(best_idx)

    return [candidates[i] for i in selected]
