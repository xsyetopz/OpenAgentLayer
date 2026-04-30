import { describe, expect, test } from "bun:test";
import { evaluateRuntimePolicy } from "@openagentlayer/runtime";
import { runRuntimeScript } from "../_helpers/runtime";

describe("OAL recovered v3 runtime policies", () => {
	test("protected branch confirmation blocks unconfirmed mutation", () => {
		expect(
			evaluateRuntimePolicy({
				command: "git push origin main",
				metadata: { branch: "main" },
				policy_id: "protected-branch-confirm",
				surface: "codex",
			}).decision,
		).toBe("deny");
	});

	test("prompt git and subagent context return context decisions", () => {
		expect(
			evaluateRuntimePolicy({
				metadata: { branch: "master", dirty: true },
				policy_id: "prompt-git-context",
				surface: "codex",
			}).decision,
		).toBe("context");
		expect(
			evaluateRuntimePolicy({
				policy_id: "subagent-route-context",
				route: "review",
				surface: "opencode",
			}).decision,
		).toBe("context");
	});

	test("write and staged secret guards deny unsafe output", () => {
		expect(
			evaluateRuntimePolicy({
				metadata: { content: "TODO: implement later" },
				policy_id: "write-quality",
				surface: "claude",
			}).decision,
		).toBe("deny");
		expect(
			evaluateRuntimePolicy({
				metadata: { diff: "API_KEY=secret-value" },
				policy_id: "staged-secret-guard",
				surface: "codex",
			}).decision,
		).toBe("deny");
	});

	test("failure circuit warns after repeated failures", () => {
		expect(
			evaluateRuntimePolicy({
				metadata: { recent_failures: 3 },
				policy_id: "failure-circuit",
				surface: "claude",
			}).decision,
		).toBe("warn");
	});

	test.each([
		[
			"failure-circuit",
			{ metadata: { recent_failures: 3 }, surface: "claude" },
			"warn",
		],
		[
			"prompt-git-context",
			{ metadata: { branch: "main", dirty: true }, surface: "codex" },
			"context",
		],
		[
			"protected-branch-confirm",
			{
				command: "git push origin main",
				metadata: { branch: "main" },
				surface: "codex",
			},
			"deny",
		],
		[
			"staged-secret-guard",
			{ metadata: { diff: "API_KEY=secret-value" }, surface: "codex" },
			"deny",
		],
		[
			"subagent-route-context",
			{ route: "review", surface: "opencode" },
			"context",
		],
		[
			"write-quality",
			{ metadata: { content: "TODO: later" }, surface: "claude" },
			"deny",
		],
	] as const)("%s router decision matches rendered runtime script", async (policyId, payload, expectedDecision) => {
		const routerDecision = evaluateRuntimePolicy({
			...payload,
			policy_id: policyId,
		});
		const scriptResult = await runRuntimeScript(
			policyId,
			JSON.stringify(payload),
		);
		const scriptDecision = JSON.parse(scriptResult.stdout);

		expect(routerDecision).toMatchObject({
			decision: expectedDecision,
			policy_id: policyId,
		});
		expect(scriptDecision).toMatchObject({
			decision: expectedDecision,
			policy_id: policyId,
		});
		expect(scriptResult.exitCode === 0).toBe(expectedDecision !== "deny");
	});
});
