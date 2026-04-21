import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import {
	AI_PROSE_SLOP,
	COMMENT_SLOP_PATTERNS,
	hasSuppression,
	isCommentLine,
	isMetaFile,
	isProseFile,
	isTestFile,
	matchPlaceholders,
	matchSecrets,
	PII_PATTERNS,
	PLACEHOLDER_EMPTY_BODY,
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

	it("should NOT match JSX key props", () => {
		assert.ok(
			!SECRET_PATTERNS.some((p) => p.test("key={level.name}")),
			"JSX key={...} must not trigger secret detection",
		);
	});

	it("should NOT match Rust token types", () => {
		assert.ok(
			!SECRET_PATTERNS.some((p) => p.test("token: TokenKind::Ident")),
			"Rust token type must not trigger secret detection",
		);
	});

	it("should NOT match bare key assignments", () => {
		assert.ok(
			!SECRET_PATTERNS.some((p) => p.test('key = "some-config-value"')),
			"bare key = must not trigger secret detection",
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
		assert.ok(isMetaFile("skills/review/SKILL.md"));
		assert.ok(isMetaFile("CLAUDE.md"));
		assert.ok(!isMetaFile("src/main.py"));
	});

	it("should detect plan files as meta", () => {
		assert.ok(isMetaFile(".claude/plans/my-plan.md"));
		assert.ok(isMetaFile("/abs/path/.claude/plans/foo.md"));
	});
});

describe("isCommentLine", () => {
	it("should detect comment leaders", () => {
		assert.ok(isCommentLine("// this is a comment"));
		assert.ok(isCommentLine("  # python comment"));
		assert.ok(isCommentLine("/* block comment */"));
		assert.ok(isCommentLine("  -- sql comment"));
		assert.ok(isCommentLine("<!-- html comment -->"));
	});

	it("should NOT match code lines", () => {
		assert.ok(!isCommentLine("const x = temporary;"));
		assert.ok(!isCommentLine('key = "for now"'));
		assert.ok(!isCommentLine("fn placeholder() {}"));
	});
});

describe("matchPlaceholders", () => {
	it("should match hard placeholders on any line", () => {
		const lines = ["const x = 1;", "// FIXME: broken", "return x;"];
		const { hard, soft } = matchPlaceholders("src/foo.ts", lines);
		assert.equal(hard.length, 1);
		assert.equal(soft.length, 0);
	});

	it("should only match soft placeholders in comments", () => {
		const lines = [
			"const temporary = true;",
			"// temporary workaround",
			"return temporary;",
		];
		const { hard, soft } = matchPlaceholders("src/foo.ts", lines);
		assert.equal(hard.length, 0);
		assert.equal(soft.length, 1, "only the comment line should match");
		assert.ok(soft[0].includes(":2:"));
	});

	it("should treat empty function bodies as soft by default", () => {
		const lines = ["function stub() {}", "return 1;"];
		const { hard, soft } = matchPlaceholders("src/foo.ts", lines);
		assert.equal(hard.length, 0, "empty body should not be hard");
		assert.equal(soft.length, 1, "empty body should be soft");
		assert.ok(soft[0].includes("[empty body]"));
	});

	it("should treat empty function bodies as hard when includeEmptyBody is true", () => {
		const lines = ["function stub() {}", "return 1;"];
		const { hard, soft } = matchPlaceholders("src/foo.ts", lines, {
			includeEmptyBody: true,
		});
		assert.equal(hard.length, 1, "empty body should be hard with flag");
		assert.equal(soft.length, 0);
	});

	it("should skip lines with cca-allow suppression", () => {
		const lines = ["// FIXME: known issue // cca-allow", "return x;"];
		const { hard, soft } = matchPlaceholders("src/foo.ts", lines);
		assert.equal(hard.length, 0, "suppressed line should be skipped");
		assert.equal(soft.length, 0);
	});
});

describe("PlaceholderEmptyBody", () => {
	it("should detect empty JS function body", () => {
		assert.ok(PLACEHOLDER_EMPTY_BODY.some((p) => p.test("function stub() {}")));
	});

	it("should detect empty Rust function body", () => {
		assert.ok(
			PLACEHOLDER_EMPTY_BODY.some((p) =>
				p.test("fn process_item(x: &str) -> bool {}"),
			),
		);
	});

	it("should NOT be in PLACEHOLDER_HARD", () => {
		assert.ok(
			!PLACEHOLDER_HARD.some((p) => p.test("function stub() {}")),
			"empty JS body should not be in PLACEHOLDER_HARD",
		);
		assert.ok(
			!PLACEHOLDER_HARD.some((p) => p.test("fn foo() {}")),
			"empty Rust body should not be in PLACEHOLDER_HARD",
		);
	});
});

describe("hasSuppression", () => {
	it("should detect cca-allow in JS comment", () => {
		assert.ok(hasSuppression("// some code // cca-allow"));
	});

	it("should detect cca-allow in Python comment", () => {
		assert.ok(hasSuppression("x = 1  # cca-allow"));
	});

	it("should NOT match without the keyword", () => {
		assert.ok(!hasSuppression("// some normal comment"));
	});
});

describe("matchSecrets", () => {
	it("should detect API key on specific line", () => {
		const lines = [
			"const config = {};",
			'api_key = "sk-proj-abc123def456ghi789jklmnop"',
			"export default config;",
		];
		const hits = matchSecrets("src/config.js", lines);
		assert.equal(hits.length, 1);
		assert.equal(hits[0].line, 2);
		assert.equal(hits[0].file, "src/config.js");
	});

	it("should detect AWS key", () => {
		const lines = ["AKIAIOSFODNN7EXAMPLE"];
		const hits = matchSecrets("config.txt", lines);
		assert.equal(hits.length, 1);
	});

	it("should skip lines with cca-allow", () => {
		const lines = [
			'api_key = "sk-proj-abc123def456ghi789jklmnop" // cca-allow',
		];
		const hits = matchSecrets("src/config.js", lines);
		assert.equal(hits.length, 0, "suppressed line should be skipped");
	});

	it("should NOT match normal code identifiers", () => {
		const lines = [
			"key={level.name}",
			"token: TokenKind::Ident",
			'const color = "0xff0000";',
		];
		const hits = matchSecrets("src/app.jsx", lines);
		assert.equal(hits.length, 0, "normal code should not trigger");
	});
});
