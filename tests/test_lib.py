"""Tests for hooks/scripts/_lib.py shared patterns."""

import sys
from pathlib import Path

# Add hooks/scripts to path so we can import _lib
sys.path.insert(0, str(Path(__file__).parent.parent / "hooks" / "scripts"))

from _lib import (
    AI_PROSE_SLOP,
    COMMENT_SLOP_PATTERNS,
    PII_PATTERNS,
    PLACEHOLDER_HARD,
    PLACEHOLDER_SOFT,
    SECRET_PATTERNS,
    UNICODE_SLOP,
    WORKAROUND_HARD,
    is_meta_file,
    is_prose_file,
    is_test_file,
)


class TestPlaceholderHard:
    def test_detects_todo(self):
        assert any(p.search("TODO: fix this") for p in PLACEHOLDER_HARD)

    def test_detects_fixme(self):
        assert any(p.search("FIXME: broken") for p in PLACEHOLDER_HARD)

    def test_detects_hack(self):
        assert any(p.search("HACK: workaround") for p in PLACEHOLDER_HARD)

    def test_detects_rust_todo_macro(self):
        assert any(p.search("todo!()") for p in PLACEHOLDER_HARD)

    def test_detects_rust_unimplemented(self):
        assert any(p.search("unimplemented!()") for p in PLACEHOLDER_HARD)

    def test_detects_python_not_implemented(self):
        assert any(p.search("raise NotImplementedError") for p in PLACEHOLDER_HARD)

    def test_allows_todo_in_test_context(self):
        # TODO in test comments should not trigger
        assert not any(p.search("TODO (test helper)") for p in PLACEHOLDER_HARD)


class TestPlaceholderSoft:
    def test_detects_for_now(self):
        assert any(p.search("for now we'll use this") for p in PLACEHOLDER_SOFT)

    def test_detects_simplified_version(self):
        assert any(p.search("this is a simplified version") for p in PLACEHOLDER_SOFT)

    def test_detects_placeholder(self):
        assert any(p.search("placeholder value") for p in PLACEHOLDER_SOFT)

    def test_detects_proof_of_concept(self):
        assert any(p.search("this is a proof of concept") for p in PLACEHOLDER_SOFT)


class TestAIProseSlop:
    def test_detects_robust(self):
        assert any(p.search("a robust solution") for p in AI_PROSE_SLOP)

    def test_detects_seamless(self):
        assert any(p.search("seamless integration") for p in AI_PROSE_SLOP)

    def test_detects_leverage(self):
        assert any(p.search("leverage existing code") for p in AI_PROSE_SLOP)

    def test_detects_claude_pattern(self):
        assert any(p.search("I'd be happy to help") for p in AI_PROSE_SLOP)

    def test_detects_delve(self):
        assert any(p.search("let's delve into") for p in AI_PROSE_SLOP)


class TestSecretPatterns:
    def test_detects_api_key_assignment(self):
        assert any(p.search('api_key = "sk-proj-abc123def456ghi789jklmnopqrstuvwxyz"') for p in SECRET_PATTERNS)

    def test_detects_aws_key(self):
        assert any(p.search("AKIAIOSFODNN7EXAMPLE") for p in SECRET_PATTERNS)

    def test_detects_github_token(self):
        assert any(p.search("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh1234") for p in SECRET_PATTERNS)

    def test_detects_jwt(self):
        assert any(p.search("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0") for p in SECRET_PATTERNS)


class TestPIIPatterns:
    def test_detects_email(self):
        assert any(p.search("user@example.com") for p in PII_PATTERNS)

    def test_detects_ssn(self):
        assert any(p.search("123-45-6789") for p in PII_PATTERNS)

    def test_detects_private_ip(self):
        assert any(p.search("192.168.1.100") for p in PII_PATTERNS)

    def test_detects_metadata_endpoint(self):
        assert any(p.search("169.254.169.254") for p in PII_PATTERNS)


class TestUnicodeSlop:
    def test_detects_em_dash(self):
        assert any(p.search("\u2014") for p in UNICODE_SLOP)

    def test_detects_curly_quotes(self):
        assert any(p.search("\u201c") for p in UNICODE_SLOP)

    def test_detects_zero_width_space(self):
        assert any(p.search("\u200b") for p in UNICODE_SLOP)


class TestCommentSlop:
    def test_detects_section_narrators(self):
        assert COMMENT_SLOP_PATTERNS[0].search("// Constants")

    def test_detects_educational_comments(self):
        assert COMMENT_SLOP_PATTERNS[1].search("# This is where we handle errors")

    def test_detects_tautological_comments(self):
        assert COMMENT_SLOP_PATTERNS[2].search("// Get the user")


class TestWorkaroundHard:
    def test_detects_lets_just(self):
        assert any(p.search("Actually, let's just use a different approach") for p in WORKAROUND_HARD)


class TestHelperFunctions:
    def test_is_test_file(self):
        assert is_test_file("test_main.py")
        assert is_test_file("main_test.go")
        assert is_test_file("main.test.ts")
        assert is_test_file("main.spec.js")
        assert not is_test_file("main.py")
        assert not is_test_file("utils.ts")

    def test_is_prose_file(self):
        assert is_prose_file("README.md")
        assert is_prose_file("docs.txt")
        assert is_prose_file("guide.rst")
        assert not is_prose_file("main.py")
        assert not is_prose_file("index.ts")

    def test_is_meta_file(self):
        assert is_meta_file("hooks/scripts/pre-bash.py")
        assert is_meta_file("agents/athena.md")
        assert is_meta_file("skills/review-code/SKILL.md")
        assert is_meta_file("CLAUDE.md")
        assert not is_meta_file("src/main.py")
