import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const SCRIPT = "codex/hooks/scripts/pre/bash-guard.mjs";

function run(command) {
	return spawnSync("node", [SCRIPT], {
		input: JSON.stringify({
			tool_name: "Bash",
			tool_input: { command },
		}),
		encoding: "utf8",
	});
}

function parseOutput(result) {
	try {
		return JSON.parse(result.stdout.trim());
	} catch {
		return {};
	}
}

describe("codex pre bash-guard co-author enforcement", () => {
	it("blocks raw detailed git diff and includes the blocked command", () => {
		const result = run("git diff src/index.ts");
		const output = parseOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
		assert.match(
			output?.hookSpecificOutput?.permissionDecisionReason || "",
			/Command: git diff src\/index\.ts/,
		);
	});

	it("allows detailed git diff after an inline preflight", () => {
		const result = run("git diff --stat && git diff src/index.ts");
		const output = parseOutput(result);
		assert.equal(result.status, 0);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, undefined);
	});

	it("blocks git commit when co-author trailer is missing", () => {
		const result = run("git commit -m 'feat: add x'");
		const output = parseOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
		assert.match(
			output?.hookSpecificOutput?.permissionDecisionReason || "",
			/Co-Authored-By trailer is required/,
		);
		assert.match(
			output?.hookSpecificOutput?.permissionDecisionReason || "",
			/Co-Authored-By: Codex <noreply@openai\.com>/,
		);
	});

	it("blocks malformed canonical co-author emails", () => {
		const result = run(
			'git commit -m "feat: add x\n\nCo-Authored-By: GPT 5.4 <noreply@openai>"',
		);
		const output = parseOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
		assert.match(
			output?.hookSpecificOutput?.permissionDecisionReason || "",
			/noreply@openai\.com/,
		);
	});

	it("allows git commit when co-author trailer is already canonical", () => {
		const result = run(
			"git commit --trailer 'Co-Authored-By: GPT 5.4 <noreply@openai.com>' -m 'feat: add x'",
		);
		const output = parseOutput(result);
		assert.equal(result.status, 0);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, undefined);
	});
});
