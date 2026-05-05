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
import type { RenderOptions } from "./model-routing";
import { OPENCODE_FREE_MODELS, resolveOpenCodeModel } from "./model-routing";
import { renderPrivilegedExecArtifacts } from "./runtime";
import { renderSkillArtifacts } from "./skills";

const PROVIDER: Provider = "opencode";
export const OPENCODE_MODEL_FALLBACKS = [...OPENCODE_FREE_MODELS] as const;

export async function renderOpenCode(
	source: OalSource,
	repoRoot: string,
	options: RenderOptions = {},
): Promise<ArtifactSet> {
	const artifacts: Artifact[] = [
		withProvenance({
			provider: PROVIDER,
			path: "opencode.jsonc",
			content: JSON.stringify(
				renderOpenCodeConfig(source, options),
				undefined,
				2,
			),
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

function renderOpenCodeConfig(
	source: OalSource,
	options: RenderOptions,
): unknown {
	return {
		$schema: "https://opencode.ai/config.json",
		model: OPENCODE_MODEL_FALLBACKS[0],
		small_model: OPENCODE_MODEL_FALLBACKS[1],
		default_agent: "hephaestus",
		instructions: [".opencode/instructions/openagentlayer.md"],
		plugin: ["./.opencode/plugins/openagentlayer.ts"],
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
					model: resolveOpenCodeModel(agent, options),
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
				{
					template: route.body,
					agent: route.agent,
					description: route.body.slice(0, 120),
				},
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
	if (tool.id === "command_policy_check") return renderCommandPolicyTool(tool);
	if (tool.id === "rtk_report") return renderRtkReportTool(tool);
	if (tool.id === "provider_surface_map")
		return renderProviderSurfaceMapTool(tool);
	return `import { tool } from "@opencode-ai/plugin";

export const ${camelCase(tool.id)} = tool({
	description: ${quoteToml(tool.description)},
	args: {},
	async execute() {
		return ${quoteToml(tool.body)};
	}
});
`;
}

function renderCommandPolicyTool(tool: ToolRecord): string {
	return `import { tool } from "@opencode-ai/plugin";
import { evaluateCommandPolicy } from "../openagentlayer/hooks/_command-policy.mjs";
import { bunRewrite } from "../openagentlayer/hooks/_bun-rewrite.mjs";

export const ${camelCase(tool.id)} = tool({
	description: ${quoteToml(tool.description)},
	args: {
		command: tool.schema.string().describe("Shell command to evaluate")
	},
	async execute(args) {
		const result = evaluateCommandPolicy(args.command, {
			bunRewrite,
			rtkInstalled: true,
			rtkPolicyPresent: true
		});
		return JSON.stringify(result);
	}
});
`;
}

function renderRtkReportTool(tool: ToolRecord): string {
	return `import { tool } from "@opencode-ai/plugin";

export const ${camelCase(tool.id)} = tool({
	description: ${quoteToml(tool.description)},
	args: {
		project: tool.schema.string().optional().describe("Project directory; defaults to process cwd")
	},
	async execute(args) {
		const project = args.project ?? process.cwd();
		return [
			"Run this command for the project-scoped RTK report:",
			\`oal rtk-report --project "\${project}"\`,
			"Use the output to replace proxy/fallback leaks with native RTK filters."
		].join("\\n");
	}
});
`;
}

function renderProviderSurfaceMapTool(tool: ToolRecord): string {
	return `import { tool } from "@opencode-ai/plugin";

export const ${camelCase(tool.id)} = tool({
	description: ${quoteToml(tool.description)},
	args: {},
	async execute() {
		return [
			"codex: .codex/config.toml, AGENTS.md, .codex/agents/*.toml, .codex/openagentlayer/hooks/*.mjs",
			"claude: .claude/settings.json, CLAUDE.md, .claude/agents/*.md, .claude/commands/*.md, .claude/skills/*/SKILL.md, .claude/hooks/scripts/*.mjs",
			"opencode: opencode.jsonc, .opencode/agents/*.md, .opencode/commands/*.md, .opencode/tools/*.ts, .opencode/plugins/openagentlayer.ts, .opencode/skills/*/SKILL.md"
		].join("\\n");
	}
});
`;
}

function renderOpenCodePlugin(source: OalSource): string {
	const hookScripts = JSON.stringify(source.hooks.map((hook) => hook.script));
	return `import type { Plugin } from "@opencode-ai/plugin";
import { evaluateCommandPolicy } from "../openagentlayer/hooks/_command-policy.mjs";
import { bunRewrite } from "../openagentlayer/hooks/_bun-rewrite.mjs";
import { evaluateDestructiveCommand, evaluateUnsafeGit } from "../openagentlayer/hooks/_command-safety.mjs";
import { evaluateFailureLoop } from "../openagentlayer/hooks/_failure-loop.mjs";
import { styleHookLines, styleHookMessage } from "../openagentlayer/hooks/_hook-style.mjs";
import { evaluateSecretGuard } from "../openagentlayer/hooks/_secret-guard.mjs";

function commandArg(output: { args?: Record<string, unknown> }) {
	const command = output.args?.command;
	return typeof command === "string" ? command : "";
}

function blockIfNeeded(result: { decision?: string; reason?: string; details?: unknown[] }) {
	if (result.decision === "block")
		throw new Error([
			styleHookMessage("error", result.reason ?? "OpenAgentLayer hook blocked."),
			...styleHookLines("note", result.details ?? [])
		].join("\\n"));
}

function replacementFrom(details: unknown) {
	if (!Array.isArray(details)) return "";
	const line = details.find((item) => typeof item === "string" && item.startsWith("Use: "));
	return typeof line === "string" ? line.slice("Use: ".length) : "";
}

export const OpenAgentLayerPlugin: Plugin = async () => ({
	"tool.execute.before": async (input, output) => {
		const payload = { tool_input: output.args, args: output.args };
		blockIfNeeded(evaluateSecretGuard(payload));
		if (input.tool === "bash") {
			const command = commandArg(output);
			blockIfNeeded(evaluateSecretGuard({ ...payload, command }));
			blockIfNeeded(evaluateDestructiveCommand({ ...payload, command }));
			blockIfNeeded(evaluateUnsafeGit({ ...payload, command }));
			const result = evaluateCommandPolicy(command, {
				bunRewrite,
				rtkInstalled: true,
				rtkPolicyPresent: true
			});
			if (result.decision === "block") {
				const replacement = replacementFrom(result.details);
				if (replacement) {
					output.args.command = replacement;
					return;
				}
				throw new Error([
					styleHookMessage("error", result.reason ?? "OpenAgentLayer hook blocked."),
					...styleHookLines("note", result.details ?? [])
				].join("\\n"));
			}
		}
	},
	"tool.execute.after": async (_input, output) => {
		const text = String(output.output ?? output.stdout ?? output.stderr ?? "");
		blockIfNeeded(evaluateSecretGuard({ output: text }));
		blockIfNeeded(evaluateFailureLoop(output ?? {}));
	},
	event: async ({ event }) => {
		if (event.type === "session.idle") return;
	},
});

export const hookScripts = ${hookScripts};
`;
}
