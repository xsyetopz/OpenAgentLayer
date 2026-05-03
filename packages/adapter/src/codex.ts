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
import {
	renderCodexShellShimArtifacts,
	renderPrivilegedExecArtifacts,
} from "./runtime";
import { renderSkillArtifacts } from "./skills";

const PROVIDER: Provider = "codex";
const CODEX_FEATURES = [
	{ key: "steer", enabled: true },
	{ key: "apps", enabled: false },
	{ key: "tui_app_server", enabled: true },
	{ key: "memories", enabled: true },
	{ key: "sqlite", enabled: true },
	{ key: "plugins", enabled: true },
	{ key: "codex_hooks", enabled: true },
	{ key: "shell_zsh_fork", enabled: true },
	{ key: "goals", enabled: true },
	{ key: "responses_websockets", enabled: true },
	{ key: "responses_websockets_v2", enabled: true },
	{ key: "unified_exec", enabled: false },
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
	const shim = renderCodexShellShimArtifacts();
	artifacts.push(...shim.artifacts);
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
					"Codex has no OpenCode-style direct custom tool file surface; OAL emits skills and hooks instead.",
			},
		],
	};
}

function renderCodexConfig(source: OalSource, options: RenderOptions): string {
	const profile = resolveCodexProfilePlan(options);
	return `profile = "openagentlayer"

[notice]
hide_rate_limit_model_nudge = true

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
max_threads = 4
max_depth = 1
job_max_runtime_seconds = 1800
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
	planReasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
	modelReasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
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
model_instructions_file = "AGENTS.md"
zsh_path = ".codex/openagentlayer/shim/oal-zsh"
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
				plan: "medium",
				model: "low",
				implementPlan: "low",
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
				utilityModel: "medium",
			};
		case "pro-20":
			return {
				plan: "high",
				model: "medium",
				implementPlan: "medium",
				implementModel: "high",
				utilityPlan: "low",
				utilityModel: "medium",
			};
		default:
			return {};
	}
}

function renderCodexFeatures(): string {
	return CODEX_FEATURES.map(
		(feature) => `${feature.key} = ${feature.enabled ? "true" : "false"}`,
	).join("\n");
}

function renderCodexAgent(
	agent: AgentRecord,
	source: OalSource,
	options: RenderOptions,
): string {
	const model = resolveCodexModel(agent, options);
	return `model = ${quoteToml(model.model)}
sandbox_mode = ${quoteToml(agent.tools.includes("write") ? "workspace-write" : "read-only")}
${model.reasoningEffort ? `model_reasoning_effort = ${quoteToml(model.reasoningEffort)}\n` : ""}developer_instructions = ${quoteToml(agentPrompt(agent, source))}
`;
}
