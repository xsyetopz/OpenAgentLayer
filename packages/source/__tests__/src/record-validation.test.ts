import { describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasErrors } from "@openagentlayer/diagnostics";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeCommand,
	writePolicy,
	writeSkill,
} from "@openagentlayer/testkit";

describe("OAL source record validation", () => {
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

	test("loads full Agent Skills metadata", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, { supportFile: "references/guide.md" });
		await mkdir(join(root, "source/skills/fixture-skill/references"), {
			recursive: true,
		});
		await writeFile(
			join(root, "source/skills/fixture-skill/references/guide.md"),
			"# Guide\n",
		);

		const result = await loadSourceGraph(root);

		expect(result.diagnostics).toEqual([]);
		expect(result.graph?.skills[0]).toMatchObject({
			allowed_tools: ["read", "search"],
			compatibility: "Codex, Claude, and OpenCode skill surfaces.",
			license: "MIT",
			metadata: { origin: "fixture" },
			supporting_files: ["references/guide.md"],
		});
	});

	test("fails invalid Agent Skills name", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, { directory: "skills/bad-name", id: "Bad_Name" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-agent-skill-name",
		);
	});

	test("fails skill directory mismatch", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, {
			directory: "skills/different-directory",
			id: "fixture-skill",
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"skill-directory-mismatch",
		);
	});

	test("fails unnecessary full-skill wrapper names", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, { id: "full-skill" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unnecessary-skill-wrapper",
		);
	});

	test("fails imported skills without attribution", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		const skillPath = `${root}/source/skills/fixture-skill/skill.toml`;
		const source = await Bun.file(skillPath).text();
		await Bun.write(
			skillPath,
			source.replace(
				'metadata = { origin = "fixture" }',
				'metadata = { origin = "openagentlayer-vendor" }',
			),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-imported-skill-attribution",
		);
	});

	test("fails skill records that still cite v3 evidence as active source", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		const skillPath = `${root}/source/skills/fixture-skill/skill.toml`;
		const source = await Bun.file(skillPath).text();
		await Bun.write(
			skillPath,
			source.replace(
				'metadata = { origin = "fixture" }',
				'metadata = { origin = "fixture", source_package = "v3-evidence" }',
			),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"copied-v3-skill-source",
		);
	});

	test("loads third-party-backed upstream skill body and support files", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		await mkdir(join(root, "third_party/upstream-skill/reference"), {
			recursive: true,
		});
		await writeFile(
			join(root, "third_party/upstream-skill/SKILL.md"),
			[
				"# Upstream Skill",
				"",
				"Use this upstream skill for third-party-backed tests.",
				"",
				"## Procedure",
				"",
				"- Read upstream body.",
				"- Render mapped support files.",
				"",
			].join("\n"),
		);
		await writeFile(
			join(root, "third_party/upstream-skill/reference/guide.md"),
			"# Upstream Guide\n",
		);
		await writeFile(
			join(root, "source/skills/fixture-skill/skill.toml"),
			upstreamFixtureSkillToml({
				supportSource: "third_party/upstream-skill/reference/guide.md",
				supportTarget: "references/guide.md",
			}),
		);

		const result = await loadSourceGraph(root);

		expect(result.diagnostics).toEqual([]);
		expect(result.graph?.skills[0]?.body_content).toContain("# Upstream Skill");
		expect(result.graph?.skills[0]?.support_files).toContainEqual(
			expect.objectContaining({
				content: "# Upstream Guide\n",
				path: "references/guide.md",
			}),
		);
	});

	test("fails upstream body paths outside third_party", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		await writeFile(
			join(root, "source/skills/fixture-skill/skill.toml"),
			upstreamFixtureSkillToml({
				body: "source/skills/fixture-skill/SKILL.md",
			}),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-upstream-source-path",
		);
	});

	test("fails upstream support sources outside third_party", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		await mkdir(join(root, "third_party/upstream-skill"), { recursive: true });
		await writeFile(
			join(root, "third_party/upstream-skill/SKILL.md"),
			"# Upstream Skill\n\n## Procedure\n\n- Use third-party body.\n",
		);
		await writeFile(
			join(root, "source/skills/fixture-skill/skill.toml"),
			upstreamFixtureSkillToml({
				supportSource: "source/skills/fixture-skill/SKILL.md",
				supportTarget: "references/guide.md",
			}),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-upstream-source-path",
		);
	});

	test("fails upstream support targets escaping skill directory", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		await mkdir(join(root, "third_party/upstream-skill"), { recursive: true });
		await writeFile(
			join(root, "third_party/upstream-skill/SKILL.md"),
			"# Upstream Skill\n\n## Procedure\n\n- Use third-party body.\n",
		);
		await writeFile(
			join(root, "third_party/upstream-skill/guide.md"),
			"# Guide\n",
		);
		await writeFile(
			join(root, "source/skills/fixture-skill/skill.toml"),
			upstreamFixtureSkillToml({
				supportSource: "third_party/upstream-skill/guide.md",
				supportTarget: "../guide.md",
			}),
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-skill-support-file",
		);
	});

	test("fails overlong Agent Skills text fields", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, {
			compatibility: "c".repeat(501),
			description: "d".repeat(1_025),
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"agent-skill-description-too-long",
		);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"agent-skill-compatibility-too-long",
		);
	});

	test("fails barebones skill body", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		await writeFile(
			join(root, "source/skills/fixture-skill/SKILL.md"),
			"# Skill\n\nOne line.\n",
		);

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"barebones-skill-body",
		);
	});

	test("fails missing skill support file", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, {
			createSupportFile: false,
			supportFile: "missing.md",
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-skill-support-file",
		);
	});

	test("fails escaping skill support file", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root, { supportFile: "../escape.md" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-skill-support-file",
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

	test("loads rich command metadata and support files", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeSkill(root);
		await writeCommand(root, {
			requiredSkills: '["fixture-skill"]',
			supportFile: "references/command.md",
		});

		const result = await loadSourceGraph(root);

		expect(result.diagnostics).toEqual([]);
		expect(result.graph?.commands[0]).toMatchObject({
			argument_schema: { objective: "string" },
			examples: [
				{
					invocation: "fixture-command demo",
					notes: "Exercises command metadata.",
					title: "Fixture route",
				},
			],
			required_skills: ["fixture-skill"],
			support_files: [
				{
					content: "support\n",
					path: "references/command.md",
				},
			],
		});
	});

	test("loads agent command and policy affinities", async () => {
		const root = await createFixtureRoot();
		await writeSkill(root);
		await writePolicy(root);
		await writeAgent(root, {
			commands: '["fixture-command"]',
			policies: '["fixture-policy"]',
		});
		await writeCommand(root);

		const result = await loadSourceGraph(root);

		expect(result.diagnostics).toEqual([]);
		expect(result.graph?.agents[0]).toMatchObject({
			commands: ["fixture-command"],
			policies: ["fixture-policy"],
			skills: [],
		});
	});

	test("fails unknown agent command affinity", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { commands: '["missing-command"]' });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-agent-command-reference",
		);
	});

	test("fails unknown agent policy affinity", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, { policies: '["missing-policy"]' });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-agent-policy-reference",
		);
	});

	test("fails invalid command id", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, { directory: "commands/bad", id: "Bad_Command" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-command-id",
		);
	});

	test("fails command directory mismatch", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, {
			directory: "commands/different-command",
			id: "fixture-command",
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"command-directory-mismatch",
		);
	});

	test("fails unsupported command aliases", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, {
			aliases: '["fixture"]',
			surfaceOverrides: '{ codex = { aliases = ["fixture"] } }',
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unsupported-command-alias",
		);
	});

	test("fails missing and escaping command support files", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, {
			createSupportFile: false,
			supportFile: "missing.md",
		});
		await writeCommand(root, {
			directory: "commands/escaping-command",
			id: "escaping-command",
			supportFile: "../escape.md",
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-command-support-file",
		);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-command-support-file",
		);
	});

	test("fails unknown required command skill", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, { requiredSkills: '["missing-skill"]' });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unknown-required-skill",
		);
	});

	test("fails side-effect command without hook policy", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, { sideEffectLevel: "write" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"side-effect-command-missing-hook",
		);
	});

	test("fails command arguments without placeholders", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, {
			promptBody:
				"# Command\n\nRoute through fixture agent.\n\n## Procedure\n\n- Return evidence.\n",
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"unused-command-arguments",
		);
	});

	test("fails recovered commands that still use generic scaffold prose", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root);
		await writeCommand(root, {
			promptBody: [
				"# Command",
				"",
				"Route $ARGUMENTS through fixture agent.",
				"",
				"## Procedure",
				"",
				"- Inspect current repository state and source records before deciding action.",
				"- Return evidence.",
				"",
			].join("\n"),
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"generic-command-body",
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

	test("fails unknown hook event category", async () => {
		const root = await createFixtureRoot();
		await writePolicy(root, { hookEventCategory: "unknown_event" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-hook-event-category",
		);
	});

	test("fails hook mapping outside declared event category", async () => {
		const root = await createFixtureRoot();
		await writePolicy(root, {
			hookEventCategory: "pre_tool",
			surfaceMappings: '{ codex = "Stop" }',
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"invalid-hook-surface-event",
		);
	});

	test("fails policy surface without hook mapping", async () => {
		const root = await createFixtureRoot();
		await writePolicy(root, {
			surfaces: '["codex", "claude"]',
		});

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"missing-hook-surface-mapping",
		);
	});

	test("fails deterministic policy without runtime script", async () => {
		const root = await createFixtureRoot();
		await writePolicy(root, { runtimeScript: "" });

		const result = await loadSourceGraph(root);

		expect(hasErrors(result.diagnostics)).toBe(true);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
			"runtime-policy-missing-script",
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

function upstreamFixtureSkillToml(
	options: {
		readonly body?: string;
		readonly supportSource?: string;
		readonly supportTarget?: string;
	} = {},
): string {
	const lines = [
		'id = "fixture-skill"',
		'kind = "skill"',
		'title = "Fixture Skill"',
		'description = "Fixture skill with complete procedural guidance."',
		'body = "SKILL.md"',
		'license = "MIT"',
		'compatibility = "Codex, Claude, and OpenCode skill surfaces."',
		'allowed_tools = ["read", "search"]',
		'invocation_mode = "manual-or-route"',
		"user_invocable = true",
		'model_policy = "gpt-5.4"',
		"supporting_files = []",
		'surfaces = ["codex"]',
		"",
		"[metadata]",
		'origin = "openagentlayer-upstream"',
		'source_package = "fixture-upstream"',
		'upstream_name = "fixture-upstream"',
		"",
		"[upstream]",
		`body = "${options.body ?? "third_party/upstream-skill/SKILL.md"}"`,
		'package = "fixture-upstream"',
		'repository = "https://example.test/fixture-upstream"',
		'commit = "fixture-commit"',
	];
	if (
		options.supportSource !== undefined &&
		options.supportTarget !== undefined
	) {
		lines.push(
			"",
			"[[upstream.support_files]]",
			`source = "${options.supportSource}"`,
			`target = "${options.supportTarget}"`,
			'category = "reference"',
		);
	}
	return `${lines.join("\n")}\n`;
}
