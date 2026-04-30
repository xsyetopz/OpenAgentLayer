import { describe, expect, test } from "bun:test";
import {
	createSyntheticHookPayload,
	evaluateRuntimePolicy,
} from "@openagentlayer/runtime";

describe("OAL runtime policy router", () => {
	test("synthetic hook payload harness covers supported surface shapes", () => {
		const cases = [
			createSyntheticHookPayload({
				command: "git status --short",
				event: "PreToolUse",
				policyId: "destructive-command-guard",
				surface: "codex",
			}),
			createSyntheticHookPayload({
				event: "Stop",
				metadata: { validation: "passed" },
				policyId: "completion-gate",
				surface: "claude",
			}),
			createSyntheticHookPayload({
				event: "tool.execute.before",
				policyId: "destructive-command-guard",
				surface: "opencode",
				toolInput: { cmd: "bun test ./packages" },
			}),
			createSyntheticHookPayload({
				event: "PreToolUse",
				policyId: "secret-path-guard",
				surface: "codex",
			}),
			createSyntheticHookPayload({
				event: "PostToolUse",
				policyId: "placeholder-prototype-guard",
				surface: "claude",
			}),
			createSyntheticHookPayload({
				event: "PreToolUse",
				policyId: "rtk-enforcement-guard",
				surface: "codex",
			}),
			createSyntheticHookPayload({
				event: "Stop",
				policyId: "diff-state-gate",
				surface: "codex",
			}),
			createSyntheticHookPayload({
				event: "PostCompact",
				policyId: "context-budget-guard",
				surface: "claude",
			}),
			createSyntheticHookPayload({
				event: "tool.execute.before",
				policyId: "permission-escalation-guard",
				surface: "opencode",
			}),
			createSyntheticHookPayload({
				event: "session.status",
				policyId: "stale-generated-artifact-guard",
				surface: "opencode",
			}),
		];

		expect(
			cases.map((payload) => evaluateRuntimePolicy(payload).decision),
		).toEqual([
			"allow",
			"allow",
			"allow",
			"allow",
			"allow",
			"allow",
			"allow",
			"context",
			"allow",
			"allow",
		]);
	});

	test("unsupported policy ids use explicit runtime diagnostic identity", () => {
		const decision = evaluateRuntimePolicy({
			event: "PreToolUse",
			policy_id: "missing-policy",
			surface: "codex",
		});

		expect(decision).toMatchObject({
			context: { requested_policy_id: "missing-policy" },
			decision: "warn",
			policy_id: "unsupported-runtime-policy",
		});
		expect(decision.message).toContain("Unsupported runtime policy id");
	});
});
