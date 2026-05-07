import {
	type Artifact,
	type ArtifactSet,
	withProvenance,
} from "@openagentlayer/artifact";
import type { AgentRecord, OalSource, Provider } from "@openagentlayer/source";
import { agentPrompt, instructions, quoteToml } from "./common";
import { renderHookArtifacts } from "./hooks";
import type { CodexOrchestrationMode, RenderOptions } from "./model-routing";
import { resolveCodexModel } from "./model-routing";
import { renderPrivilegedExecArtifacts } from "./runtime";
import { renderSkillArtifacts } from "./skills";

const PROVIDER: Provider = "codex";
const CODEX_FEATURES = [
	["steer", true],
	["apps", false],
	["tui_app_server", true],
	["memories", true],
	["sqlite", true],
	["plugins", true],
	["codex_hooks", true],
	["hooks", true],
	["shell_zsh_fork", false],
	["goals", true],
	["responses_websockets", true],
	["responses_websockets_v2", true],
	["unified_exec", false],
	["shell_snapshot", false],
	["collaboration_modes", false],
	["codex_git_commit", false],
	["fast_mode", false],
	["undo", false],
	["js_repl", false],
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
	const orchestration = resolveCodexOrchestration(options);
	return `profile = "openagentlayer"
approvals_reviewer = "auto_review"

[notice]
hide_rate_limit_model_nudge = true

[memories]
extract_model = "gpt-5.4-mini"

[tui]
status_line = ["model-with-reasoning", "task-progress", "context-remaining", "five-hour-limit", "weekly-limit"]

[features]
${renderCodexFeatures(orchestration)}

${renderCodexProfile({
	name: "openagentlayer",
	model: "gpt-5.5",
	approvalPolicy: "on-request",
	sandboxMode: "workspace-write",
	...optionalReasoningEfforts(profile.plan, profile.model),
	toolsViewImage: true,
})}
[profiles.openagentlayer.features]
${renderCodexFeatures(orchestration)}

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
max_depth = ${orchestration.maxDepth}
${orchestration.mode === "multi_agent_v2" ? "" : `max_threads = ${orchestration.maxThreads}\n`}job_max_runtime_seconds = ${orchestration.jobMaxRuntimeSeconds}
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
	jobMaxRuntimeSeconds: number;
} {
	const plan = options.codexPlan ?? options.plan;
	switch (plan) {
		case "plus":
			return { jobMaxRuntimeSeconds: 600 };
		case "pro-5":
			return { jobMaxRuntimeSeconds: 900 };
		case "pro-20":
			return { jobMaxRuntimeSeconds: 1800 };
		default:
			return { jobMaxRuntimeSeconds: 1800 };
	}
}

interface ResolvedCodexOrchestration {
	mode: CodexOrchestrationMode;
	maxDepth: number;
	maxThreads: number;
	jobMaxRuntimeSeconds: number;
	multiAgentV2: {
		hideSpawnAgentMetadata?: boolean;
		maxConcurrentThreadsPerSession: number;
		minWaitTimeoutMs?: number;
		rootAgentUsageHintText?: string;
		subagentUsageHintText?: string;
		usageHintEnabled?: boolean;
		usageHintText?: string;
	};
}

function resolveCodexOrchestration(
	options: RenderOptions,
): ResolvedCodexOrchestration {
	const plan = resolveCodexAgentPlan(options);
	const input = options.codexOrchestration ?? {};
	const mode = input.mode ?? "symphony";
	const maxThreads = input.maxThreads ?? 1;
	const maxDepth = input.maxDepth ?? 1;
	const v2Threads =
		input.multiAgentV2?.maxConcurrentThreadsPerSession ?? maxThreads;
	return {
		mode,
		maxDepth,
		maxThreads,
		jobMaxRuntimeSeconds:
			input.jobMaxRuntimeSeconds ?? plan.jobMaxRuntimeSeconds,
		multiAgentV2: {
			...input.multiAgentV2,
			maxConcurrentThreadsPerSession: v2Threads,
		},
	};
}

function renderCodexFeatures(
	orchestration: ResolvedCodexOrchestration,
): string {
	const baseFeatures = CODEX_FEATURES.map(([name, defaultEnabled]) => {
		const enabled =
			name === "apps" ? orchestration.mode === "symphony" : defaultEnabled;
		return `${name} = ${enabled ? "true" : "false"}`;
	});
	return [
		...baseFeatures,
		"enable_fanout = false",
		`multi_agent = ${orchestration.mode === "multi_agent" ? "true" : "false"}`,
		renderMultiAgentV2Feature(orchestration),
	].join("\n");
}

function renderMultiAgentV2Feature(
	orchestration: ResolvedCodexOrchestration,
): string {
	if (orchestration.mode !== "multi_agent_v2") return "multi_agent_v2 = false";
	const entries = [
		"enabled = true",
		`max_concurrent_threads_per_session = ${orchestration.multiAgentV2.maxConcurrentThreadsPerSession}`,
		...optionalBooleanEntry(
			"hide_spawn_agent_metadata",
			orchestration.multiAgentV2.hideSpawnAgentMetadata,
		),
		...optionalIntegerEntry(
			"min_wait_timeout_ms",
			orchestration.multiAgentV2.minWaitTimeoutMs,
		),
		...optionalStringEntry(
			"root_agent_usage_hint_text",
			orchestration.multiAgentV2.rootAgentUsageHintText,
		),
		...optionalStringEntry(
			"subagent_usage_hint_text",
			orchestration.multiAgentV2.subagentUsageHintText,
		),
		...optionalBooleanEntry(
			"usage_hint_enabled",
			orchestration.multiAgentV2.usageHintEnabled,
		),
		...optionalStringEntry(
			"usage_hint_text",
			orchestration.multiAgentV2.usageHintText,
		),
	];
	return `multi_agent_v2 = { ${entries.join(", ")} }`;
}

function optionalBooleanEntry(
	key: string,
	value: boolean | undefined,
): string[] {
	return typeof value === "boolean"
		? [`${key} = ${value ? "true" : "false"}`]
		: [];
}

function optionalIntegerEntry(
	key: string,
	value: number | undefined,
): string[] {
	return typeof value === "number" ? [`${key} = ${value}`] : [];
}

function optionalStringEntry(key: string, value: string | undefined): string[] {
	return value ? [`${key} = ${quoteToml(value)}`] : [];
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
