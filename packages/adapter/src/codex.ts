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
	{ key: "steer", enabled: true, reason: "mid-turn steering" },
	{ key: "apps", enabled: false, reason: "app config not wired" },
	{ key: "tui_app_server", enabled: true, reason: "richer TUI surface" },
	{ key: "memories", enabled: true, reason: "session continuity" },
	{ key: "sqlite", enabled: true, reason: "local state persistence" },
	{ key: "plugins", enabled: true, reason: "plugin skill payloads" },
	{ key: "codex_hooks", enabled: true, reason: "runtime hooks" },
	{ key: "goals", enabled: true, reason: "goal state tracking" },
	{
		key: "responses_websockets",
		enabled: true,
		reason: "faster streaming transport",
	},
	{
		key: "responses_websockets_v2",
		enabled: true,
		reason: "newer streaming transport",
	},
	{
		key: "unified_exec",
		enabled: false,
		reason: "long-runtime profile only",
	},
	{ key: "multi_agent", enabled: false, reason: "owned delegation routes" },
	{ key: "multi_agent_v2", enabled: false, reason: "owned delegation routes" },
	{
		key: "shell_snapshot",
		enabled: false,
		reason: "snapshot surface not wired",
	},
	{
		key: "collaboration_modes",
		enabled: false,
		reason: "route contracts own mode",
	},
	{ key: "codex_git_commit", enabled: false, reason: "user-authored commits" },
	{
		key: "fast_mode",
		enabled: false,
		reason: "profile routing over blanket speed mode",
	},
	{ key: "undo", enabled: false, reason: "rollback owns recovery" },
	{ key: "js_repl", enabled: false, reason: "tool surface not wired" },
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
	return `[profiles.openagentlayer]
model = "gpt-5.5"
${profile.lead ? `model_reasoning_effort = ${quoteToml(profile.lead)}\n` : ""}
approval_policy = "on-request"
sandbox_mode = "workspace-write"
model_instructions_file = "AGENTS.md"
shell_zsh_fork = ".codex/openagentlayer/shim/oal-zsh"
tools_view_image = true

[profiles.openagentlayer.features]
${renderCodexFeatures()}

[profiles.openagentlayer-implement]
model = "gpt-5.3-codex"
${profile.implement ? `model_reasoning_effort = ${quoteToml(profile.implement)}\n` : ""}
approval_policy = "on-request"
sandbox_mode = "workspace-write"
model_instructions_file = "AGENTS.md"
shell_zsh_fork = ".codex/openagentlayer/shim/oal-zsh"

[profiles.openagentlayer-utility]
model = "gpt-5.4-mini"
${profile.utility ? `model_reasoning_effort = ${quoteToml(profile.utility)}\n` : ""}
approval_policy = "never"
sandbox_mode = "read-only"
model_instructions_file = "AGENTS.md"
shell_zsh_fork = ".codex/openagentlayer/shim/oal-zsh"

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
`;
}

function resolveCodexProfilePlan(options: RenderOptions): {
	lead?: "low" | "medium" | "high";
	implement?: "medium" | "high";
	utility?: "low" | "medium";
} {
	const plan = options.codexPlan ?? options.plan;
	if (plan === "plus")
		return { lead: "low", implement: "medium", utility: "low" };
	if (plan === "pro-5")
		return { lead: "medium", implement: "high", utility: "low" };
	if (plan === "pro-20")
		return { lead: "high", implement: "high", utility: "medium" };
	return {};
}

function renderCodexFeatures(): string {
	return CODEX_FEATURES.map(
		(feature) =>
			`${feature.key} = ${feature.enabled ? "true" : "false"} # ${feature.reason}`,
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
${model.reasoningEffort ? `model_reasoning_effort = ${quoteToml(model.reasoningEffort)}\n` : ""}model_class = ${quoteToml(agent.modelClass)}
developer_instructions = ${quoteToml(agentPrompt(agent, source))}
`;
}
