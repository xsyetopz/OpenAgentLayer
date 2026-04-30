import { describe, expect, test } from "bun:test";
import type { AdapterBundle } from "@openagentlayer/adapter-contract";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import type {
	CommandRecord,
	PolicyRecord,
	SkillRecord,
	Surface,
} from "@openagentlayer/types";
import {
	artifactContent,
	artifactPaths,
	loadFixtureGraph,
} from "../_helpers/registry";

const SURFACES = ["codex", "claude", "opencode"] as const;

describe("OAL native surface completeness", () => {
	test("renders every source graph record to each declared native surface", async () => {
		const graph = await loadFixtureGraph();
		const registry = createAdapterRegistry();

		for (const surface of SURFACES) {
			const bundle = registry.renderSurfaceBundle(graph, surface);
			const paths = artifactPaths(bundle);

			expect(bundle.diagnostics).toEqual([]);
			for (const agent of graph.agents.filter((record) =>
				record.surfaces.includes(surface),
			)) {
				expect(paths).toContain(agentPath(surface, agent.id));
			}
			for (const command of graph.commands.filter((record) =>
				record.surfaces.includes(surface),
			)) {
				expect(paths).toContain(commandPath(surface, command.id));
				expect(
					missingSupportFiles(
						paths,
						command,
						commandSupportRoot(surface, command),
					),
				).toEqual([]);
			}
			for (const skill of graph.skills.filter((record) =>
				record.surfaces.includes(surface),
			)) {
				expect(paths).toContain(skillPath(surface, skill.id));
				expect(
					missingSupportFiles(paths, skill, skillSupportRoot(surface, skill)),
				).toEqual([]);
			}
			for (const policy of graph.policies.filter((record) =>
				record.surfaces.includes(surface),
			)) {
				expect(paths).toContain(policyRuntimePath(surface, policy));
				expect(paths).toContain(policyMetadataPath(surface, policy.id));
				expect(
					JSON.parse(
						requiredArtifact(bundle, policyMetadataPath(surface, policy.id)),
					),
				).toMatchObject({
					hook_event_category: policy.hook_event_category,
					id: policy.id,
					surface,
				});
			}
		}
	});

	test("manifest artifacts keep source record ownership for every rendered source artifact", async () => {
		const graph = await loadFixtureGraph();
		const bundles = createAdapterRegistry().renderAllBundles(graph);
		const sourceIds = new Set(graph.records.map((record) => record.id));

		for (const bundle of bundles) {
			for (const artifact of bundle.artifacts) {
				if (
					artifact.kind === "config" ||
					artifact.kind === "instruction" ||
					artifact.kind === "plugin"
				) {
					continue;
				}
				expect(artifact.sourceRecordIds.length).toBeGreaterThan(0);
				for (const id of artifact.sourceRecordIds) {
					expect(sourceIds.has(id)).toBe(true);
				}
			}
		}
	});
});

function agentPath(surface: Surface, id: string): string {
	switch (surface) {
		case "codex":
			return `.codex/agents/${id}.toml`;
		case "claude":
			return `.claude/agents/${id}.md`;
		case "opencode":
			return `.opencode/agents/${id}.md`;
		default:
			return assertNever(surface);
	}
}

function commandPath(surface: Surface, id: string): string {
	switch (surface) {
		case "codex":
			return `.codex/openagentlayer/plugin/skills/command-${id}/SKILL.md`;
		case "claude":
			return `.claude/commands/${id}.md`;
		case "opencode":
			return `.opencode/commands/${id}.md`;
		default:
			return assertNever(surface);
	}
}

function commandSupportRoot(surface: Surface, command: CommandRecord): string {
	switch (surface) {
		case "codex":
			return `.codex/openagentlayer/plugin/skills/command-${command.id}`;
		case "claude":
			return `.claude/commands/${command.id}`;
		case "opencode":
			return `.opencode/commands/${command.id}`;
		default:
			return assertNever(surface);
	}
}

function skillPath(surface: Surface, id: string): string {
	switch (surface) {
		case "codex":
			return `.codex/openagentlayer/plugin/skills/${id}/SKILL.md`;
		case "claude":
			return `.claude/skills/${id}/SKILL.md`;
		case "opencode":
			return `.opencode/skills/${id}/SKILL.md`;
		default:
			return assertNever(surface);
	}
}

function skillSupportRoot(surface: Surface, skill: SkillRecord): string {
	switch (surface) {
		case "codex":
			return `.codex/openagentlayer/plugin/skills/${skill.id}`;
		case "claude":
			return `.claude/skills/${skill.id}`;
		case "opencode":
			return `.opencode/skills/${skill.id}`;
		default:
			return assertNever(surface);
	}
}

function policyRuntimePath(surface: Surface, policy: PolicyRecord): string {
	const runtimePath = policy.runtime_script ?? `runtime/${policy.id}.mjs`;
	switch (surface) {
		case "codex":
			return `.codex/openagentlayer/${runtimePath}`;
		case "claude":
			return `.claude/openagentlayer/${runtimePath}`;
		case "opencode":
			return `.opencode/openagentlayer/${runtimePath}`;
		default:
			return assertNever(surface);
	}
}

function policyMetadataPath(surface: Surface, id: string): string {
	switch (surface) {
		case "codex":
			return `.codex/openagentlayer/policies/${id}.json`;
		case "claude":
			return `.claude/openagentlayer/policies/${id}.json`;
		case "opencode":
			return `.opencode/openagentlayer/policies/${id}.json`;
		default:
			return assertNever(surface);
	}
}

function missingSupportFiles(
	paths: readonly string[],
	record: CommandRecord | SkillRecord,
	root: string,
): readonly string[] {
	return record.support_files
		.map((support) => `${root}/${support.path}`)
		.filter((path) => !paths.includes(path));
}

function requiredArtifact(bundle: AdapterBundle, path: string): string {
	const content = artifactContent(bundle, path);
	if (content === undefined) {
		throw new Error(`Missing artifact ${path}`);
	}
	return content;
}

function assertNever(value: never): never {
	throw new Error(`Unsupported surface ${String(value)}`);
}
