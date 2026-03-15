#!/usr/bin/env python3
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _lib import (
    PLACEHOLDER_HARD,
    COMMENT_SLOP_PATTERNS,
    AI_PROSE_SLOP,
    is_test_file,
    is_prose_file,
    read_stdin,
    block,
    warn,
    passthrough,
)

FORMATTERS: dict[str, list[list[str]]] = {
    "py":    [["ruff", "format", "--quiet"], ["black", "--quiet"]],
    "go":    [["gofmt", "-w"]],
    "rs":    [["rustfmt", "--edition", "2021"]],
    "ts":    [["prettier", "--write"], ["deno", "fmt"]],
    "tsx":   [["prettier", "--write"], ["deno", "fmt"]],
    "js":    [["prettier", "--write"], ["deno", "fmt"]],
    "jsx":   [["prettier", "--write"], ["deno", "fmt"]],
    "swift": [["swift-format", "format", "--in-place"]],
    "cpp":   [["clang-format", "-i"]],
    "cc":    [["clang-format", "-i"]],
    "cxx":   [["clang-format", "-i"]],
    "c":     [["clang-format", "-i"]],
    "h":     [["clang-format", "-i"]],
    "hpp":   [["clang-format", "-i"]],
}

def get_tool_file_and_content(data: dict) -> tuple[str, str]:
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})
    file_path = tool_input.get("file_path", "")
    if tool_name == "Write":
        content = tool_input.get("content", "")
    elif tool_name == "Edit":
        content = tool_input.get("new_string", "")
    else:
        content = ""
    return file_path, content

def run_formatter(file_path: str) -> None:
    ext = os.path.splitext(file_path)[1].lstrip(".")
    if not ext or not os.path.isfile(file_path):
        return
    for cmd_parts in FORMATTERS.get(ext, []):
        if shutil.which(cmd_parts[0]):
            try:
                subprocess.run(
                    cmd_parts + [file_path],
                    capture_output=True, timeout=30,
                )
            except (subprocess.TimeoutExpired, OSError):
                pass
            return

def placeholder_patterns(content: str, file_path: str) -> list[str]:
    if is_test_file(file_path):
        return []
    return [pat.pattern for pat in PLACEHOLDER_HARD if pat.findall(content)]

def slop_patterns(content: str, file_path: str) -> list[str]:
    hits: list[str] = []
    for pat in COMMENT_SLOP_PATTERNS:
        if pat.search(content):
            hits.append("narrating comment")
            break
    if is_prose_file(file_path):
        for pat in AI_PROSE_SLOP:
            if pat.search(content):
                hits.append(pat.pattern)
    return hits[:5]

def main() -> None:
    data = read_stdin()
    if not data:
        passthrough()
    file_path, content = get_tool_file_and_content(data)
    if not file_path:
        passthrough()
    run_formatter(file_path)
    if not content:
        passthrough()
    placeholders = placeholder_patterns(content, file_path)
    if placeholders:
        block(
            f"Placeholder code in {os.path.basename(file_path)}: "
            f"{', '.join(placeholders[:3])}. "
            "Finish the implementation."
        )
    slop = slop_patterns(content, file_path)
    if slop:
        warn(
            f"Comment/prose slop in {os.path.basename(file_path)} "
            f"({', '.join(slop[:3])}). "
            "Remove narrating comments and AI filler."
        )
    passthrough()

if __name__ == "__main__":
    main()
