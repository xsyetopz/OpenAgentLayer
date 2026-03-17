#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from _lib import (
    MERGE_CONFLICT,
    PLACEHOLDER_HARD,
    SECRET_PATTERNS,
    deny,
    is_test_file,
    passthrough,
    read_stdin,
)

LARGE_OUTPUT_RULES: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(r"\bcat\b.*\.(log|lock|jsonl|csv|sql|txt)\b", re.IGNORECASE),
        "Use `tail -n 200` or `grep` instead of catting large files into context.",
    ),
    (
        re.compile(r"\bgit\s+diff\b(?!.*--stat)(?!.*--name)(?!.*HEAD\s+HEAD)"),
        "Use `git diff --stat` or `git diff --name-only` first.",
    ),
    (
        re.compile(r"\bgrep\b\s+-[a-zA-Z]*[rR][a-zA-Z]*\s+[\"']?[^\"'\s]+[\"']?\s+\.$"),
        "Unbounded `grep -r ... .` dumps everything. Add --include or pipe to head.",
    ),
    (
        re.compile(r"\bfind\b\s+\.(?:\s+\S+)*\s*$(?!.*-maxdepth)(?!.*\|\s*head)(?!.*\|\s*wc)", re.MULTILINE),
        "Unbounded `find .` returns thousands of lines. Add -maxdepth or pipe to head.",
    ),
]

DNS_EXFIL = re.compile(r"\b(ping|nslookup|dig|traceroute|host|drill)\b")
BLANKET_STAGE = re.compile(r"\bgit\s+add\s+(?:\.\s*$|-A\b)", re.MULTILINE)
BROAD_RM = re.compile(
    r'\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(?:/\s|~/|"\$HOME"|\.\.?\s|/\*)',
)

def get_staged_files() -> list[str]:
    try:
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True, text=True, timeout=10
        )
        return [f for f in result.stdout.strip().split("\n") if f]
    except Exception:
        return []

def file_issues(filepath: str) -> list[str]:
    issues: list[str] = []
    if not os.path.isfile(filepath):
        return issues
    basename = os.path.basename(filepath)
    if basename == ".env" or basename.startswith(".env."):
        issues.append(f".env file staged: {filepath}")
        return issues
    try:
        with open(filepath, encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except Exception:
        return issues
    if MERGE_CONFLICT.search(content):
        issues.append(f"Merge conflict markers in {filepath}")
    if not is_test_file(filepath) and any(pat.search(content) for pat in PLACEHOLDER_HARD[:4]):
        issues.append(f"Placeholder in {filepath}")
    if any(pat.search(content) for pat in SECRET_PATTERNS):
        issues.append(f"Possible secret/credential in {filepath}")
    return issues

def check_large_output(cmd: str) -> str | None:
    for pattern, message in LARGE_OUTPUT_RULES:
        if pattern.search(cmd):
            return message
    return None

def forbidden_git_add(cmd: str) -> bool:
    return BLANKET_STAGE.search(cmd) is not None

def forbidden_rm(cmd: str) -> bool:
    return BROAD_RM.search(cmd) is not None

def precommit_check(cmd: str) -> list[str]:
    if "git commit" not in cmd:
        return []
    staged = get_staged_files()
    blockers: list[str] = []
    for filepath in staged:
        blockers.extend(file_issues(filepath))
    return blockers

def main() -> None:
    data = read_stdin()
    if not data or data.get("tool_name") != "Bash":
        passthrough()
    command = data.get("tool_input", {}).get("command", "") or ""
    cmd = command.strip()

    msg = check_large_output(cmd)
    if msg:
        deny(f"[guard] {msg}")
    if forbidden_git_add(cmd):
        deny("Use `git add <specific files>` - review what you're staging.")
    if forbidden_rm(cmd):
        deny("Blocked: rm -rf on broad path. Be more specific.")
    blockers = precommit_check(cmd)
    if blockers:
        deny(
            "Pre-commit checks failed:\n"
            + "\n".join(f"  - {b}" for b in blockers[:10])
            + "\nFix these issues before committing."
        )
    if DNS_EXFIL.search(cmd):
        deny("[guard] DNS/ICMP tools can exfiltrate data (CVE-2025-55284). Use curl for connectivity checks.")
    passthrough()

if __name__ == "__main__":
    main()
