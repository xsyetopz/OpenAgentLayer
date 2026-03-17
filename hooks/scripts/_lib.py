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
    # Claude-specific patterns
    re.compile(r"I'?d be happy to\b", re.IGNORECASE),
    re.compile(r"Here'?s what I found\b", re.IGNORECASE),
    re.compile(r"Based on my analysis\b", re.IGNORECASE),
    # GPTZero high-multiplier phrases
    re.compile(r"in today'?s digital age\b", re.IGNORECASE),
    re.compile(r"plays a crucial role\b", re.IGNORECASE),
    re.compile(r"\ba testament to\b", re.IGNORECASE),
    re.compile(r"\baims to\b", re.IGNORECASE),
    re.compile(r"\bserves as a\b", re.IGNORECASE),
    re.compile(r"\baligns with\b", re.IGNORECASE),
    # Additional dead giveaways
    re.compile(r'\b(?:elevate|streamline|resonate|vibrant|bustling|tapestry|testament|paramount|imperative|indispensable|pivotal)\b', re.IGNORECASE),
    re.compile(r'navigate the complexities\b', re.IGNORECASE),
]

UNICODE_SLOP = [
    # Tier 0 -- Unicode Forensics
    re.compile(r'\u2014'),  # Em dash
    re.compile(r'\u2013'),  # En dash
    re.compile(r'\u2026'),  # Horizontal ellipsis
    re.compile(r'[\u201c\u201d]'),  # Curly double quotes
    re.compile(r'[\u2018\u2019]'),  # Curly single quotes
    re.compile(r'\u2192'),  # Right arrow
    re.compile(r'\u2190'),  # Left arrow
    re.compile(r'\u21d2'),  # Double right arrow
    re.compile(r'[\u2264\u2265]'),  # Less/greater-equal
    re.compile(r'\u2260'),  # Not equal
    re.compile(r'\u2022'),  # Bullet
    re.compile(r'\u00b7'),  # Middle dot
    # Tier 5 -- Invisible Characters
    re.compile(r'\u00a0'),  # Non-breaking space
    re.compile(r'\u200b'),  # Zero-width space
    re.compile(r'\u202f'),  # Narrow no-break space
    re.compile(r'\u00ad'),  # Soft hyphen
    re.compile(r'\u200c'),  # Zero-width non-joiner
    re.compile(r'\u200d'),  # Zero-width joiner
    re.compile(r'[\u200e\u200f]'),  # LTR/RTL marks
    re.compile(r'\u2060'),  # Word joiner
    re.compile(r'\ufeff'),  # BOM / ZWNBSP
]

SUPPRESSION_PATTERNS = [
    re.compile(r'#\s*noqa\b'),
    re.compile(r'#\s*type:\s*ignore\b'),
    re.compile(r'//\s*eslint-disable'),
    re.compile(r'//\s*@ts-ignore'),
    re.compile(r'//\s*@ts-expect-error'),
    re.compile(r'//\s*nolint'),
    re.compile(r'#\[allow\('),
    re.compile(r'#\[cfg_attr\(.*clippy::'),
    re.compile(r'@SuppressWarnings'),
    re.compile(r'//\s*SAFETY:.*(?:allow|ignore|suppress)', re.IGNORECASE),
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

SYCOPHANCY_PATTERNS = [
    re.compile(r"(?i)^(sure|of course|absolutely|great question|good point|I'd be happy to)"),
    re.compile(r"(?i)^(let me know if|hope this helps|feel free to)"),
    re.compile(r"(?i)sorry for (the|any) (confusion|inconvenience|error)"),
    re.compile(r"(?i)I apologize for"),
    re.compile(r"(?i)^(that's a great|that's an excellent|that's a good) (question|point|idea|observation)"),
    re.compile(r"(?i)^(certainly|definitely|you're (absolutely )?right)"),
]

SECRET_PATTERNS = [
    re.compile(r'(?i)\b[A-Z0-9]{20,}[_-]?[A-Z0-9]{10,}\b'),
    re.compile(r'(?i)\b(?:api|secret|token|key|passwd|password)\s*[:=]\s*["\']?([^\s"\']{8,})'),
    re.compile(r'(?i)sk-[a-z0-9]{20,}'),
    re.compile(r'AKIA[0-9A-Z]{16}'),
    re.compile(r'gh[pous]_[A-Za-z0-9_]{36,}'),
    re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'),
]

PII_PATTERNS = [
    re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b', re.IGNORECASE),
    re.compile(r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),
    re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
    re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
    re.compile(r'\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b'),
    re.compile(r'169\.254\.169\.254'),
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

META_FILE_RE = re.compile(
    r'(?:hooks/scripts/|hooks/hooks\.json|agents/.*\.md|templates/.*\.md|'
    r'skills/.*/SKILL\.md|install\.sh|CLAUDE\.md)',
    re.IGNORECASE,
)

def is_meta_file(filepath: str) -> bool:
    return bool(META_FILE_RE.search(filepath))

WORKAROUND_HARD = [
    re.compile(r"(?:Actually|Better|Instead),?\s+(?:let'?s|I'?ll|we(?:'ll)?)\s+(?:just|simply)", re.IGNORECASE),
    re.compile(r"(?:we|I)\s+(?:could|can)\s+(?:also|instead|alternatively)\s+(?:just\s+)?(?:use|do|make|change|switch|create|add)", re.IGNORECASE),
    re.compile(r"(?:make|change|switch)\s+\w+\s+(?:to\s+)?(?:public|private|protected|pub\b|pub\(crate\))", re.IGNORECASE),
    re.compile(r"Since\s+\w+\s+is\s+(?:private|internal|protected),\s+(?:I'?ll|we'?ll|let'?s)", re.IGNORECASE),
]

WORKAROUND_SOFT = [
    re.compile(r"(?:quick|simple|easy)\s+(?:fix|workaround|hack)", re.IGNORECASE),
    re.compile(r"(?:for now|temporarily|as a stopgap)", re.IGNORECASE),
    re.compile(r"while\s+(?:I'?m|we'?re)\s+here", re.IGNORECASE),
    re.compile(r"(?:might as well|may as well)\s+(?:also|just)", re.IGNORECASE),
]

def read_stdin() -> dict:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}

def _print_and_exit(data):
    print(json.dumps(data))
    sys.exit(0)

def deny(reason: str, event: str = "PreToolUse") -> None:
    _print_and_exit({
        "hookSpecificOutput": {
            "hookEventName": event,
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    })

def allow(reason: str = "", event: str = "PreToolUse") -> None:
    result = {
        "hookSpecificOutput": {
            "hookEventName": event,
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


def audit_log(event: str, hook: str, action: str, reason: str = "", tool: str = "", extra=None) -> None:
    """Write a JSONL audit entry if CCA_HOOK_LOG_DIR is set."""
    log_dir = os.environ.get("CCA_HOOK_LOG_DIR")
    if not log_dir:
        return
    from datetime import datetime, timezone
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "event": event,
        "hook": hook,
        "action": action,
    }
    if reason:
        entry["reason"] = reason
    if tool:
        entry["tool"] = tool
    if extra:
        entry.update(extra)
    try:
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "cca-hooks.jsonl")
        with open(log_file, "a") as f:
            f.write(json.dumps(entry) + "\n")
    except OSError:
        pass  # Best-effort logging, never block on write failure
