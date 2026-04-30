import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasErrors } from "@openagentlayer/diagnostics";
import { loadSourceGraph } from "@openagentlayer/source";
import { validateDocumentation } from "@openagentlayer/source/validate-docs";
import {
	createFixtureRoot,
	graphRecordKeys,
	writeAgent,
	writeCommand,
	writeModelPlan,
	writePolicy,
	writeSkill,
} from "@openagentlayer/testkit";

describe("OAL source validation", () => {
	test("loads valid seed source graph", async () => {
		const result = await loadSourceGraph(process.cwd());

		expect(result.diagnostics).toEqual([]);
		expect(
			result.graph === undefined ? [] : graphRecordKeys(result.graph),
		).toEqual(
			expect.arrayContaining([
				"agent:athena",
				"command:plan",
				"guidance:core",
				"model-plan:claude-max-20",
				"model-plan:claude-max-5",
				"model-plan:codex-plus",
				"model-plan:codex-pro-20",
				"model-plan:codex-pro-5",
				"policy:completion-gate",
				"policy:destructive-command-guard",
				"policy:prompt-context-injection",
				"surface-config:claude-surface-config",
				"surface-config:codex-surface-config",
				"surface-config:opencode-surface-config",
				"skill:review-policy",
			]),
		);
		expect(result.graph?.agents).toHaveLength(21);
		expect(result.graph?.modelPlans).toHaveLength(5);
		expect(result.graph?.surfaceConfigs).toHaveLength(3);
		expect(
			result.graph?.agents.find((record) => record.id === "athena")
				?.prompt_content,
		).toContain("# Athena");
		expect(result.graph?.skills[0]?.body_content).toContain("# Review Policy");
		expect(result.graph?.commands[0]?.prompt_template_content).toContain(
			"# Plan",
		);
	});

	test("fails docs audit for invalid status marker", async () => {
		const root = await createFixtureRoot();
		await mkdir(join(root, "plans"), { recursive: true });
		await writeFile(join(root, "plans/bad.md"), "- [ ] Not done — wrong\n");

		const diagnostics = await validateDocumentation(root);

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-status-marker",
		);
	});

	test("fails docs audit for spec missing top-level link", async () => {
		const root = await createFixtureRoot();
		await mkdir(join(root, "specs"), { recursive: true });
		await writeFile(join(root, "specs/feature.md"), "# Feature\n");

		const diagnostics = await validateDocumentation(root);

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-top-level-spec-link",
		);
	});

	test("fails docs audit for v3 doc missing evidence path", async () => {
		const root = await createFixtureRoot();
		await mkdir(join(root, "docs"), { recursive: true });
		await writeFile(join(root, "docs/v3-study.md"), "# v3\n");

		const diagnostics = await validateDocumentation(root);

		expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-v3-evidence-path",
		);
	});

	test("fails unknown surface", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { surfaces: '["codex", "unknown-surface"]' });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-surface",
		);
	});

	test("fails missing body file", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { prompt: "missing.md" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-body",
		);
	});

	test("fails duplicate IDs", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { id: "duplicate" });
		await writeAgent(root, {
			directory: "agents/duplicate-two",
			id: "duplicate",
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"duplicate-id",
		);
	});

	test("fails unknown route contract", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { routeContract: "mystery-route" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-route-contract",
		);
	});

	test("fails unknown model policy", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, { modelPolicy: "bad-model" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-model-policy",
		);
	});

	test.each([
		"gpt-5.2",
		"gpt-5.3-codex",
	])("accepts managed Codex model id %s", async (modelPolicy) => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, { modelPolicy });

		const result = await loadSourceGraph(root);

		expect(result.diagnostics).toEqual([]);
		expect(result.graph?.skills[0]?.model_policy).toBe(modelPolicy);
	});

	test("fails unknown policy reference", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, { hookPolicies: '["missing-policy"]' });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-policy-reference",
		);
	});

	test("fails invalid policy field types", async () => {
		const root = await createFixtureRoot();
		await writePolicy(root, {
			surfaceEvents: '"Stop"',
			surfaceMappings: '"Stop"',
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-object",
		);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-array",
		);
	});

	test("loads valid model plan records", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root);

		const result = await loadSourceGraph(root);

		expect(result.diagnostics).toEqual([]);
		expect(result.graph?.modelPlans[0]?.role_assignments[0]).toEqual({
			effort: "medium",
			model: "gpt-5.4",
			role: "fixture-agent",
		});
	});

	test("fails invalid model plan model", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { defaultModel: "bad-model" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-model-plan-model",
		);
	});

	test("fails invalid model plan id", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { id: "fixture-plan" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-model-plan-id",
		);
	});

	test("fails invalid model plan effort", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { effort: "ultra" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-model-plan-effort",
		);
	});

	test("fails unknown model plan role assignment", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { assignedRole: "missing-agent" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-role-assignment",
		);
	});

	test("fails duplicate default model plans for one surface", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeModelPlan(root, { defaultPlan: true, id: "codex-plus" });
		await writeModelPlan(root, { defaultPlan: true, id: "codex-pro-5" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"duplicate-default-model-plan",
		);
	});

	test("fails missing surface config", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await rm(join(root, "source/surface-configs/opencode"), {
			force: true,
			recursive: true,
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-surface-config",
		);
	});

	test("fails duplicate surface config", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		const directory = join(root, "source/surface-configs/opencode-copy");
		await mkdir(directory, { recursive: true });
		await writeFile(
			join(directory, "surface-config.toml"),
			[
				'id = "opencode-surface-config-copy"',
				'kind = "surface-config"',
				'title = "OpenCode Surface Config Copy"',
				'description = "Duplicate fixture."',
				'surface = "opencode"',
				'surfaces = ["opencode"]',
				'allowed_key_paths = ["*"]',
				"do_not_emit_key_paths = []",
				"validation_rules = []",
				"",
				"[project_defaults]",
				"",
				"[default_profile]",
				'profile_id = "fixture"',
				'placement = "generated-project-profile"',
				"emitted_key_paths = []",
				'source_url = "fixture"',
				'validation = "fixture"',
				"",
			].join("\n"),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"duplicate-surface-config",
		);
	});

	test("fails agent missing handoff contract", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		const agentPath = `${root}/source/agents/duplicate-one/agent.toml`;
		const source = await Bun.file(agentPath).text();
		await Bun.write(
			agentPath,
			source.replace(
				'handoff_contract = "result-evidence-blockers-files-next-action"\n',
				"",
			),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-handoff-contract",
		);
	});
});
