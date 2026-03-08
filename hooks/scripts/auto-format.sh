#!/bin/bash
# Auto-format files after Write/Edit tool use.
# Reads file path from stdin JSON (tool_input.file_path).

set -e

FILE=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
    exit 0
fi

EXT="${FILE##*.}"

case "$EXT" in
    rs)
        command -v rustfmt &>/dev/null && rustfmt --edition 2021 "$FILE" 2>/dev/null || true
        ;;
    ts|tsx|js|jsx)
        if command -v prettier &>/dev/null; then
            prettier --write "$FILE" 2>/dev/null || true
        elif command -v deno &>/dev/null; then
            deno fmt "$FILE" 2>/dev/null || true
        fi
        ;;
    go)
        command -v gofmt &>/dev/null && gofmt -w "$FILE" 2>/dev/null || true
        ;;
    py)
        if command -v ruff &>/dev/null; then
            ruff format "$FILE" 2>/dev/null || true
        elif command -v black &>/dev/null; then
            black --quiet "$FILE" 2>/dev/null || true
        fi
        ;;
    swift)
        command -v swift-format &>/dev/null && swift-format format --in-place "$FILE" 2>/dev/null || true
        ;;
    cpp|cc|cxx|c|h|hpp)
        command -v clang-format &>/dev/null && clang-format -i "$FILE" 2>/dev/null || true
        ;;
esac
