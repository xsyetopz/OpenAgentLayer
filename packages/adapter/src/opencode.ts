import {
	type Artifact,
	type ArtifactSet,
	withProvenance,
} from "@openagentlayer/artifact";
import type {
	AgentRecord,
	OalSource,
	Provider,
	ToolRecord,
} from "@openagentlayer/source";
import { agentHexColor } from "./agent-colors";
import {
	agentPrompt,
	camelCase,
	commandMarkdown,
	instructions,
	quoteToml,
} from "./common";
import { renderHookArtifacts } from "./hooks";
import { renderPrivilegedExecArtifacts } from "./runtime";
import { renderSkillArtifacts } from "./skills";

const PROVIDER: Provider = "opencode";
export const OPENCODE_MODEL_FALLBACKS = [
	"opencode/nemotron-3-super-free",
	"opencode/minimax-m2.5-free",
	"opencode/hy3-preview-free",
	"opencode/big-pickle",
] as const;

export async function renderOpenCode(
	source: OalSource,
	repoRoot: string,
): Promise<ArtifactSet> {
	const artifacts: Artifact[] = [
		withProvenance({
			provider: PROVIDER,
			path: "opencode.jsonc",
			content: JSON.stringify(renderOpenCodeConfig(source), null, 2),
			sourceId: "config:opencode",
			mode: "config",
		}),
	];
	for (const agent of source.agents.filter((record) =>
		record.providers.includes(PROVIDER),
	))
		artifacts.push({
			provider: PROVIDER,
			path: `.opencode/agents/${agent.id}.md`,
			content: renderOpenCodeAgent(agent, source),
			sourceId: `agent:${agent.id}`,
			mode: "file",
		});
	for (const route of source.routes.filter((record) =>
		record.providers.includes(PROVIDER),
	))
		artifacts.push({
			provider: PROVIDER,
			path: `.opencode/commands/${route.id}.md`,
			content: commandMarkdown(route, source),
			sourceId: `route:${route.id}`,
			mode: "file",
		});
	for (const skill of source.skills.filter((record) =>
		record.providers.includes(PROVIDER),
	))
		artifacts.push(
			...renderSkillArtifacts(PROVIDER, skill, ".opencode/skills", source),
		);
	for (const tool of source.tools.filter(
		(record) => record.provider === PROVIDER,
	))
		artifacts.push({
			provider: PROVIDER,
			path: `.opencode/tools/${tool.id}.ts`,
			content: renderOpenCodeTool(tool),
			sourceId: `tool:${tool.id}`,
			mode: "file",
		});
	artifacts.push({
		provider: PROVIDER,
		path: ".opencode/plugins/openagentlayer.ts",
		content: renderOpenCodePlugin(source),
		sourceId: "plugin:opencode",
		mode: "file",
	});
	artifacts.push({
		provider: PROVIDER,
		path: ".opencode/instructions/openagentlayer.md",
		content: instructions(source, source.routes, PROVIDER),
		sourceId: "instructions:opencode",
		mode: "file",
	});
	artifacts.push(
		...(await renderHookArtifacts(
			PROVIDER,
			source.hooks,
			".opencode/openagentlayer/hooks",
			repoRoot,
		)),
	);
	artifacts.push(
		...(await renderPrivilegedExecArtifacts(
			PROVIDER,
			repoRoot,
			".opencode/openagentlayer/runtime",
		)),
	);
	return { artifacts, unsupported: [] };
}

function renderOpenCodeConfig(source: OalSource): unknown {
	return {
		$schema: "https://opencode.ai/config.json",
		model: OPENCODE_MODEL_FALLBACKS[0],
		small_model: OPENCODE_MODEL_FALLBACKS[1],
		model_fallbacks: OPENCODE_MODEL_FALLBACKS,
		default_agent: "hephaestus",
		instructions: [".opencode/instructions/openagentlayer.md"],
		plugin: [".opencode/plugins/openagentlayer.ts"],
		permission: {
			read: "allow",
			grep: "allow",
			list: "allow",
			bash: "ask",
			edit: "ask",
			write: "ask",
		},
		agent: Object.fromEntries(
			source.agents.map((agent) => [
				agent.id,
				{
					description: agent.role,
					model: agent.models.opencode ?? OPENCODE_MODEL_FALLBACKS[0],
					color: agentHexColor(agent.id),
					permission: agent.tools.includes("write")
						? { edit: "ask", write: "ask", bash: "ask" }
						: { edit: "deny", write: "deny", bash: "ask" },
				},
			]),
		),
		command: Object.fromEntries(
			source.routes.map((route) => [
				route.id,
				{ agent: route.agent, description: route.body.slice(0, 120) },
			]),
		),
	};
}

function renderOpenCodeAgent(agent: AgentRecord, source: OalSource): string {
	return `---
color: "${agentHexColor(agent.id)}"
---
# ${agent.name}

${agentPrompt(agent, source)}
`;
}

function renderOpenCodeTool(tool: ToolRecord): string {
	return `import { tool } from "@opencode-ai/plugin";

export const ${camelCase(tool.id)} = tool({
	description: ${quoteToml(tool.description)},
	args: {},
	async execute() {
		return {
			output: ${quoteToml(tool.body)}
		};
	}
});
`;
}

function renderOpenCodePlugin(source: OalSource): string {
	return `import type { Plugin } from "@opencode-ai/plugin";

const OpenAgentLayerPlugin: Plugin = async () => ({
	"tool.execute.before": async (input, output) => {
		if (input.tool === "bash") {
			output.metadata = {
				...(output.metadata ?? {}),
				openagentlayer: "Guard hooks are installed under .opencode/openagentlayer/hooks",
			};
		}
	},
});

export default OpenAgentLayerPlugin;
export const hookScripts = ${JSON.stringify(source.hooks.map((hook) => hook.script))};
`;
}
