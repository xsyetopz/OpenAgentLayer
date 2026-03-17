"""Tests for new hook scripts added in the hardening phase."""

import json
import os
import tempfile
from conftest import run_hook, parse_hook_output


class TestUserPromptSubmit:
    def test_runs_without_error(self):
        result = run_hook("user-prompt-submit.py", {"prompt": "hello"})
        assert result.returncode == 0

    def test_empty_prompt_passes(self):
        result = run_hook("user-prompt-submit.py", {"prompt": ""})
        assert result.returncode == 0


class TestPostFailure:
    def test_runs_without_error(self):
        result = run_hook("post-failure.py", {
            "tool_name": "Bash",
            "tool_error": "command not found",
        })
        assert result.returncode == 0

    def test_logs_failure(self):
        result = run_hook("post-failure.py", {
            "tool_name": "Bash",
            "tool_error": "permission denied",
        })
        assert result.returncode == 0


class TestSessionEnd:
    def test_runs_without_error(self):
        result = run_hook("session-end.py", {})
        assert result.returncode == 0


class TestTeammateIdle:
    def test_runs_and_warns(self):
        result = run_hook("teammate-idle.py", {"agent_name": "hermes"})
        output = parse_hook_output(result)
        assert result.returncode == 0
        if output:
            ctx = output.get("hookSpecificOutput", {}).get("additionalContext", "")
            assert "hermes" in ctx.lower() or "idle" in ctx.lower()


class TestNotification:
    def test_runs_without_error(self):
        result = run_hook("notification.py", {"message": "test notification"})
        assert result.returncode == 0


class TestPermissionRequest:
    def test_runs_without_error(self):
        result = run_hook("permission-request.py", {
            "tool_name": "Bash",
            "permission": "execute",
        })
        assert result.returncode == 0


class TestAuditLogging:
    def test_writes_audit_log_when_enabled(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = run_hook("notification.py", {"message": "test"}, env={
                "CCA_HOOK_LOG_DIR": tmpdir,
            })
            assert result.returncode == 0
            log_file = os.path.join(tmpdir, "cca-hooks.jsonl")
            assert os.path.exists(log_file), "Audit log file should be created when CCA_HOOK_LOG_DIR is set"
            with open(log_file) as f:
                lines = f.readlines()
            assert len(lines) >= 1, "Audit log should contain at least one entry"
            entry = json.loads(lines[0])
            assert entry["event"] == "Notification"
            assert entry["hook"] == "notification.py"

    def test_no_log_when_disabled(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = run_hook("notification.py", {"message": "test"})
            assert result.returncode == 0
            log_file = os.path.join(tmpdir, "cca-hooks.jsonl")
            assert not os.path.exists(log_file)
