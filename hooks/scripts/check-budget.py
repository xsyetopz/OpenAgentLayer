#!/usr/bin/env python3

import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
from _lib import read_stdin

TARGETS: list[tuple[str, int]] = [
    ("CLAUDE.md", 150),
    (".claude/CLAUDE.md", 150),
    ("MEMORY.md", 200),
    (".claude/memory/MEMORY.md", 200),
]

def file_line_count_exceeds_limit(base_dir: str, rel_path: str, limit: int) -> str | None:
    full_path = Path(base_dir) / rel_path
    if full_path.exists():
        lines = full_path.read_text(encoding="utf-8", errors="replace").count("\n")
        if lines > limit:
            return (
                f"[budget] {rel_path}: {lines} lines (target {limit}). "
                "Compact this file to reduce per-turn token cost."
            )
    return None

def collect_line_budget_warnings(base_dir: str) -> list[str]:
    warnings = [
        msg for rel_path, limit in TARGETS
        if (msg := file_line_count_exceeds_limit(base_dir, rel_path, limit))
    ]
    return warnings

def main() -> None:
    data = read_stdin()
    if not data:
        sys.exit(0)
    project_dir = data.get("cwd", os.getcwd())
    warnings = collect_line_budget_warnings(project_dir)
    if warnings:
        print("\n".join(warnings))
    sys.exit(0)

if __name__ == "__main__":
    main()
