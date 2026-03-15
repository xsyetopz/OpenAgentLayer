#!/usr/bin/env python3
import json
import os
import re
import sys

FORCE_PUSH_TO_MAIN = re.compile(
    r'git\s+push\b.*--force(?:-with-lease)?.*\b(?:main|master)\b'
    r'|git\s+push\b.*\b(?:main|master)\b.*--force(?:-with-lease)?',
    re.IGNORECASE,
)
AUTH_HEADER_ECHO = re.compile(
    r'\b(?:curl|wget)\b.*\s(?:-H|--header)\s.+(?:authorization|api-key)',
    re.IGNORECASE,
)
BROAD_RM_RF = re.compile(
    r'\brm\s+-[a-zA-Z]*r[a-zA-Z]*f[a-zA-Z]*\s+(?:/\s|~/|"\$HOME"|\.\.?\s|/\*)',
    re.IGNORECASE,
)
DOC_EXTENSIONS = ('.md', '.mdx', '.txt', '.json', '.yaml', '.yml', '.toml')

def respond(decision: str, reason: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": decision,
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)

def is_env_file(filepath: str) -> bool:
    basename = os.path.basename(filepath)
    return basename == ".env" or basename.startswith(".env.")

def bash_guard(cmd: str):
    if AUTH_HEADER_ECHO.search(cmd):
        respond("deny", "Blocked: command would echo auth headers to output.")
    if FORCE_PUSH_TO_MAIN.search(cmd):
        respond("deny", "Blocked: force-push to main/master is never allowed. Use a feature branch.")
    if BROAD_RM_RF.search(cmd):
        respond("deny", "Blocked: rm -rf on broad path. Be more specific about what to delete.")

def read_guard(fp: str):
    if is_env_file(fp):
        respond("deny", "Blocked: .env file reads are not permitted.")
    if fp.endswith(DOC_EXTENSIONS):
        respond("allow", "Documentation/config read auto-approved")

def write_edit_guard(fp: str):
    if is_env_file(fp):
        respond("deny", "Blocked: .env file writes are not permitted.")

def webfetch_guard(url: str):
    if re.search(r'(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+', url):
        respond("deny", "Blocked: fetching from localhost services. Use Bash with curl instead.")

def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {})

    if tool_name == "Bash":
        bash_guard(tool_input.get("command", "") or "")

    elif tool_name == "Read":
        read_guard(tool_input.get("file_path", ""))

    elif tool_name in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        write_edit_guard(tool_input.get("file_path", ""))

    elif tool_name == "WebFetch":
        webfetch_guard(tool_input.get("url", ""))

    sys.exit(0)

if __name__ == "__main__":
    main()
