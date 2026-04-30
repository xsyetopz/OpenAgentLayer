#!/bin/bash
# _run.sh -- universal CCA hook runner
# Usage: _run.sh <hook-script.mjs>
# Reads CLAUDE_PROJECT_DIR or CLAUDE_PLUGIN_ROOT to find the hook.
# Falls back gracefully if hook file is missing (exit 0 = no-op).

DIR="${CLAUDE_PROJECT_DIR:+$CLAUDE_PROJECT_DIR/.claude/hooks/scripts}"
DIR="${DIR:-${CLAUDE_PLUGIN_ROOT:+$CLAUDE_PLUGIN_ROOT/hooks/scripts}}"

if [ -z "$DIR" ]; then
    exit 0
fi

HOOK="$DIR/$1"

if [ -f "$HOOK" ]; then
    exec node "$HOOK"
else
    exit 0
fi
