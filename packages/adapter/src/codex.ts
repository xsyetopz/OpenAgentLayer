import {
	type Artifact,
	type ArtifactSet,
	withProvenance,
} from "@openagentlayer/artifact";
import type { AgentRecord, OalSource, Provider } from "@openagentlayer/source";
import { agentPrompt, instructions, quoteToml } from "./common";
import { renderHookArtifacts } from "./hooks";
import type { RenderOptions } from "./model-routing";
import { resolveCodexModel } from "./model-routing";
import { renderPrivilegedExecArtifacts } from "./runtime";
import { renderSkillArtifacts } from "./skills";

const PROVIDER: Provider = "codex";
// Managed OAL runs use peer orchestration. If an operator explicitly re-enables
// stable Codex multi_agent, keep its native spawn surface shallow and bounded.
const CODEX_FEATURES = [
	{ key: "steer", enabled: true },
	{ key: "apps", enabled: false },
	{ key: "tui_app_server", enabled: true },
	{ key: "memories", enabled: true },
	{ key: "sqlite", enabled: true },
	{ key: "plugins", enabled: true },
	{ key: "codex_hooks", enabled: true },
	{ key: "hooks", enabled: true },
	{ key: "shell_zsh_fork", enabled: false },
	{ key: "goals", enabled: true },
	{ key: "responses_websockets", enabled: true },
	{ key: "responses_websockets_v2", enabled: true },
	{ key: "unified_exec", enabled: false },
	{ key: "enable_fanout", enabled: false },
	{ key: "multi_agent", enabled: false },
	{ key: "multi_agent_v2", enabled: false },
	{ key: "shell_snapshot", enabled: false },
	{ key: "collaboration_modes", enabled: false },
	{ key: "codex_git_commit", enabled: false },
	{ key: "fast_mode", enabled: false },
	{ key: "undo", enabled: false },
	{ key: "js_repl", enabled: false },
] as const;

export async function renderCodex(
	source: OalSource,
	repoRoot: string,
	options: RenderOptions = {},
): Promise<ArtifactSet> {
	const artifacts: Artifact[] = [
		withProvenance({
			provider: PROVIDER,
			path: ".codex/config.toml",
			content: renderCodexConfig(source, options),
			sourceId: "config:codex",
			mode: "config",
		}),
		withProvenance({
			provider: PROVIDER,
			path: ".codex/hooks.json",
			content: renderCodexHooksJson(source),
			sourceId: "hooks:codex",
			mode: "config",
		}),
	];
	for (const agent of source.agents.filter((record) =>
		record.providers.includes(PROVIDER),
	))
		artifacts.push(
			withProvenance({
				provider: PROVIDER,
				path: `.codex/agents/${agent.id}.toml`,
				content: renderCodexAgent(agent, source, options),
				sourceId: `agent:${agent.id}`,
				mode: "file",
			}),
		);
	for (const skill of source.skills.filter((record) =>
		record.providers.includes(PROVIDER),
	))
		artifacts.push(
			...renderSkillArtifacts(
				PROVIDER,
				skill,
				".codex/openagentlayer/skills",
				source,
			),
		);
	artifacts.push({
		provider: PROVIDER,
		path: "AGENTS.md",
		content: instructions(source, source.routes, PROVIDER),
		sourceId: "instructions:codex",
		mode: "block",
	});
	artifacts.push(
		...(await renderHookArtifacts(
			PROVIDER,
			source.hooks,
			".codex/openagentlayer/hooks",
			repoRoot,
		)),
	);
	artifacts.push(
		...(await renderPrivilegedExecArtifacts(
			PROVIDER,
			repoRoot,
			".codex/openagentlayer/runtime",
		)),
	);
	return {
		artifacts,
		unsupported: [
			{
				provider: PROVIDER,
				capability: "custom TypeScript tools",
				reason:
					"Codex has no OpenCode-style direct custom tool file surface; OAL emits skills and hooks instead",
			},
		],
	};
}

function renderCodexConfig(source: OalSource, options: RenderOptions): string {
	const profile = resolveCodexProfilePlan(options);
	const agents = resolveCodexAgentPlan(options);
	return `profile = "openagentlayer"
approvals_reviewer = "auto_review"

[notice]
hide_rate_limit_model_nudge = true

[memories]
extract_model = "gpt-5.4-mini"

[tui]
status_line = ["model-with-reasoning", "task-progress", "context-remaining", "five-hour-limit", "weekly-limit"]

[features]
${renderCodexFeatures()}

${renderCodexProfile({
	name: "openagentlayer",
	model: "gpt-5.5",
	approvalPolicy: "on-request",
	sandboxMode: "workspace-write",
	...optionalReasoningEfforts(profile.plan, profile.model),
	toolsViewImage: true,
})}
[profiles.openagentlayer.features]
${renderCodexFeatures()}

${renderCodexProfile({
	name: "openagentlayer-implement",
	model: "gpt-5.3-codex",
	approvalPolicy: "on-request",
	sandboxMode: "workspace-write",
	...optionalReasoningEfforts(profile.implementPlan, profile.implementModel),
})}
${renderCodexProfile({
	name: "openagentlayer-utility",
	model: "gpt-5.4-mini",
	approvalPolicy: "never",
	sandboxMode: "read-only",
	...optionalReasoningEfforts(profile.utilityPlan, profile.utilityModel),
})}
[agents]
max_depth = 1
max_threads = ${agents.maxThreads}
job_max_runtime_seconds = ${agents.jobMaxRuntimeSeconds}
interrupt_message = true
${source.agents
	.map(
		(agent) => `
[agents.${agent.id}]
description = ${quoteToml(agent.role)}
nickname_candidates = [${quoteToml(agent.id)}]
config_file = "./agents/${agent.id}.toml"`,
	)
	.join("\n")}

[plugins."oal@openagentlayer-local"]
enabled = true
`;
}

