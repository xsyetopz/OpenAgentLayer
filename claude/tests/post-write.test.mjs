import assert from "node:assert/strict";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseHookOutput, runHook } from "./helpers.mjs";

function makeWriteOutput(filePath, content = "") {
	return { tool_name: "Write", tool_input: { file_path: filePath, content } };
}

describe("PlaceholderDetection", () => {
	it("should detect TODO in written file", () => {
		const content = "def main():\n    # TODO: implement this\n    pass\n";
		const filePath = join(tmpdir(), `test-post-write-${Date.now()}.py`);
		writeFileSync(filePath, content, "utf8");
		try {
			const result = runHook(
				"post/write-quality.mjs",
				makeWriteOutput(filePath, content),
			);
			const output = parseHookOutput(result);
			assert.ok(
				output && Object.keys(output).length > 0,
				"Expected JSON output for TODO detection",
			);
			const hookOut = output.hookSpecificOutput || {};
			const combined =
				(hookOut.permissionDecisionReason || "") +
				(hookOut.additionalContext || "");
			assert.ok(
				combined.toUpperCase().includes("TODO") ||
					combined.toLowerCase().includes("placeholder") ||
					result.status === 2,
			);
		} finally {
			unlinkSync(filePath);
		}
	});

	it("should pass clean file", () => {
		const content = "def add(a: int, b: int) -> int:\n    return a + b\n";
		const filePath = join(tmpdir(), `test-post-write-${Date.now()}.py`);
		writeFileSync(filePath, content, "utf8");
		try {
			const result = runHook(
				"post/write-quality.mjs",
				makeWriteOutput(filePath, content),
			);
			assert.notEqual(result.status, 2);
		} finally {
			unlinkSync(filePath);
		}
	});
});
