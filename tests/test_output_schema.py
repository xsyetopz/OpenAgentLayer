"""Tests that _lib output helpers produce valid CC hook JSON schema."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Callable

import pytest  # type: ignore[import-untyped]

sys.path.insert(0, str(Path(__file__).parent.parent / "hooks" / "scripts"))

SCHEMA_PATH = Path(__file__).parent.parent / "hooks" / "schema" / "hook-output.json"

HAS_JSONSCHEMA: bool = False
try:
    import jsonschema  # type: ignore[import-untyped]

    HAS_JSONSCHEMA = True
except ImportError:
    pass


def load_schema() -> dict[str, Any]:
    return json.loads(SCHEMA_PATH.read_text())  # type: ignore[no-any-return]


def run_and_capture(
    func: Callable[..., Any], *args: Any, capsys: pytest.CaptureFixture[str]
) -> dict[str, Any]:
    """Call a _lib output function, capture stdout, parse JSON."""
    with pytest.raises(SystemExit):
        func(*args)
    captured = capsys.readouterr()
    return json.loads(captured.out)  # type: ignore[no-any-return]


class TestPostWarn:
    def test_output_structure(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import post_warn  # type: ignore[import-not-found]

        output = run_and_capture(post_warn, "test message", capsys=capsys)
        assert output["hookSpecificOutput"]["hookEventName"] == "PostToolUse"
        assert output["hookSpecificOutput"]["additionalContext"] == "test message"

    def test_no_extra_fields(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import post_warn  # type: ignore[import-not-found]

        output = run_and_capture(post_warn, "msg", capsys=capsys)
        hso: dict[str, Any] = output["hookSpecificOutput"]
        assert set(hso.keys()) == {"hookEventName", "additionalContext"}

    @pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")  # type: ignore[misc]
    def test_validates_against_schema(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import post_warn  # type: ignore[import-not-found]

        output = run_and_capture(post_warn, "test", capsys=capsys)
        jsonschema.validate(output, load_schema())


class TestGenericWarn:
    def test_output_structure(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import generic_warn  # type: ignore[import-not-found]

        output = run_and_capture(generic_warn, "warning text", capsys=capsys)
        assert output["reason"] == "warning text"
        assert "hookSpecificOutput" not in output

    @pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")  # type: ignore[misc]
    def test_validates_against_schema(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import generic_warn  # type: ignore[import-not-found]

        output = run_and_capture(generic_warn, "test", capsys=capsys)
        jsonschema.validate(output, load_schema())


class TestGenericBlock:
    def test_output_structure(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import generic_block  # type: ignore[import-not-found]

        output = run_and_capture(generic_block, "blocked", capsys=capsys)
        assert output["decision"] == "block"
        assert output["reason"] == "blocked"
        assert "hookSpecificOutput" not in output

    @pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")  # type: ignore[misc]
    def test_validates_against_schema(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import generic_block  # type: ignore[import-not-found]

        output = run_and_capture(generic_block, "test", capsys=capsys)
        jsonschema.validate(output, load_schema())


class TestDeny:
    """Verify deny() is only valid for PreToolUse context."""

    def test_pretooluse_output(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import deny  # type: ignore[import-not-found]

        output = run_and_capture(deny, "reason", capsys=capsys)
        hso: dict[str, Any] = output["hookSpecificOutput"]
        assert hso["hookEventName"] == "PreToolUse"
        assert hso["permissionDecision"] == "deny"
        assert hso["permissionDecisionReason"] == "reason"

    @pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")  # type: ignore[misc]
    def test_validates_against_schema(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import deny  # type: ignore[import-not-found]

        output = run_and_capture(deny, "reason", capsys=capsys)
        jsonschema.validate(output, load_schema())


class TestWarn:
    """Verify warn() default event is PostToolUse."""

    def test_default_event(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import warn  # type: ignore[import-not-found]

        output = run_and_capture(warn, "msg", capsys=capsys)
        assert output["hookSpecificOutput"]["hookEventName"] == "PostToolUse"

    @pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")  # type: ignore[misc]
    def test_validates_against_schema(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import warn  # type: ignore[import-not-found]

        output = run_and_capture(warn, "msg", capsys=capsys)
        jsonschema.validate(output, load_schema())


class TestAllow:
    def test_output_structure(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import allow  # type: ignore[import-not-found]

        output = run_and_capture(allow, "allowed", capsys=capsys)
        hso: dict[str, Any] = output["hookSpecificOutput"]
        assert hso["hookEventName"] == "PreToolUse"
        assert hso["permissionDecision"] == "allow"

    @pytest.mark.skipif(not HAS_JSONSCHEMA, reason="jsonschema not installed")  # type: ignore[misc]
    def test_validates_against_schema(self, capsys: pytest.CaptureFixture[str]) -> None:
        from _lib import allow  # type: ignore[import-not-found]

        output = run_and_capture(allow, "allowed", capsys=capsys)
        jsonschema.validate(output, load_schema())
