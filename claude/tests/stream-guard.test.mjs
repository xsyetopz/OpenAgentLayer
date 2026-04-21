import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { parseHookOutput, runHook } from "./helpers.mjs";

describe("StreamGuard PreToolUse", () => {
	const streamEnv = { CCA_STREAM_MODE: "1" };

	it("should passthrough when stream mode is off", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Bash", tool_input: { command: "env" } },
			{ CCA_STREAM_MODE: "" },
		);
		assert.equal(result.status, 0);
		const output = parseHookOutput(result);
		assert.ok(!output?.hookSpecificOutput?.permissionDecision);
	});

	it("should block bare env command", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Bash", tool_input: { command: "env" } },
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});

	it("should block printenv", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Bash", tool_input: { command: "printenv" } },
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});

	it("should block cat .env", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Bash", tool_input: { command: "cat .env" } },
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});

	it("should block source .env", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Bash", tool_input: { command: "source .env.local" } },
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});

	it("should block grep on .env files", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Bash", tool_input: { command: "grep API_KEY .env" } },
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});

	it("should block echo $SECRET_KEY", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Bash", tool_input: { command: "echo $SECRET_KEY" } },
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});

	it("should block reading .env via Read tool", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Read", tool_input: { file_path: "/app/.env" } },
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});

	it("should block reading .pem files", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Read", tool_input: { file_path: "/app/server.pem" } },
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});

	it("should allow safe bash commands", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Bash", tool_input: { command: "ls -la" } },
			streamEnv,
		);
		assert.equal(result.status, 0);
		const output = parseHookOutput(result);
		assert.ok(output?.hookSpecificOutput?.permissionDecision !== "deny");
	});

	it("should allow reading normal files", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{ tool_name: "Read", tool_input: { file_path: "/app/src/index.js" } },
			streamEnv,
		);
		assert.equal(result.status, 0);
		const output = parseHookOutput(result);
		assert.ok(output?.hookSpecificOutput?.permissionDecision !== "deny");
	});

	it("should block command containing secret pattern", () => {
		const result = runHook(
			"pre/stream-guard.mjs",
			{
				tool_name: "Bash",
				tool_input: {
					command:
						'curl -H "Authorization: Bearer sk-ant-abc123def456ghi789jklmno"',
				},
			},
			streamEnv,
		);
		const output = parseHookOutput(result);
		assert.equal(output?.hookSpecificOutput?.permissionDecision, "deny");
	});
});

describe("StreamContext SessionStart", () => {
	it("should passthrough when stream mode is off", () => {
		const result = runHook(
			"session/stream-context.mjs",
			{},
			{ CCA_STREAM_MODE: "" },
		);
		assert.equal(result.status, 0);
		const output = parseHookOutput(result);
		assert.ok(!output?.hookSpecificOutput?.additionalContext);
	});

	it("should inject safety context when streaming", () => {
		const result = runHook(
			"session/stream-context.mjs",
			{},
			{ CCA_STREAM_MODE: "1" },
		);
		const output = parseHookOutput(result);
		const ctx = output?.hookSpecificOutput?.additionalContext || "";
		assert.ok(ctx.includes("STREAMING SAFETY MODE"));
		assert.ok(ctx.includes("NEVER output secret"));
		assert.equal(output?.hookSpecificOutput?.hookEventName, "SessionStart");
	});
});
