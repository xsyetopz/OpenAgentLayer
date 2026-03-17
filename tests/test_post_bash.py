"""Tests for hooks/scripts/post-bash.py — secret and PII redaction."""

from conftest import run_hook, parse_hook_output


def make_bash_output(command: str, tool_response: str) -> dict:
    return {
        "tool_name": "Bash",
        "tool_input": {"command": command},
        "tool_response": tool_response,
    }


class TestSecretDetection:
    def test_warns_on_api_key_in_output(self):
        result = run_hook("post-bash.py", make_bash_output(
            "env", 'API_KEY="sk-abc123def456ghi789jkl012mno345pqr678stu901"'
        ))
        output = parse_hook_output(result)
        assert output, "Expected JSON output with warning"
        ctx = output.get("hookSpecificOutput", {}).get("additionalContext", "")
        assert "secret" in ctx.lower() or "redact" in ctx.lower() or "credential" in ctx.lower()

    def test_warns_on_aws_key_in_output(self):
        result = run_hook("post-bash.py", make_bash_output(
            "env", "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"
        ))
        output = parse_hook_output(result)
        assert output, "Expected JSON output with warning"
        ctx = output.get("hookSpecificOutput", {}).get("additionalContext", "")
        assert "secret" in ctx.lower() or "redact" in ctx.lower() or "credential" in ctx.lower()


class TestCleanOutput:
    def test_clean_output_passes(self):
        result = run_hook("post-bash.py", make_bash_output(
            "ls", "file1.py\nfile2.py\nfile3.py\n"
        ))
        assert result.returncode == 0
        output = parse_hook_output(result)
        # Should not produce any warning output
        if output:
            ctx = output.get("hookSpecificOutput", {}).get("additionalContext", "")
            assert "secret" not in ctx.lower()
