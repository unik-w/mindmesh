"""
Quick smoke-test — run this to verify the recommender works with the JSON data.

Usage:
    python demo.py
    python demo.py --data ../path/to/arxiv_AI_5000.json
"""

import argparse
from pathlib import Path

import numpy as np

from services.paper_store import PaperStore
from services.recommender import build_user_vector, recommend, recommend_for_user, diversify


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data",
        default=str(Path(__file__).resolve().parent / "data" / "arxiv_AI_5000.json"),
        help="Path to the papers JSON file",
    )
    args = parser.parse_args()

    # 1. Load
    store = PaperStore()
    store.load_from_json(args.data)
    print(f"Loaded {store.total()} papers  —  embedding matrix {store.embedding_matrix.shape}")

    # 2. Pick 3 sample papers as "liked"
    liked = [store.metadata[i]["id"] for i in [0, 42, 100]]
    print("\nLiked papers:")
    for pid in liked:
        print(f"  • {store.get_paper(pid)['title']}")

    # 3. Build user vector
    user_vec = build_user_vector(liked, store)
    print(f"\nUser vector norm: {np.linalg.norm(user_vec):.4f}")

    # 4. Get recommendations
    recs = recommend_for_user(liked, store, k=10)
    print("\nTop-10 recommendations:")
    for i, r in enumerate(recs, 1):
        print(f"  {i:>2}. [{r['score']:.4f}] {r['title']}")

    # 5. Diversified re-ranking
    diverse = diversify(recs, store, lam=0.7, k=10)
    print("\nAfter MMR diversification (λ=0.7):")
    for i, r in enumerate(diverse, 1):
        print(f"  {i:>2}. [{r['score']:.4f}] {r['title']}")


if __name__ == "__main__":
    main()
