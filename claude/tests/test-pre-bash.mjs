import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseHookOutput, runHook } from "./helpers.mjs";

function makeBashInput(command) {
	return { tool_name: "Bash", tool_input: { command } };
}

describe("BlockedCommands", () => {
	it("should block rm -rf root", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("rm -rf /* "));
		assert.ok(
			result.status === 2 ||
				result.stdout.toLowerCase().includes("block") ||
				result.stdout.toLowerCase().includes("deny"),
		);
	});

	it("should block rm -rf home", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("rm -rf ~/"));
		assert.ok(
			result.status === 2 ||
				result.stdout.toLowerCase().includes("block") ||
				result.stdout.toLowerCase().includes("deny"),
		);
	});

	it("should block blanket git add", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("git add ."));
		assert.ok(
			result.status === 2 ||
				result.stdout.toLowerCase().includes("block") ||
				result.stdout.toLowerCase().includes("deny"),
		);
	});

	it("should block git add -A", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("git add -A"));
		assert.ok(
			result.status === 2 ||
				result.stdout.toLowerCase().includes("block") ||
				result.stdout.toLowerCase().includes("deny"),
		);
	});
});

describe("AllowedCommands", () => {
	it("should allow git status", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("git status"));
		const output = parseHookOutput(result);
		assert.notEqual(result.status, 2);
		if (output?.hookSpecificOutput) {
			assert.notEqual(output.hookSpecificOutput.permissionDecision, "deny");
		}
	});

	it("should allow ls", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("ls -la"));
		assert.notEqual(result.status, 2);
	});

	it("should allow specific git add", () => {
		const result = runHook(
			"pre/bash-guard.mjs",
			makeBashInput("git add src/main.py"),
		);
		assert.notEqual(result.status, 2);
	});

	it("should allow make", () => {
		const result = runHook("pre/bash-guard.mjs", makeBashInput("make test"));
		assert.notEqual(result.status, 2);
	});
});
