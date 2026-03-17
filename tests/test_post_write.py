"""Tests for hooks/scripts/post-write.py — placeholder and slop detection."""

import os
import tempfile
from conftest import run_hook, parse_hook_output


def make_write_output(file_path: str, content: str = "") -> dict:
    return {
        "tool_name": "Write",
        "tool_input": {"file_path": file_path, "content": content},
    }


class TestPlaceholderDetection:
    def test_detects_todo_in_written_file(self):
        content = "def main():\n    # TODO: implement this\n    pass\n"
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(content)
            f.flush()
            result = run_hook("post-write.py", make_write_output(f.name, content))
            output = parse_hook_output(result)
            assert output, "Expected JSON output for TODO detection"
            hook_out = output.get("hookSpecificOutput", {})
            # post-write.py returns a deny decision for hard placeholders
            reason = hook_out.get("permissionDecisionReason", "")
            ctx = hook_out.get("additionalContext", "")
            combined = reason + ctx
            assert "TODO" in combined.upper() or "placeholder" in combined.lower() or result.returncode == 2
        os.unlink(f.name)

    def test_clean_file_passes(self):
        content = "def add(a: int, b: int) -> int:\n    return a + b\n"
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(content)
            f.flush()
            result = run_hook("post-write.py", make_write_output(f.name, content))
            assert result.returncode != 2
        os.unlink(f.name)
