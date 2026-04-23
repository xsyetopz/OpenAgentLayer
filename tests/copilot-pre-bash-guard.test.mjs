import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const SCRIPT = "copilot/hooks/scripts/openagentsbtw/pre/bash-guard.mjs";

function run(command) {
	return spawnSync("node", [SCRIPT], {
		input: JSON.stringify({
			tool_name: "bash",
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

describe("copilot pre bash-guard co-author enforcement", () => {
	it("blocks raw detailed git diff and includes the blocked command", () => {
		const result = run("git diff src/index.ts");
		const output = parseOutput(result);
		assert.equal(output?.permissionDecision, "deny");
		assert.match(
			output?.permissionDecisionReason || "",
			/Command: git diff src\/index\.ts/,
		);
	});

	it("allows detailed git diff after an inline preflight", () => {
		const result = run("git diff --name-only && git diff src/index.ts");
		const output = parseOutput(result);
		assert.equal(result.status, 0);
		assert.equal(output?.permissionDecision, undefined);
	});

	it("auto-adds Copilot trailer when git commit is missing one", () => {
		const result = run("git commit -m 'feat: add x'");
		const output = parseOutput(result);
		assert.equal(output?.permissionDecision, "allow");
		assert.match(
			output?.modifiedArgs?.command || "",
			/--trailer 'Co-Authored-By: GitHub Copilot <copilot@github\.com>'$/,
		);
	});

	it("blocks malformed canonical co-author emails", () => {
		const result = run(
			'git commit -m "feat: add x\n\nCo-Authored-By: GPT 5.4 <noreply@openai>"',
		);
		const output = parseOutput(result);
		assert.equal(output?.permissionDecision, "deny");
		assert.match(output?.permissionDecisionReason || "", /noreply@openai\.com/);
	});
});
