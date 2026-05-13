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
			content: JSON.stringify(renderClaudeSettings(source), undefined, 2),
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
		attribution: {
			commit:
				"Generated with Claude Code\n\nCo-authored-by: Claude <noreply@anthropic.com>",
			pr: "",
		},
		extraKnownMarketplaces: {
			openagentlayer: {
				source: {
					source: "directory",
					path: ".claude/plugins/marketplaces/openagentlayer",
				},
			},
		},
		hooks: renderClaudeHooks(source),
	};
}

function renderClaudeHooks(source: OalSource): Record<string, unknown[]> {
	const hooks: Record<string, unknown[]> = {};
	for (const hook of source.hooks) {
		for (const event of hook.events.claude ?? []) {
			hooks[event] ??= [];
			hooks[event].push({
				hooks: [
					{
						type: "command",
						command: `OAL_HOOK_PROVIDER=claude OAL_HOOK_EVENT=${event} .claude/hooks/scripts/${hook.script}`,
					},
				],
			});
		}
	}
	return hooks;
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
tools: ${claudeTools(agent).join(", ")}
color: "${agentHexColor(agent.id)}"
---

${agentPrompt(agent, source)}
`;
}

function claudeTools(agent: AgentRecord): string[] {
	const tools = new Set<string>();
	for (const tool of agent.tools) {
		for (const claudeTool of claudeToolNames(tool)) tools.add(claudeTool);
	}
	if (delegationCapable(agent)) tools.add("Task");
	return [...tools];
}

function claudeToolNames(tool: string): string[] {
	switch (tool) {
		case "read":
			return ["Read"];
		case "search":
			return ["Grep", "Glob"];
		case "shell":
			return ["Bash"];
		case "write":
			return ["Edit", "MultiEdit", "Write"];
		case "patch":
			return ["Edit", "MultiEdit"];
		default:
			return [tool];
	}
}

function delegationCapable(agent: AgentRecord): boolean {
	return (
		agent.routes.includes("orchestrate") ||
		agent.routes.includes("implementation") ||
		agent.routes.includes("planning") ||
		agent.routes.includes("exploration") ||
		agent.routes.includes("tracing") ||
		agent.routes.includes("validate") ||
		agent.routes.includes("testing") ||
		agent.routes.includes("review") ||
		agent.routes.includes("documentation") ||
		agent.routes.includes("plain-language-writing")
	);
}
