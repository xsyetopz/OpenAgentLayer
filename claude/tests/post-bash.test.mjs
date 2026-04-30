import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { parseHookOutput, runHook } from "./helpers.mjs";

function makeBashOutput(command, toolResponse) {
	return {
		tool_name: "Bash",
		tool_input: { command },
		tool_response: toolResponse,
	};
}

describe("SecretDetection", () => {
	it("should warn on API key in output", () => {
		const result = runHook(
			"post/bash-redact.mjs",
			makeBashOutput(
				"env",
				'API_KEY="sk-abc123def456ghi789jkl012mno345pqr678stu901"',
			),
		);
		const output = parseHookOutput(result);
		assert.ok(
			output && Object.keys(output).length > 0,
			"Expected JSON output with warning",
		);
		const ctx = output.hookSpecificOutput?.additionalContext || "";
		assert.ok(
			ctx.toLowerCase().includes("secret") ||
				ctx.toLowerCase().includes("redact") ||
				ctx.toLowerCase().includes("credential"),
		);
	});

	it("should warn on AWS key in output", () => {
		const result = runHook(
			"post/bash-redact.mjs",
			makeBashOutput("env", "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"),
		);
		const output = parseHookOutput(result);
		assert.ok(
			output && Object.keys(output).length > 0,
			"Expected JSON output with warning",
		);
		const ctx = output.hookSpecificOutput?.additionalContext || "";
		assert.ok(
			ctx.toLowerCase().includes("secret") ||
				ctx.toLowerCase().includes("redact") ||
				ctx.toLowerCase().includes("credential"),
		);
	});
});

describe("CleanOutput", () => {
	it("should pass clean output", () => {
		const result = runHook(
			"post/bash-redact.mjs",
			makeBashOutput("ls", "file1.py\nfile2.py\nfile3.py\n"),
		);
		assert.equal(result.status, 0);
		const output = parseHookOutput(result);
		if (output?.hookSpecificOutput) {
			const ctx = output.hookSpecificOutput.additionalContext || "";
			assert.ok(!ctx.toLowerCase().includes("secret"));
		}
	});
});
