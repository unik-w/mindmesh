"""
Read papers JSON (ArXiv-style envelope + papers[].title/summary), embed with SPECTER++,
write the same structure with an ``embedding`` field on each paper.
"""

import argparse
import json
import logging

import torch
from adapters import AutoAdapterModel
from tqdm import tqdm
from transformers import AutoTokenizer

logging.getLogger("adapters").setLevel(logging.ERROR)

BASE = "allenai/specter_plus_plus"
ADAPTER = "allenai/specter2"


def pick_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def paper_line(tokenizer, paper: dict) -> str:
    title = (paper.get("title") or "").strip()
    abstract = (paper.get("abstract") or paper.get("summary") or "").strip()
    return title + tokenizer.sep_token + abstract


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("input_json", help="e.g. papers_2026.json")
    p.add_argument("output_json")
    p.add_argument("--batch-size", type=int, default=8)
    p.add_argument("--limit", type=int, default=None, help="only first N papers (debug)")
    args = p.parse_args()

    with open(args.input_json, encoding="utf-8") as f:
        data = json.load(f)

    papers = data["papers"]
    if args.limit is not None:
        papers = papers[: args.limit]

    device = pick_device()
    tokenizer = AutoTokenizer.from_pretrained(BASE)
    model = AutoAdapterModel.from_pretrained(BASE)
    model.load_adapter(ADAPTER, source="hf", set_active=True)
    model.to(device)
    model.eval()

    out_papers = []
    bs = args.batch_size
    for i in tqdm(range(0, len(papers), bs), desc="embedding"):
        batch = papers[i : i + bs]
        texts = [paper_line(tokenizer, x) for x in batch]
        inputs = tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=512,
            return_tensors="pt",
            return_token_type_ids=False,
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.inference_mode():
            model_out = model(**inputs)
        vecs = model_out.last_hidden_state[:, 0, :].float().cpu()
        for paper, row in zip(batch, vecs):
            item = dict(paper)
            item["embedding"] = row.tolist()
            out_papers.append(item)

    out = {k: v for k, v in data.items() if k != "papers"}
    out["papers"] = out_papers
    if args.limit is not None:
        out["total_results"] = len(out_papers)

    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(out, f)


if __name__ == "__main__":
    main()
