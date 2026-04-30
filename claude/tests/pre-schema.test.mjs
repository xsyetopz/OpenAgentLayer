import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { parseHookOutput, runHook } from "./helpers.mjs";

describe("WriteValidation", () => {
	it("should allow absolute path write", () => {
		const result = runHook("pre/validate-input.mjs", {
			tool_name: "Write",
			tool_input: { file_path: "/tmp/test.py", content: "print('hello')" },
		});
		assert.notEqual(result.status, 2);
	});

	it("should block empty content write", () => {
		const result = runHook("pre/validate-input.mjs", {
			tool_name: "Write",
			tool_input: { file_path: "/tmp/test.py", content: "" },
		});
		const output = parseHookOutput(result);
		assert.ok(
			output && Object.keys(output).length > 0,
			"Expected JSON output for empty content denial",
		);
		const decision = output.hookSpecificOutput?.permissionDecision;
		assert.equal(decision, "deny");
	});
});

describe("EditValidation", () => {
	it("should allow valid edit", () => {
		const result = runHook("pre/validate-input.mjs", {
			tool_name: "Edit",
			tool_input: {
				file_path: "/tmp/test.py",
				old_string: "foo",
				new_string: "bar",
			},
		});
		assert.notEqual(result.status, 2);
	});

	it("should block same-string edit", () => {
		const result = runHook("pre/validate-input.mjs", {
			tool_name: "Edit",
			tool_input: {
				file_path: "/tmp/test.py",
				old_string: "foo",
				new_string: "foo",
			},
		});
		const output = parseHookOutput(result);
		assert.ok(
			output && Object.keys(output).length > 0,
			"Expected JSON output for no-op edit denial",
		);
		const decision = output.hookSpecificOutput?.permissionDecision;
		assert.equal(decision, "deny");
	});
});

describe("BashValidation", () => {
	it("should allow non-empty command", () => {
		const result = runHook("pre/validate-input.mjs", {
			tool_name: "Bash",
			tool_input: { command: "echo hello" },
		});
		assert.notEqual(result.status, 2);
	});

	it("should block empty command", () => {
		const result = runHook("pre/validate-input.mjs", {
			tool_name: "Bash",
			tool_input: { command: "" },
		});
		const output = parseHookOutput(result);
		assert.ok(
			output && Object.keys(output).length > 0,
			"Expected JSON output for empty command denial",
		);
		const decision = output.hookSpecificOutput?.permissionDecision;
		assert.equal(decision, "deny");
	});
});
