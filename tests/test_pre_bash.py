"""Tests for hooks/scripts/pre-bash.py — Bash command validation."""

from conftest import parse_hook_output, run_hook


def make_bash_input(command: str) -> dict:
    return {"tool_name": "Bash", "tool_input": {"command": command}}


class TestBlockedCommands:
    def test_blocks_rm_rf_root(self):
        # The BROAD_RM pattern requires a space or path after the target
        result = run_hook("pre-bash.py", make_bash_input("rm -rf /* "))
        assert result.returncode == 2 or "block" in result.stdout.lower() or "deny" in result.stdout.lower()

    def test_blocks_rm_rf_home(self):
        result = run_hook("pre-bash.py", make_bash_input("rm -rf ~/"))
        assert result.returncode == 2 or "block" in result.stdout.lower() or "deny" in result.stdout.lower()

    def test_blocks_blanket_git_add(self):
        result = run_hook("pre-bash.py", make_bash_input("git add ."))
        assert result.returncode == 2 or "block" in result.stdout.lower() or "deny" in result.stdout.lower()

    def test_blocks_git_add_all(self):
        result = run_hook("pre-bash.py", make_bash_input("git add -A"))
        assert result.returncode == 2 or "block" in result.stdout.lower() or "deny" in result.stdout.lower()


class TestAllowedCommands:
    def test_allows_git_status(self):
        result = run_hook("pre-bash.py", make_bash_input("git status"))
        output = parse_hook_output(result)
        # Should not block
        assert result.returncode != 2
        if output:
            assert output.get("hookSpecificOutput", {}).get("permissionDecision") != "deny"

    def test_allows_ls(self):
        result = run_hook("pre-bash.py", make_bash_input("ls -la"))
        assert result.returncode != 2

    def test_allows_specific_git_add(self):
        result = run_hook("pre-bash.py", make_bash_input("git add src/main.py"))
        assert result.returncode != 2

    def test_allows_make(self):
        result = run_hook("pre-bash.py", make_bash_input("make test"))
        assert result.returncode != 2
