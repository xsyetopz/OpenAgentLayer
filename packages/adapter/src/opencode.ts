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
const MODEL_SUFFIX_PATTERN = /\[[^\]]+\]$/;
const MODEL_VERSION_PATTERN = /^\d+(?:\.\d+)*$/;

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
			content: renderOpenCodeAgent(agent, source, options),
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

function renderOpenCodeAgent(
	agent: AgentRecord,
	source: OalSource,
	options: RenderOptions,
): string {
	const model = resolveOpenCodeModel(agent, options);
	return `---
color: "${agentHexColor(agent.id)}"
---
# ${agent.name}

${agentPrompt(agent, source)}

Git attribution: use \`Co-authored-by: ${openCodeCommitIdentity(model)}\` for commits created by this OpenCode agent. This identity is derived from the agent model configured in \`opencode.jsonc\`: \`${model}\`.
`;
}

export function openCodeCommitIdentity(model: string): string {
	const displayName = openCodeModelDisplayName(model);
	const email = openCodeModelAttributionEmail(model);
	return `${displayName} <${email}>`;
}

function openCodeModelDisplayName(model: string): string {
	const modelName = model.split("/").pop() ?? model;
	if (modelName.startsWith("gpt-")) {
		const [, ...parts] = modelName
			.replace(MODEL_SUFFIX_PATTERN, "")
			.split("-")
			.filter(Boolean);
		const versionParts: string[] = [];
		while (parts[0] && MODEL_VERSION_PATTERN.test(parts[0]))
			versionParts.push(parts.shift() as string);
		const suffix = parts.map(capitalizeWord).join(" ");
		return `GPT-${versionParts.join(".")}${suffix ? ` ${suffix}` : ""}`;
	}
	return modelName
		.replace(MODEL_SUFFIX_PATTERN, "")
		.split("-")
		.filter(Boolean)
		.map(capitalizeWord)
		.join(" ")
		.replace(/\b(\d+) (\d+)\b/g, "$1.$2");
}

function capitalizeWord(part: string): string {
	return part.charAt(0).toUpperCase() + part.slice(1);
}

function openCodeModelAttributionEmail(model: string): string {
	const modelName = model.toLowerCase();
	if (modelName.includes("/claude-") || modelName.includes("claude-"))
		return "noreply@anthropic.com";
	if (modelName.includes("/gpt-") || modelName.includes("gpt-"))
		return "noreply@openai.com";
	return "noreply@opencode.ai";
}

function renderOpenCodeTool(tool: ToolRecord): string {
	if (tool.id === "command_policy_check") return renderCommandPolicyTool(tool);
	if (tool.id === "rtk_report") return renderRtkReportTool(tool);
	if (tool.id === "provider_surface_map")
		return renderInspectTool(tool, "capabilities");
	if (tool.id === "manifest_inspect")
		return renderInspectTool(tool, "manifest");
	if (tool.id === "generated_diff")
		return renderInspectTool(tool, "generated-diff");
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

function renderInspectTool(tool: ToolRecord, topic: string): string {
	return `import { tool } from "@opencode-ai/plugin";

export const ${camelCase(tool.id)} = tool({
	description: ${quoteToml(tool.description)},
	args: {},
	async execute() {
		const proc = Bun.spawn(["oal", "inspect", ${quoteToml(topic)}], {
			stdout: "pipe",
			stderr: "pipe"
		});
		const [stdout, stderr, code] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited
		]);
		if (code !== 0) throw new Error(stderr || stdout);
		return stdout;
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

function renderOpenCodePlugin(source: OalSource): string {
	const beforeHookIds = JSON.stringify(
		source.hooks
			.filter((hook) => hook.events?.opencode?.includes("tool.execute.before"))
			.map((hook) => hook.id),
	);
	const afterHookIds = JSON.stringify(
		source.hooks
			.filter((hook) => hook.events?.opencode?.includes("tool.execute.after"))
			.map((hook) => hook.id),
	);
	return `import type { Plugin } from "@opencode-ai/plugin";
import { evaluateCommandPolicy } from "../openagentlayer/hooks/_command-policy.mjs";
import { bunRewrite } from "../openagentlayer/hooks/_bun-rewrite.mjs";
import { evaluateCommandSafety } from "../openagentlayer/hooks/_command-safety.mjs";
import { evaluateFailureLoop } from "../openagentlayer/hooks/_failure-loop.mjs";
import { styleHookLines, styleHookMessage } from "../openagentlayer/hooks/_hook-style.mjs";
import { evaluateSecretGuard } from "../openagentlayer/hooks/_secret-guard.mjs";

const beforeHookIds = ${beforeHookIds};
const afterHookIds = ${afterHookIds};

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

function runBeforeHook(hookId: string, payload: Record<string, unknown>, command: string) {
	if (hookId === "block_secret_files" || hookId === "block_env_file_access")
		return evaluateSecretGuard(payload);
	if (hookId === "block_command_safety")
		return command ? evaluateCommandSafety({ ...payload, command }) : { decision: "pass", reason: "Command input absent" };
	if (hookId === "enforce_rtk_commands") {
		if (!command) return { decision: "pass", reason: "Command text absent" };
		return evaluateCommandPolicy(command, {
			bunRewrite,
			rtkInstalled: true,
			rtkPolicyPresent: true
		});
	}
	return { decision: "pass", reason: "OpenCode hook has no dispatcher" };
}

function runAfterHook(hookId: string, output: unknown) {
	const text = String((output as { output?: unknown; stdout?: unknown; stderr?: unknown })?.output ?? (output as { stdout?: unknown })?.stdout ?? (output as { stderr?: unknown })?.stderr ?? "");
	if (hookId === "block_secret_output")
		return evaluateSecretGuard({ output: text });
	if (hookId === "block_repeated_failures")
		return evaluateFailureLoop(output ?? {});
	return { decision: "pass", reason: "OpenCode hook has no dispatcher" };
}

export const OpenAgentLayerPlugin: Plugin = async () => ({
	"tool.execute.before": async (input, output) => {
		const payload = { tool_input: output.args, args: output.args };
		const command = input.tool === "bash" ? commandArg(output) : "";
		for (const hookId of beforeHookIds) {
			const result = runBeforeHook(hookId, command ? { ...payload, command } : payload, command);
			if (result.decision === "block") {
				const replacement = replacementFrom(result.details);
				if (replacement && input.tool === "bash") {
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
		for (const hookId of afterHookIds)
			blockIfNeeded(runAfterHook(hookId, output));
	},
	event: async ({ event }) => {
		if (event.type === "session.idle") return;
	},
});
`;
}
