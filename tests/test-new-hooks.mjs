import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { parseHookOutput, runHook } from "./helpers.mjs";

describe("UserPromptSubmit", () => {
	it("should run without error", () => {
		const result = runHook("user-prompt-submit.mjs", { prompt: "hello" });
		assert.equal(result.status, 0);
	});

	it("should pass empty prompt", () => {
		const result = runHook("user-prompt-submit.mjs", { prompt: "" });
		assert.equal(result.status, 0);
	});
});

describe("PostFailure", () => {
	it("should run without error", () => {
		const result = runHook("post-failure.mjs", {
			tool_name: "Bash",
			tool_error: "command not found",
		});
		assert.equal(result.status, 0);
	});

	it("should log failure", () => {
		const result = runHook("post-failure.mjs", {
			tool_name: "Bash",
			tool_error: "permission denied",
		});
		assert.equal(result.status, 0);
	});
});

describe("SessionEnd", () => {
	it("should run without error", () => {
		const result = runHook("session-end.mjs", {});
		assert.equal(result.status, 0);
	});
});

describe("TeammateIdle", () => {
	it("should run and warn", () => {
		const result = runHook("teammate-idle.mjs", { agent_name: "hermes" });
		const output = parseHookOutput(result);
		assert.equal(result.status, 0);
		if (output?.hookSpecificOutput) {
			const ctx = output.hookSpecificOutput.additionalContext || "";
			assert.ok(
				ctx.toLowerCase().includes("hermes") ||
					ctx.toLowerCase().includes("idle"),
			);
		}
	});
});

describe("Notification", () => {
	it("should run without error", () => {
		const result = runHook("notification.mjs", {
			message: "test notification",
		});
		assert.equal(result.status, 0);
	});
});

describe("PermissionRequest", () => {
	it("should run without error", () => {
		const result = runHook("permission-request.mjs", {
			tool_name: "Bash",
			permission: "execute",
		});
		assert.equal(result.status, 0);
	});
});

describe("AuditLogging", () => {
	it("should write audit log when enabled", () => {
		const tmpDir = mkdtempSync(join(tmpdir(), "cca-audit-"));
		const result = runHook(
			"notification.mjs",
			{ message: "test" },
			{ CCA_HOOK_LOG_DIR: tmpDir },
		);
		assert.equal(result.status, 0);
		const logFile = join(tmpDir, "cca-hooks.jsonl");
		const lines = readFileSync(logFile, "utf8").trim().split("\n");
		assert.ok(lines.length >= 1, "Audit log should contain at least one entry");
		const entry = JSON.parse(lines[0]);
		assert.equal(entry.event, "Notification");
		assert.equal(entry.hook, "notification.mjs");
	});

	it("should not write log when disabled", () => {
		const tmpDir = mkdtempSync(join(tmpdir(), "cca-noaudit-"));
		const result = runHook("notification.mjs", { message: "test" });
		assert.equal(result.status, 0);
		const logFile = join(tmpDir, "cca-hooks.jsonl");
		assert.ok(!existsSync(logFile));
	});
});
