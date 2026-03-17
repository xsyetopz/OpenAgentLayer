#!/usr/bin/env python3
from __future__ import annotations
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from _lib import read_stdin, deny, passthrough


def validate_write(tool_input: dict) -> str | None:
    fp = tool_input.get("file_path", "")
    if not fp or not fp.startswith("/"):
        return "file_path must be an absolute path"
    content = tool_input.get("content", "")
    if not content:
        return "content must be non-empty"
    return None


def validate_edit(tool_input: dict) -> str | None:
    fp = tool_input.get("file_path", "")
    if not fp or not fp.startswith("/"):
        return "file_path must be an absolute path"
    old = tool_input.get("old_string", "")
    new = tool_input.get("new_string", "")
    if not old:
        return "old_string must be non-empty"
    if not new:
        return "new_string must be non-empty"
    if old == new:
        return "old_string and new_string must be different"
    return None


def validate_bash(tool_input: dict) -> str | None:
    cmd = tool_input.get("command", "")
    if not cmd or not cmd.strip():
        return "command must be non-empty"
    return None


def validate_read(tool_input: dict) -> str | None:
    fp = tool_input.get("file_path", "")
    if not fp or not fp.startswith("/"):
        return "file_path must be an absolute path"
    return None


def validate_webfetch(tool_input: dict) -> str | None:
    url = tool_input.get("url", "")
    if not url:
        return "url must be non-empty"
    if not url.startswith(("http://", "https://")):
        return "url must start with http:// or https://"
    return None


VALIDATORS = {
    "Write": validate_write,
    "Edit": validate_edit,
    "Bash": validate_bash,
    "Read": validate_read,
    "WebFetch": validate_webfetch,
}


def main() -> None:
    data = read_stdin()
    if not data:
        passthrough()

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    validator = VALIDATORS.get(tool_name)
    if not validator:
        passthrough()

    error = validator(tool_input)
    if error:
        deny(f"[schema] {tool_name}: {error}")

    passthrough()


if __name__ == "__main__":
    main()
