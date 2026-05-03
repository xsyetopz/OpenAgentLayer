import {
	type Artifact,
	type ArtifactSet,
	withProvenance,
} from "@openagentlayer/artifact";
import type { AgentRecord, OalSource, Provider } from "@openagentlayer/source";
import { agentHexColor } from "./agent-colors";
import { agentPrompt, commandMarkdown, instructions } from "./common";
import { renderHookArtifacts } from "./hooks";
import type { RenderOptions } from "./model-routing";
import { resolveClaudeModel } from "./model-routing";
import { renderPrivilegedExecArtifacts } from "./runtime";
import { renderSkillArtifacts } from "./skills";

const PROVIDER: Provider = "claude";

export async function renderClaude(
	source: OalSource,
	repoRoot: string,
	options: RenderOptions = {},
): Promise<ArtifactSet> {
	const artifacts: Artifact[] = [
		withProvenance({
			provider: PROVIDER,
			path: ".claude/settings.json",
			content: JSON.stringify(renderClaudeSettings(source), null, 2),
			sourceId: "config:claude",
			mode: "config",
		}),
	];
	for (const agent of source.agents.filter((record) =>
		record.providers.includes(PROVIDER),
	))
		artifacts.push({
			provider: PROVIDER,
			path: `.claude/agents/${agent.id}.md`,
			content: renderClaudeAgent(agent, source, options),
			sourceId: `agent:${agent.id}`,
			mode: "file",
		});
	for (const skill of source.skills.filter((record) =>
		record.providers.includes(PROVIDER),
	))
		artifacts.push(
			...renderSkillArtifacts(PROVIDER, skill, ".claude/skills", source),
		);
	for (const route of source.routes.filter((record) =>
		record.providers.includes(PROVIDER),
	))
		artifacts.push({
			provider: PROVIDER,
			path: `.claude/commands/${route.id}.md`,
			content: commandMarkdown(route, source),
			sourceId: `route:${route.id}`,
			mode: "file",
		});
	artifacts.push({
		provider: PROVIDER,
		path: "CLAUDE.md",
		content: instructions(source, source.routes, PROVIDER),
		sourceId: "instructions:claude",
		mode: "block",
	});
	artifacts.push(
		...(await renderHookArtifacts(
			PROVIDER,
			source.hooks,
			".claude/hooks/scripts",
			repoRoot,
		)),
	);
	artifacts.push(
		...(await renderPrivilegedExecArtifacts(
			PROVIDER,
			repoRoot,
			".claude/openagentlayer/runtime",
		)),
	);
	return { artifacts, unsupported: [] };
}

function renderClaudeSettings(source: OalSource): unknown {
	return {
		model: "claude-sonnet-4-6",
		permissions: {
			deny: ["Read(.env)", "Read(id_rsa)", "Bash(rm -rf)"],
			ask: ["Bash(git push)", "Bash(chmod)", "Bash(npm publish)"],
			allow: ["Read", "Grep", "Glob"],
		},
		enabledPlugins: {
			"oal@openagentlayer": true,
		},
		extraKnownMarketplaces: {
			openagentlayer: {
				source: {
					source: "directory",
					path: ".claude/plugins/marketplaces/openagentlayer",
				},
			},
		},
		hooks: Object.fromEntries(
			source.hooks.map((hook) => [
				hook.events.claude?.[0] ?? hook.id,
				[
					{
						hooks: [
							{
								type: "command",
								command: `.claude/hooks/scripts/${hook.script}`,
							},
						],
					},
				],
			]),
		),
	};
}

function renderClaudeAgent(
	agent: AgentRecord,
	source: OalSource,
	options: RenderOptions,
): string {
	return `---
name: ${agent.id}
description: ${agent.role}. Use when: ${agent.triggers.join("; ")}
model: ${resolveClaudeModel(agent, options)}
tools: ${agent.tools.join(", ")}
color: "${agentHexColor(agent.id)}"
---

${agentPrompt(agent, source)}
`;
}
