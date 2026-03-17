"""Shared fixtures for CCA hook tests."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest

HOOKS_DIR = Path(__file__).parent.parent / "hooks" / "scripts"


@pytest.fixture
def hooks_dir():
    return HOOKS_DIR


def run_hook(script_name: str, input_json: dict, env: dict | None = None) -> subprocess.CompletedProcess:
    """Run a hook script with JSON stdin, return CompletedProcess."""
    script = HOOKS_DIR / script_name
    merged_env = {**os.environ, **(env or {})}
    # Remove CCA_HOOK_LOG_DIR to prevent test pollution unless explicitly set
    if "CCA_HOOK_LOG_DIR" not in (env or {}):
        merged_env.pop("CCA_HOOK_LOG_DIR", None)
    return subprocess.run(
        ["python3", str(script)],
        input=json.dumps(input_json),
        capture_output=True,
        text=True,
        env=merged_env,
        timeout=10,
    )


def parse_hook_output(result: subprocess.CompletedProcess) -> dict:
    """Parse JSON output from a hook script."""
    if not result.stdout.strip():
        return {}
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        return {}
