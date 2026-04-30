import { describe, expect, test } from "bun:test";
import { loadSourceGraph } from "@openagentlayer/source";
import { graphRecordKeys } from "@openagentlayer/testkit";

describe("OAL source graph", () => {
	test("loads valid seed source graph", async () => {
		const result = await loadSourceGraph(process.cwd());

		expect(result.diagnostics).toEqual([]);
		expect(
			result.graph === undefined ? [] : graphRecordKeys(result.graph),
		).toEqual(
			expect.arrayContaining([
				"agent:athena",
				"agent:chronos",
				"agent:morpheus",
				"agent:prometheus",
				"agent:proteus",
				"command:implement",
				"command:oal-debug",
				"command:oal-explore",
				"command:oal-review",
				"command:oal-test",
				"command:oal-trace",
				"command:plan",
				"command:validate",
				"guidance:core",
				"model-plan:claude-max-20",
				"model-plan:claude-max-5",
				"model-plan:codex-plus",
				"model-plan:codex-pro-20",
				"model-plan:codex-pro-5",
				"policy:completion-gate",
				"policy:destructive-command-guard",
				"policy:failure-circuit",
				"policy:prompt-context-injection",
				"policy:prompt-git-context",
				"policy:protected-branch-confirm",
				"policy:staged-secret-guard",
				"policy:subagent-route-context",
				"policy:write-quality",
				"surface-config:claude-surface-config",
				"surface-config:codex-surface-config",
				"surface-config:opencode-surface-config",
				"skill:caveman",
				"skill:debug",
				"skill:explore",
				"skill:openagentsbtw",
				"skill:review-policy",
				"skill:trace",
				"skill:taste",
			]),
		);
		expect(result.graph?.agents).toHaveLength(25);
		expect(result.graph?.commands).toHaveLength(26);
		expect(result.graph?.policies).toHaveLength(17);
		expect(result.graph?.skills).toHaveLength(35);
		expect(result.graph?.modelPlans).toHaveLength(5);
		expect(result.graph?.surfaceConfigs).toHaveLength(3);
		expect(
			result.graph?.agents.find((record) => record.id === "athena")
				?.prompt_content,
		).toContain("# Athena");
		expect(
			result.graph?.skills.find((record) => record.id === "review-policy")
				?.metadata,
		).toMatchObject({ quality_gate: "warranted-review" });
		expect(
			result.graph?.commands.find((record) => record.id === "plan")
				?.prompt_template_content,
		).toContain("# Plan");
	});
});
