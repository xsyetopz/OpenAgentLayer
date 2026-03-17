#!/usr/bin/env python3

import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _lib import (
    PLACEHOLDER_HARD,
    PLACEHOLDER_SOFT,
    is_test_file,
    is_meta_file,
    read_stdin,
    block,
    warn,
    passthrough,
)

def run_git_diff(*args) -> set[str]:
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", *args],
            capture_output=True, text=True, timeout=10,
        )
        return set(result.stdout.strip().splitlines()) if result.stdout.strip() else set()
    except Exception:
        return set()

def modified_files() -> list[str]:
    files = run_git_diff("HEAD") | run_git_diff("--cached")
    return [f for f in files if f]

def read_file_lines(filepath: str) -> list[str]:
    try:
        with open(filepath, encoding="utf-8", errors="ignore") as f:
            return f.readlines()
    except Exception:
        return []

def match_placeholders(filepath: str, lines: list[str]) -> tuple[list[str], list[str]]:
    hard, soft = [], []
    for line_num, line in enumerate(lines, 1):
        if any(pat.search(line) for pat in PLACEHOLDER_HARD):
            hard.append(f"  {filepath}:{line_num}: {line.strip()[:80]}")
        elif any(pat.search(line) for pat in PLACEHOLDER_SOFT):
            soft.append(f"  {filepath}:{line_num}: {line.strip()[:80]}")
    return hard, soft

def scan_files(files: list[str]) -> tuple[list[str], list[str]]:
    all_hard, all_soft = [], []
    for filepath in files:
        if not os.path.isfile(filepath) or is_test_file(filepath) or is_meta_file(filepath):
            continue
        lines = read_file_lines(filepath)
        hard, soft = match_placeholders(filepath, lines)
        all_hard.extend(hard)
        all_soft.extend(soft)
    return all_hard, all_soft

def main() -> None:
    data = read_stdin()
    if not data or data.get("stop_hook_active"):
        passthrough()

    files = modified_files()
    if not files:
        passthrough()

    all_hard, all_soft = scan_files(files)

    if all_hard:
        output = (
            f"Completion check: {len(all_hard)} placeholder(s), "
            f"{len(all_soft)} hedge(s) in modified files:\n"
            + "\n".join((all_hard + all_soft)[:15])
        )
        block(output + "\n\nFix all placeholder code before finishing.")
    elif all_soft:
        output = (
            f"Completion check: {len(all_soft)} hedge(s) in modified files:\n"
            + "\n".join(all_soft[:15])
        )
        warn(output, event="SubagentStop")
    else:
        passthrough()

if __name__ == "__main__":
    main()
