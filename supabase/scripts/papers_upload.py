import argparse
import json
import os
from pathlib import Path
from typing import Any
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", type=Path, required=True, help="Path to JSON file")
    parser.add_argument("--table-name", default="papers", help="Supabase table name")
    parser.add_argument("--batch-size", type=int, default=100, help="Rows per insert")
    args = parser.parse_args()

    # Supabase credentials
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
 
    raw = json.loads(args.json.read_text(encoding="utf-8"))
    papers = raw.get("papers")
 
    rows: list[dict[str, Any]] = []
    for paper in papers:
        row: dict[str, Any] = {
            "id": paper.get("id"),
            "title": paper.get("title"),
            "summary": paper.get("summary"),
            "authors": paper.get("authors"),
            "categories": paper.get("categories"),
            "links": paper.get("links"),
            "published": paper.get("published"),
        }
        emb = paper.get("embedding")
        row["embedding"] = "[" + ",".join(str(float(x)) for x in emb) + "]"
        rows.append(row)

    client = create_client(url, key)
    tname = args.table_name
    bs = max(1, args.batch_size)
    for i in range(0, len(rows), bs):
        chunk = rows[i : i + bs]
        client.table(tname).upsert(chunk).execute()
        print(f"Inserted {min(i + bs, len(rows))}/{len(rows)}")

if __name__ == "__main__":
    main()
