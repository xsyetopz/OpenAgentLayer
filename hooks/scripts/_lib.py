#!/usr/bin/env python3

import json
import os
import re
import sys

PLACEHOLDER_HARD = [
    re.compile(r'\bTODO\b(?!\s*\(.*test)'),
    re.compile(r'\bFIXME\b'),
    re.compile(r'\bHACK\b'),
    re.compile(r'\bXXX\b'),
    re.compile(r'\btodo!\s*\(\s*\)'),
    re.compile(r'\bunimplemented!\s*\(\s*\)'),
    re.compile(r'raise\s+NotImplementedError'),
    re.compile(r'(def\s+\w+\([^)]*\)\s*:\s*\n\s*pass)\s*$', re.MULTILINE),
    re.compile(r'fn\s+\w+\s*\([^)]*\)\s*(?:->[^{]*)?\{[\s]*\}'),
    re.compile(r'function\s+\w+\s*\([^)]*\)\s*\{[\s]*\}'),
]

PLACEHOLDER_SOFT = [
    re.compile(r'\bfor now\b', re.IGNORECASE),
    re.compile(r'simplified version', re.IGNORECASE),
    re.compile(r'in a real implementation', re.IGNORECASE),
    re.compile(r'\bplaceholder\b', re.IGNORECASE),
    re.compile(r'\btemporary\b', re.IGNORECASE),
    re.compile(r'quick and dirty', re.IGNORECASE),
    re.compile(r'for demo(?:nstration)? purposes', re.IGNORECASE),
    re.compile(r'proof of concept', re.IGNORECASE),
    re.compile(r'in production(?:,)? (?:you|this) (?:would|should)', re.IGNORECASE),
    re.compile(r'this (?:is|can be) (?:improved|optimized) later', re.IGNORECASE),
    re.compile(r'handle (?:edge cases?|errors?) (?:here|later|properly)', re.IGNORECASE),
]

AI_PROSE_SLOP = [
    re.compile(r'\b(?:robust|seamless|comprehensive|cutting-edge|innovative|streamlined)\b', re.IGNORECASE),
    re.compile(r'\b(?:leverage|utilize|facilitate|enhance|ensure|empower|foster|harness)\b', re.IGNORECASE),
    re.compile(r"it'?s (?:important|worth) (?:to )?(?:note|mention)", re.IGNORECASE),
    re.compile(r'(?:great|excellent|fantastic) (?:question|point|approach)', re.IGNORECASE),
    re.compile(r'\b(?:delve|underscore|bolster|unpack|craft|curate)\b', re.IGNORECASE),
    re.compile(r'in today\'?s (?:landscape|world|environment)', re.IGNORECASE),
    re.compile(r'moving forward\b', re.IGNORECASE),
    re.compile(r'needless to say\b', re.IGNORECASE),
    re.compile(r'at the end of the day\b', re.IGNORECASE),
    re.compile(r'let\'?s (?:dive in|break this down|explore)', re.IGNORECASE),
]

SECTION_NARRATORS = re.compile(
    r'^\s*(?://|#|/\*)\s*(?:Constants?|Helper functions?|Imports?|Main function|'
    r'Define\s|Initialize|Setup|Configuration|Variables?|Types?|Interfaces?|'
    r'Dependencies|Exports?|Utils?|Utilities)\s*\*?/?\s*$',
    re.MULTILINE | re.IGNORECASE,
)

EDUCATIONAL_COMMENTS = re.compile(
    r'^\s*(?://|#|/\*)\s*(?:This is where we|Here we|Note that|'
    r'Now we|First we|Then we|Finally we|We need to|'
    r'This (?:function|method|class) (?:is|handles|does)|'
    r'The following|As you can see|Below we|Above we|'
    r'This (?:is a|represents|provides|allows))\b',
    re.MULTILINE | re.IGNORECASE,
)

TAUTOLOGICAL_COMMENTS = re.compile(
    r'^\s*(?://|#|/\*)\s*(?:(?:Get|Set|Return|Check|Create|Initialize|Import|'
    r'Define|Declare|Update|Delete|Remove|Add|Process|Handle|Parse|Validate|'
    r'Calculate|Compute|Convert|Transform|Format|Render|Display|Print|Log|'
    r'Send|Fetch|Load|Save|Store|Read|Write|Open|Close)\s+(?:the\s+)?)',
    re.MULTILINE | re.IGNORECASE,
)

COMMENT_SLOP_PATTERNS = [SECTION_NARRATORS, EDUCATIONAL_COMMENTS, TAUTOLOGICAL_COMMENTS]

SECRET_PATTERNS = [
    re.compile(r'(?i)\b[A-Z0-9]{20,}[_-]?[A-Z0-9]{10,}\b'),
    re.compile(r'(?i)\b(?:api|secret|token|key|passwd|password)\s*[:=]\s*["\']?([^\s"\']{8,})'),
    re.compile(r'(?i)sk-[a-z0-9]{20,}'),
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'gh[pous]_[A-Za-z0-9_]{36,}'),
    re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'),
]

MERGE_CONFLICT = re.compile(r'^(?:<{7}|={7}|>{7})\s', re.MULTILINE)

TEST_FILE_RE = re.compile(
    r'(?:test_|_test\.|\.test\.|\.spec\.|tests/|__tests__/|test\.)',
    re.IGNORECASE,
)

PROSE_EXTENSIONS = {'.md', '.mdx', '.txt', '.rst', '.adoc'}

def is_test_file(filepath: str) -> bool:
    return bool(TEST_FILE_RE.search(filepath))

def is_prose_file(filepath: str) -> bool:
    ext = os.path.splitext(filepath)[1].lower()
    return ext in PROSE_EXTENSIONS

def read_stdin() -> dict:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}

def _print_and_exit(data):
    print(json.dumps(data))
    sys.exit(0)

def deny(reason: str) -> None:
    _print_and_exit({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    })

def allow(reason: str = "") -> None:
    result = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "allow"
        }
    }
    if reason:
        result["hookSpecificOutput"]["permissionDecisionReason"] = reason
    _print_and_exit(result)

def block(reason: str) -> None:
    _print_and_exit({"decision": "block", "reason": reason})

def warn(message: str, event: str = "PostToolUse") -> None:
    _print_and_exit({
        "hookSpecificOutput": {
            "hookEventName": event,
            "additionalContext": message,
        }
    })

def passthrough() -> None:
    sys.exit(0)
