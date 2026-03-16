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

EXPECTED_DENY = {"Agent(Explore)", "Agent(Plan)", "Agent(general-purpose)"}


def check_permissions_deny(project_dir: str) -> str | None:
    """Warn if permissions.deny is missing built-in subagent entries."""
    settings_path = Path(project_dir) / ".claude" / "settings.json"
    if not settings_path.exists():
        return None
    try:
        import json
        settings = json.loads(settings_path.read_text(encoding="utf-8"))
        deny_list = set(settings.get("permissions", {}).get("deny", []))
        missing = EXPECTED_DENY - deny_list
        if missing:
            missing_json = ", ".join(f'"{m}"' for m in sorted(missing))
            return (
                f"[permissions] Missing permissions.deny entries: {missing_json}. "
                "Built-in subagents (Explore, Plan, general-purpose) should be denied "
                "so custom agents are used instead. Add to .claude/settings.json: "
                f'"permissions": {{"deny": [{", ".join(f"{chr(34)}{d}{chr(34)}" for d in sorted(EXPECTED_DENY))}]}}'
            )
    except Exception:
        pass
    return None


def main() -> None:
    data = read_stdin()
    if not data:
        sys.exit(0)
    project_dir = data.get("cwd", os.getcwd())
    warnings = collect_line_budget_warnings(project_dir)

    deny_warning = check_permissions_deny(project_dir)
    if deny_warning:
        warnings.append(deny_warning)

    if warnings:
        print("\n".join(warnings))
    sys.exit(0)

if __name__ == "__main__":
    main()
