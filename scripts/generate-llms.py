#!/usr/bin/env python3
"""Generate llms.txt (page index) and llms-full.txt (full corpus) from docs/.

Outputs both to ../static/ so they're served at /llms.txt and /llms-full.txt.
Run from the repo root:

    python3 scripts/generate-llms.py
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SITE_URL = "https://zilkworm.erigon.tech"
ROUTE_BASE = "/documentation"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Extract a minimal YAML frontmatter dict and return (frontmatter, body)."""
    m = re.match(r"^---\n([\s\S]*?)\n---\n?", text)
    if not m:
        return {}, text
    fm: dict[str, str] = {}
    for line in m.group(1).splitlines():
        line_m = re.match(r'^([A-Za-z_][\w-]*):\s*"?([^"]*)"?\s*$', line)
        if line_m:
            fm[line_m.group(1)] = line_m.group(2).strip()
    return fm, text[m.end() :]


def strip_mdx(body: str) -> str:
    """Remove MDX-specific syntax so the output is plain readable markdown."""
    body = re.sub(r"^import\s+.*?$\n?", "", body, flags=re.MULTILINE)
    body = re.sub(r"\{/\*[\s\S]*?\*/\}", "", body)
    body = re.sub(r"<[A-Za-z][\w]*\s+[\s\S]*?/>", "", body)
    body = re.sub(r"<[A-Za-z][\w]*[\s\S]*?</[A-Za-z][\w]*>", "", body)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip()


def load_category_label(folder: Path) -> str | None:
    cat = folder / "_category_.json"
    if cat.exists():
        try:
            return json.loads(cat.read_text()).get("label")
        except json.JSONDecodeError:
            return None
    return None


def url_for(md_path: Path) -> str:
    rel = md_path.relative_to(DOCS_DIR).with_suffix("")
    parts = list(rel.parts)
    if parts == ["index"]:
        return f"{SITE_URL}{ROUTE_BASE}"
    return f"{SITE_URL}{ROUTE_BASE}/" + "/".join(parts)


def collect_pages() -> list[dict[str, str]]:
    pages: list[dict[str, str]] = []
    for md in sorted(DOCS_DIR.rglob("*.md")):
        text = md.read_text()
        fm, body = parse_frontmatter(text)
        title = fm.get("title", md.stem.replace("-", " ").title())
        desc = fm.get("description", "")
        section_label = (
            load_category_label(md.parent) if md.parent != DOCS_DIR else None
        )
        pages.append(
            {
                "title": title,
                "description": desc,
                "section": section_label or "",
                "url": url_for(md),
                "body": strip_mdx(body),
            }
        )
    return pages


def write_index(pages: list[dict[str, str]]) -> str:
    lines = ["# Zilkworm Documentation", ""]
    lines.append(
        "> A native, lightweight, performant ZKEVM core written in C++. "
        "Generates ZK proofs that an Ethereum block was executed correctly "
        "without re-executing the block itself."
    )
    lines.append("")
    by_section: dict[str, list[dict[str, str]]] = {}
    for p in pages:
        by_section.setdefault(p["section"] or "Home", []).append(p)
    for section, items in by_section.items():
        lines.append(f"## {section}")
        lines.append("")
        for p in items:
            label = p["title"]
            url = p["url"]
            desc = f" — {p['description']}" if p["description"] else ""
            lines.append(f"- [{label}]({url}){desc}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def write_full(pages: list[dict[str, str]]) -> str:
    chunks = ["# Zilkworm Documentation — Full Corpus", ""]
    for p in pages:
        chunks.append(f"---\n# {p['title']}\n")
        chunks.append(f"Source: {p['url']}\n")
        if p["description"]:
            chunks.append(f"_{p['description']}_\n")
        chunks.append(p["body"])
        chunks.append("")
    return "\n".join(chunks).rstrip() + "\n"


def build() -> tuple[str, str, int]:
    """Regenerate both artifacts in memory and return (llms.txt, llms-full.txt, n_pages)."""
    pages = collect_pages()
    return write_index(pages), write_full(pages), len(pages)


def _outputs(llms_txt: str, llms_full_txt: str) -> list[tuple[Path, str]]:
    return [
        (STATIC_DIR / "llms.txt", llms_txt),
        (STATIC_DIR / "llms-full.txt", llms_full_txt),
    ]


def write_outputs(llms_txt: str, llms_full_txt: str) -> None:
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    for path, content in _outputs(llms_txt, llms_full_txt):
        path.write_text(content)


def check_outputs(llms_txt: str, llms_full_txt: str) -> list[Path]:
    """Return the list of output files whose committed content has drifted."""
    stale: list[Path] = []
    for path, expected in _outputs(llms_txt, llms_full_txt):
        try:
            actual = path.read_text()
        except FileNotFoundError:
            actual = ""
        if actual != expected:
            stale.append(path)
    return stale


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate llms.txt artifacts.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if regenerated content differs from committed files. "
             "For CI use; does not write any files.",
    )
    args = parser.parse_args()

    llms_txt, llms_full_txt, n_pages = build()

    if args.check:
        stale = check_outputs(llms_txt, llms_full_txt)
        if stale:
            print("ERROR: regenerated content differs from committed files:", file=sys.stderr)
            for path in stale:
                print(f"  {path}", file=sys.stderr)
            print("Run: python3 scripts/generate-llms.py", file=sys.stderr)
            sys.exit(1)
        print(f"OK: llms files match regenerated content ({n_pages} pages)")
        return

    write_outputs(llms_txt, llms_full_txt)
    print(f"Wrote {STATIC_DIR / 'llms.txt'}  ({n_pages} pages)")
    print(f"Wrote {STATIC_DIR / 'llms-full.txt'}")


if __name__ == "__main__":
    main()
