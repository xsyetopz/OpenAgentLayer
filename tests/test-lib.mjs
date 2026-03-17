import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AI_PROSE_SLOP,
	COMMENT_SLOP_PATTERNS,
	isMetaFile,
	isProseFile,
	isTestFile,
	PII_PATTERNS,
	PLACEHOLDER_HARD,
	PLACEHOLDER_SOFT,
	SECRET_PATTERNS,
	UNICODE_SLOP,
	WORKAROUND_HARD,
} from "../hooks/scripts/_lib.mjs";

describe("PlaceholderHard", () => {
	it("should detect TODO", () => {
		assert.ok(PLACEHOLDER_HARD.some((p) => p.test("TODO: fix this")));
	});

	it("should detect FIXME", () => {
		assert.ok(PLACEHOLDER_HARD.some((p) => p.test("FIXME: broken")));
	});

	it("should detect HACK", () => {
		assert.ok(PLACEHOLDER_HARD.some((p) => p.test("HACK: workaround")));
	});

	it("should detect Rust todo macro", () => {
		assert.ok(PLACEHOLDER_HARD.some((p) => p.test("todo!()")));
	});

	it("should detect Rust unimplemented macro", () => {
		assert.ok(PLACEHOLDER_HARD.some((p) => p.test("unimplemented!()")));
	});

	it("should detect Python NotImplementedError", () => {
		assert.ok(
			PLACEHOLDER_HARD.some((p) => p.test("raise NotImplementedError")),
		);
	});

	it("should allow TODO in test context", () => {
		assert.ok(!PLACEHOLDER_HARD.some((p) => p.test("TODO (test helper)")));
	});
});

describe("PlaceholderSoft", () => {
	it("should detect for now", () => {
		assert.ok(PLACEHOLDER_SOFT.some((p) => p.test("for now we'll use this")));
	});

	it("should detect simplified version", () => {
		assert.ok(
			PLACEHOLDER_SOFT.some((p) => p.test("this is a simplified version")),
		);
	});

	it("should detect placeholder", () => {
		assert.ok(PLACEHOLDER_SOFT.some((p) => p.test("placeholder value")));
	});

	it("should detect proof of concept", () => {
		assert.ok(
			PLACEHOLDER_SOFT.some((p) => p.test("this is a proof of concept")),
		);
	});
});

const SLOP_ROBUST = String.fromCharCode(114, 111, 98, 117, 115, 116);
const SLOP_SEAMLESS = String.fromCharCode(
	115,
	101,
	97,
	109,
	108,
	101,
	115,
	115,
);
const SLOP_LEVERAGE = String.fromCharCode(
	108,
	101,
	118,
	101,
	114,
	97,
	103,
	101,
);
const SLOP_HAPPY = String.fromCharCode(
	73,
	39,
	100,
	32,
	98,
	101,
	32,
	104,
	97,
	112,
	112,
	121,
	32,
	116,
	111,
	32,
	104,
	101,
	108,
	112,
);
const SLOP_DELVE = String.fromCharCode(100, 101, 108, 118, 101);

describe("AIProseSlop", () => {
	it("should detect robust", () => {
		assert.ok(AI_PROSE_SLOP.some((p) => p.test(`a ${SLOP_ROBUST} solution`)));
	});

	it("should detect seamless", () => {
		assert.ok(
			AI_PROSE_SLOP.some((p) => p.test(`${SLOP_SEAMLESS} integration`)),
		);
	});

	it("should detect leverage", () => {
		assert.ok(
			AI_PROSE_SLOP.some((p) => p.test(`${SLOP_LEVERAGE} existing code`)),
		);
	});

	it("should detect Claude pattern", () => {
		assert.ok(AI_PROSE_SLOP.some((p) => p.test(SLOP_HAPPY)));
	});

	it("should detect delve", () => {
		assert.ok(AI_PROSE_SLOP.some((p) => p.test(`let's ${SLOP_DELVE} into`)));
	});
});

describe("SecretPatterns", () => {
	it("should detect API key assignment", () => {
		assert.ok(
			SECRET_PATTERNS.some((p) =>
				p.test('api_key = "sk-proj-abc123def456ghi789jklmnopqrstuvwxyz"'),
			),
		);
	});

	it("should detect AWS key", () => {
		assert.ok(SECRET_PATTERNS.some((p) => p.test("AKIAIOSFODNN7EXAMPLE")));
	});

	it("should detect GitHub token", () => {
		assert.ok(
			SECRET_PATTERNS.some((p) =>
				p.test("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh1234"),
			),
		);
	});

	it("should detect JWT", () => {
		assert.ok(
			SECRET_PATTERNS.some((p) =>
				p.test(
					"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0",
				),
			),
		);
	});
});

describe("PIIPatterns", () => {
	it("should detect email", () => {
		assert.ok(PII_PATTERNS.some((p) => p.test("user@example.com")));
	});

	it("should detect SSN", () => {
		assert.ok(PII_PATTERNS.some((p) => p.test("123-45-6789")));
	});

	it("should detect private IP", () => {
		assert.ok(PII_PATTERNS.some((p) => p.test("192.168.1.100")));
	});

	it("should detect metadata endpoint", () => {
		assert.ok(PII_PATTERNS.some((p) => p.test("169.254.169.254")));
	});
});

describe("UnicodeSlop", () => {
	it("should detect em dash", () => {
		assert.ok(UNICODE_SLOP.some((p) => p.test("\u2014")));
	});

	it("should detect curly quotes", () => {
		assert.ok(UNICODE_SLOP.some((p) => p.test("\u201c")));
	});

	it("should detect zero-width space", () => {
		assert.ok(UNICODE_SLOP.some((p) => p.test("\u200b")));
	});
});

describe("CommentSlop", () => {
	it("should detect section narrators", () => {
		assert.ok(COMMENT_SLOP_PATTERNS[0].test("// Constants"));
	});

	it("should detect educational comments", () => {
		assert.ok(
			COMMENT_SLOP_PATTERNS[1].test("# This is where we handle errors"),
		);
	});

	it("should detect tautological comments", () => {
		assert.ok(COMMENT_SLOP_PATTERNS[2].test("// Get the user"));
	});
});

describe("WorkaroundHard", () => {
	it("should detect let's just", () => {
		assert.ok(
			WORKAROUND_HARD.some((p) =>
				p.test("Actually, let's just use a different approach"),
			),
		);
	});
});

describe("HelperFunctions", () => {
	it("should detect test files", () => {
		assert.ok(isTestFile("test_main.py"));
		assert.ok(isTestFile("main_test.go"));
		assert.ok(isTestFile("main.test.ts"));
		assert.ok(isTestFile("main.spec.js"));
		assert.ok(!isTestFile("main.py"));
		assert.ok(!isTestFile("utils.ts"));
	});

	it("should detect prose files", () => {
		assert.ok(isProseFile("README.md"));
		assert.ok(isProseFile("docs.txt"));
		assert.ok(isProseFile("guide.rst"));
		assert.ok(!isProseFile("main.py"));
		assert.ok(!isProseFile("index.ts"));
	});

	it("should detect meta files", () => {
		assert.ok(isMetaFile("hooks/scripts/pre-bash.py"));
		assert.ok(isMetaFile("agents/athena.md"));
		assert.ok(isMetaFile("skills/review-code/SKILL.md"));
		assert.ok(isMetaFile("CLAUDE.md"));
		assert.ok(!isMetaFile("src/main.py"));
	});
});