interface CodexProfileConfig {
	name: string;
	model: string;
	approvalPolicy: "never" | "on-request";
	sandboxMode: "read-only" | "workspace-write";
	planReasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh";
	modelReasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh";
	toolsViewImage?: boolean;
}

function optionalReasoningEfforts(
	planReasoningEffort: CodexProfileConfig["planReasoningEffort"],
	modelReasoningEffort: CodexProfileConfig["modelReasoningEffort"],
): Pick<CodexProfileConfig, "planReasoningEffort" | "modelReasoningEffort"> {
	return {
		...(planReasoningEffort ? { planReasoningEffort } : {}),
		...(modelReasoningEffort ? { modelReasoningEffort } : {}),
	};
}

function renderCodexProfile(profile: CodexProfileConfig): string {
	return `[profiles.${profile.name}]
model = ${quoteToml(profile.model)}
${profile.planReasoningEffort ? `plan_mode_reasoning_effort = ${quoteToml(profile.planReasoningEffort)}\n` : ""}${profile.modelReasoningEffort ? `model_reasoning_effort = ${quoteToml(profile.modelReasoningEffort)}\n` : ""}model_verbosity = "low"
approval_policy = ${quoteToml(profile.approvalPolicy)}
sandbox_mode = ${quoteToml(profile.sandboxMode)}
${profile.toolsViewImage ? "tools_view_image = true\n" : ""}
`;
}

function resolveCodexProfilePlan(options: RenderOptions): {
	plan?: CodexProfileConfig["planReasoningEffort"];
	model?: CodexProfileConfig["modelReasoningEffort"];
	implementPlan?: CodexProfileConfig["planReasoningEffort"];
	implementModel?: CodexProfileConfig["modelReasoningEffort"];
	utilityPlan?: CodexProfileConfig["planReasoningEffort"];
	utilityModel?: CodexProfileConfig["modelReasoningEffort"];
} {
	const plan = options.codexPlan ?? options.plan;
	switch (plan) {
		case "plus":
			return {
				plan: "low",
				model: "low",
				implementPlan: "medium",
				implementModel: "medium",
				utilityPlan: "low",
				utilityModel: "low",
			};
		case "pro-5":
			return {
				plan: "high",
				model: "medium",
				implementPlan: "medium",
				implementModel: "high",
				utilityPlan: "low",
				utilityModel: "low",
			};
		case "pro-20":
			return {
				plan: "high",
				model: "medium",
				implementPlan: "medium",
				implementModel: "high",
				utilityPlan: "medium",
				utilityModel: "medium",
			};
		default:
			return {};
	}
}

function resolveCodexAgentPlan(options: RenderOptions): {
	maxThreads: number;
	jobMaxRuntimeSeconds: number;
} {
	const plan = options.codexPlan ?? options.plan;
	switch (plan) {
		case "plus":
			return { maxThreads: 2, jobMaxRuntimeSeconds: 600 };
		case "pro-5":
			return { maxThreads: 4, jobMaxRuntimeSeconds: 900 };
		case "pro-20":
			return { maxThreads: 6, jobMaxRuntimeSeconds: 1800 };
		default:
			return { maxThreads: 6, jobMaxRuntimeSeconds: 1800 };
	}
}

function renderCodexFeatures(): string {
	return CODEX_FEATURES.map(
		(feature) => `${feature.key} = ${feature.enabled ? "true" : "false"}`,
	).join("\n");
}

function renderCodexHooksJson(source: OalSource): string {
	return `${JSON.stringify(
		{
			hooks: Object.fromEntries(
				[...codexHookGroups(source).entries()].map(([event, commands]) => [
					event,
					commands.map((command) => ({
						hooks: [{ type: "command", command }],
					})),
				]),
			),
		},
		undefined,
		2,
	)}\n`;
}

function codexHookGroups(source: OalSource): Map<string, string[]> {
	return source.hooks
		.flatMap((hook) =>
			(hook.events.codex ?? []).map((event) => ({
				event,
				command: `OAL_HOOK_PROVIDER=codex OAL_HOOK_EVENT=${event} .codex/openagentlayer/hooks/${hook.script}`,
			})),
		)
		.reduce((byEvent, hook) => {
			const hooks = byEvent.get(hook.event) ?? [];
			hooks.push(hook.command);
			byEvent.set(hook.event, hooks);
			return byEvent;
		}, new Map<string, string[]>());
}

function renderCodexAgent(
	agent: AgentRecord,
	source: OalSource,
	options: RenderOptions,
): string {
	const model = resolveCodexModel(agent, options);
	return [
		`name = ${quoteToml(agent.id)}`,
		`description = ${quoteToml(agent.role)}`,
		`nickname_candidates = [${quoteToml(agent.id)}]`,
		`model = ${quoteToml(model.model)}`,
		`sandbox_mode = ${quoteToml(agent.tools.includes("write") ? "workspace-write" : "read-only")}`,
		...(model.reasoningEffort
			? [`model_reasoning_effort = ${quoteToml(model.reasoningEffort)}`]
			: []),
		`developer_instructions = ${quoteToml(agentPrompt(agent, source))}`,
		"",
	].join("\n");
}
