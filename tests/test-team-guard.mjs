import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseHookOutput, runHook } from "./helpers.mjs";

function makeTeamInput() {
	return { tool_name: "TeamCreate", tool_input: { name: "test-team" } };
}

function teamFile(env = {}) {
	const uid = env.USER || process.env.USER || process.env.USERNAME || "unknown";
	const sid = env.CLAUDE_SESSION_ID || "test-session";
	return join(tmpdir(), "cca-teams", `${uid}-${sid}.json`);
}

function cleanup(env = {}) {
	try {
		unlinkSync(teamFile(env));
	} catch {
		// file may not exist
	}
}

describe("TeamGuard", () => {
	const sessionEnv = { CLAUDE_SESSION_ID: "test-session" };

	beforeEach(() => cleanup(sessionEnv));

	it("should allow first TeamCreate when under limit", () => {
		const result = runHook("pre/team-guard.mjs", makeTeamInput(), {
			CCA_MAX_TEAMS: "1",
			...sessionEnv,
		});
		const output = parseHookOutput(result);
		assert.notEqual(result.status, 2);
		if (output?.hookSpecificOutput) {
			assert.notEqual(output.hookSpecificOutput.permissionDecision, "deny");
		}
	});

	it("should block TeamCreate when at limit", () => {
		// First call succeeds
		runHook("pre/team-guard.mjs", makeTeamInput(), {
			CCA_MAX_TEAMS: "1",
			...sessionEnv,
		});
		// Second call should be blocked
		const result = runHook("pre/team-guard.mjs", makeTeamInput(), {
			CCA_MAX_TEAMS: "1",
			...sessionEnv,
		});
		const output = parseHookOutput(result);
		assert.ok(
			result.status !== 0 ||
				output?.hookSpecificOutput?.permissionDecision === "deny",
			"Expected TeamCreate to be denied at limit",
		);
	});

	it("should respect CCA_MAX_TEAMS env var override", () => {
		// Allow 2 teams
		const env = { CCA_MAX_TEAMS: "2", ...sessionEnv };
		runHook("pre/team-guard.mjs", makeTeamInput(), env);
		// Second should still be allowed
		const result = runHook("pre/team-guard.mjs", makeTeamInput(), env);
		const output = parseHookOutput(result);
		assert.notEqual(result.status, 2);
		if (output?.hookSpecificOutput) {
			assert.notEqual(output.hookSpecificOutput.permissionDecision, "deny");
		}
		// Third should be blocked
		const result3 = runHook("pre/team-guard.mjs", makeTeamInput(), env);
		const output3 = parseHookOutput(result3);
		assert.ok(
			result3.status !== 0 ||
				output3?.hookSpecificOutput?.permissionDecision === "deny",
			"Expected TeamCreate to be denied after reaching limit of 2",
		);
	});

	it("should default limit to 1 when env var unset", () => {
		const env = { ...sessionEnv };
		delete env.CCA_MAX_TEAMS;
		// First should pass
		const result = runHook("pre/team-guard.mjs", makeTeamInput(), env);
		assert.notEqual(result.status, 2);
		// Second should block
		const result2 = runHook("pre/team-guard.mjs", makeTeamInput(), env);
		const output2 = parseHookOutput(result2);
		assert.ok(
			result2.status !== 0 ||
				output2?.hookSpecificOutput?.permissionDecision === "deny",
			"Expected TeamCreate to be denied with default limit of 1",
		);
	});

	it("should passthrough non-TeamCreate tools", () => {
		const result = runHook("pre/team-guard.mjs", {
			tool_name: "Bash",
			tool_input: { command: "ls" },
		}, sessionEnv);
		assert.equal(result.status, 0);
	});
});
