#!/usr/bin/env python3
"""Fetch arXiv search results and save JSON. Requires: pip install requests

API docs: https://info.arxiv.org/help/api/basics.html
Paging: https://info.arxiv.org/help/api/user-manual.html (start / max_results)

There is no continuation token: use the numeric offset `start` (0-based). Each
response includes OpenSearch `totalResults` and `startIndex`; the next page is
`start = previous_start + len(papers)` (or use `--all`).

arXiv enforces its own limits on `max_results` per call (see API user manual).
Very large responses may need a long HTTP timeout.
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

import requests

A = "{http://www.w3.org/2005/Atom}"
X = "{http://arxiv.org/schemas/atom}"
OS = "{http://a9.com/-/spec/opensearch/1.1/}"


def _txt(el: ET.Element | None) -> str:
    return (el.text or "").strip() if el is not None else ""


def _entry(e: ET.Element) -> dict[str, Any]:
    authors = [_txt(a.find(f"{A}name")) for a in e.findall(f"{A}author")]
    cats = [c.get("term", "") for c in e.findall(f"{X}primary_category")]
    for c in e.findall(f"{A}category"):
        t = c.get("term", "")
        if t and t not in cats:
            cats.append(t)
    links = {ln.get("title", ln.get("type", "link")): ln.get("href", "") for ln in e.findall(f"{A}link")}
    return {
        "id": _txt(e.find(f"{A}id")),
        "title": " ".join(_txt(e.find(f"{A}title")).split()),
        "summary": " ".join(_txt(e.find(f"{A}summary")).split()),
        "authors": authors,
        "published": _txt(e.find(f"{A}published")),
        "categories": cats,
        "links": links,
    }


def _parse_feed(xml: str) -> dict[str, Any]:
    root = ET.fromstring(xml)
    return {
        "total_results": int(_txt(root.find(f"{OS}totalResults")) or 0),
        "start_index": int(_txt(root.find(f"{OS}startIndex")) or 0),
        "items_per_page": int(_txt(root.find(f"{OS}itemsPerPage")) or 0),
        "papers": [_entry(e) for e in root.findall(f"{A}entry")],
    }


def fetch(
    query: str,
    *,
    start: int = 0,
    max_results: int = 10,
    timeout: float = 120.0,
) -> dict[str, Any]:
    r = requests.get(
        "https://export.arxiv.org/api/query",
        params={
            "search_query": query,
            "start": start,
            "max_results": max_results,
        },
        headers={"User-Agent": "fetch_arxiv.py/1"},
        timeout=timeout,
    )
    r.raise_for_status()
    return _parse_feed(r.text)


def fetch_all(
    query: str,
    *,
    page_size: int,
    delay_sec: float,
    timeout: float = 120.0,
) -> dict[str, Any]:
    papers: list[dict[str, Any]] = []
    start = 0
    total_results: int | None = None
    while True:
        page = fetch(query, start=start, max_results=page_size, timeout=timeout)
        if total_results is None:
            total_results = page["total_results"]
        batch = page["papers"]
        if not batch:
            break
        papers.extend(batch)
        start += len(batch)
        if start >= (total_results or 0):
            break
        if delay_sec > 0:
            time.sleep(delay_sec)
    return {
        "total_results": total_results or 0,
        "papers": papers,
        "fetched_count": len(papers),
    }


def main() -> None:
    p = argparse.ArgumentParser(description="Fetch arXiv papers to JSON")
    p.add_argument("-q", "--query", required=True, help='e.g. all:electron')
    p.add_argument("-o", "--output", type=Path, default=Path("papers.json"))
    p.add_argument("-n", "--max-results", type=int, default=10, help="max_results for one API call (arXiv may cap)")
    p.add_argument(
        "--start",
        type=int,
        default=0,
        help="offset for next page (no token API — use this to resume)",
    )
    p.add_argument(
        "--all",
        action="store_true",
        help="fetch every page until total_results (uses --page-size and --delay)",
    )
    p.add_argument(
        "--page-size",
        type=int,
        default=100,
        help="batch size when using --all (default 100)",
    )
    p.add_argument(
        "--delay",
        type=float,
        default=3.0,
        help="seconds between requests when using --all (be kind to arXiv)",
    )
    args = p.parse_args()

    if args.max_results < 1:
        sys.exit("max-results must be >= 1")
    if args.page_size < 1:
        sys.exit("page-size must be >= 1")
    if args.start < 0:
        sys.exit("--start must be >= 0")

    # Large Atom payloads can take minutes (arXiv documents multi-minute responses).
    n_req = args.page_size if args.all else args.max_results
    req_timeout = max(120.0, min(900.0, 30.0 + n_req * 0.025))

    t0 = time.perf_counter()
    try:
        if args.all:
            data = fetch_all(
                args.query,
                page_size=args.page_size,
                delay_sec=args.delay,
                timeout=req_timeout,
            )
        else:
            data = fetch(
                args.query,
                start=args.start,
                max_results=args.max_results,
                timeout=req_timeout,
            )
    except requests.RequestException as exc:
        sys.exit(f"request failed: {exc}")

    args.output.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    elapsed = time.perf_counter() - t0
    n = len(data.get("papers", []))
    print(f"Collected papers: {n}")
    print(f"Saved to {args.output}")
    print(f"Elapsed: {elapsed:.2f}s")
    if not args.all and data.get("total_results", 0) > n:
        nxt = args.start + n
        print(f"more available: total_results={data['total_results']}; next --start {nxt}")


if __name__ == "__main__":
    main()
