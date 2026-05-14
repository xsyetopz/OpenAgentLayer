import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type Artifact,
	type ArtifactSet,
	withProvenance,
} from "@openagentlayer/artifact";
import type { AgentRecord, OalSource, Provider } from "@openagentlayer/source";
import {
	CODEX_CONFIG_SCHEMA_COMMENT,
	OAL_CODEX_BASE_INSTRUCTIONS_FILE,
	OAL_CODEX_HOOKS_DIR,
	OAL_CODEX_MODEL_INSTRUCTIONS_RELATIVE,
} from "@openagentlayer/source";
import { agentPrompt, instructions, quoteToml } from "./common";
import { renderHookArtifacts } from "./hooks";
import type {
	CodexOrchestrationMode,
	ReasoningEffort,
	RenderOptions,
} from "./model-routing";
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
const CODEX_MANAGED_HOOK_DIR_PLACEHOLDER = "__OAL_CODEX_MANAGED_HOOK_DIR__";
const CODEX_BASE_INSTRUCTIONS_PATH = "prompts/codex_base_instruction.custom.md";
const CODEX_RTK_SHIMS = [
	["aws", "aws"],
	["cargo", "cargo"],
	["cat", "read"],
	["config", "config"],
	["curl", "curl"],
	["deps", "deps"],
	["diff", "diff"],
	["discover", "discover"],
	["docker", "docker"],
	["dotnet", "dotnet"],
	["env", "env"],
	["err", "err"],
	["find", "find"],
	["format", "format"],
	["gh", "gh"],
	["git", "git"],
	["glab", "glab"],
	["go", "go"],
	["golangci-lint", "golangci-lint"],
	["grep", "grep"],
	["gt", "gt"],
	["jest", "jest"],
	["json", "json"],
	["kubectl", "kubectl"],
	["lint", "lint"],
	["log", "log"],
	["ls", "ls"],
	["mypy", "mypy"],
	["next", "next"],
	["pip", "pip"],
	["playwright", "playwright"],
	["prettier", "prettier"],
	["prisma", "prisma"],
	["psql", "psql"],
	["pytest", "pytest"],
	["rake", "rake"],
	["rg", "grep"],
	["read", "read"],
	["rspec", "rspec"],
	["rubocop", "rubocop"],
	["ruff", "ruff"],
	["session", "session"],
	["smart", "smart"],
	["summary", "summary"],
	["test", "test"],
	["tree", "tree"],
	["tsc", "tsc"],
	["vitest", "vitest"],
	["wc", "wc"],
	["wget", "wget"],
] as const;
const CODEX_ALTERNATE_TOOL_SHIMS = [
	["ack", "rg"],
	["ag", "rg"],
	["exa", "eza"],
	["du", "dust"],
] as const;
const CODEX_DEVELOPER_INSTRUCTIONS = `## Mandatory Output Gate: Defensive Contrast Check

Before adding any contrastive boundary such as "not X," "does not Y," or "this is not Z," verify that the user asked for that distinction, showed that misunderstanding, or needs it to avoid a concrete technical error. If not, omit the contrast and state the positive case.

## Mandatory Output Gate: Avoid Defensive Contrast

Outputs must not add defensive or preemptive contrast against misunderstandings the user has not shown.

Do not introduce "not X," "does not Y," "this is not Z," or similar boundary-setting just to clarify against a hypothetical alternative. Clear positive wording is preferred, because what is excluded is usually implied by what is stated.

Use contrast only when it is directly relevant to the user's request, when the user asks for a comparison, when correcting an actual stated misunderstanding, or when the distinction is necessary to avoid a concrete technical mistake.

## Mandatory Output Gate: Prevent Implementation-Context Leakage

External-facing documentation, UI copy, commit messages, and public repo text must not be shaped by internal constraints, task history, migration details, local workspace boundaries, omitted files, or agent reasoning artifacts. Write only from the artifact's audience-facing purpose.`;

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
		withProvenance({
			provider: PROVIDER,
			path: ".codex/requirements.toml",
			content: renderCodexRequirements(source),
			sourceId: "requirements:codex",
			mode: "config",
		}),
		withProvenance({
			provider: PROVIDER,
			path: OAL_CODEX_BASE_INSTRUCTIONS_FILE,
			content: await renderCodexBaseInstructions(repoRoot),
			sourceId: "instructions-base:codex",
			mode: "file",
		}),
		withProvenance({
			provider: PROVIDER,
			path: ".codex/scripts/common.sh",
			content: renderCodexCommonShellScript(),
			sourceId: "rtk-shim:codex",
			mode: "file",
		}),
	];
	artifacts.push(...renderCodexRtkShimArtifacts());
	artifacts.push(...renderCodexAlternateToolShimArtifacts());
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
			OAL_CODEX_HOOKS_DIR,
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

function renderCodexCommonShellScript(): string {
	return `strip_shim_path() {
	local path_value="\${1:-}"
	local shim_dir_codex="$HOME/.codex/shim"
	local rebuilt=""
	local entry=""
	local -a entries=("\${(@s/:/)path_value}")
	for entry in "\${entries[@]}"; do
		[[ -z "$entry" || "$entry" == "$shim_dir_codex" ]] && continue
		if [[ -n "$rebuilt" ]]; then
			rebuilt="\${rebuilt}:$entry"
		else
			rebuilt="$entry"
		fi
	done
	printf '%s\\n' "$rebuilt"
}

unshim_current_path() {
	strip_shim_path "\${PATH:-}"
}
`;
}

function renderCodexRtkShimArtifacts(): Artifact[] {
	return CODEX_RTK_SHIMS.map(([command, rtkCommand]) =>
		withProvenance({
			provider: PROVIDER,
			path: `.codex/shim/${command}`,
			content: renderCodexRtkShim(rtkCommand),
			sourceId: "rtk-shim:codex",
			executable: true,
			mode: "file",
		}),
	);
}

function renderCodexRtkShim(rtkCommand: string): string {
	return `#!/bin/zsh
set -euo pipefail

source "$HOME/.codex/scripts/common.sh"

PATH="$(unshim_current_path)" exec rtk ${rtkCommand} "$@"
`;
}

function renderCodexAlternateToolShimArtifacts(): Artifact[] {
	return CODEX_ALTERNATE_TOOL_SHIMS.map(([command, replacement]) =>
		withProvenance({
			provider: PROVIDER,
			path: `.codex/shim/${command}`,
			content: renderCodexAlternateToolShim(command, replacement),
			sourceId: "tool-shim:codex",
			executable: true,
			mode: "file",
		}),
	);
}

function renderCodexAlternateToolShim(
	command: string,
	replacement: string,
): string {
	return `#!/bin/zsh
set -euo pipefail

source "$HOME/.codex/scripts/common.sh"

PATH="$(unshim_current_path)"
if command -v ${replacement} >/dev/null 2>&1; then
	exec ${replacement} "$@"
fi
exec ${command} "$@"
`;
}

function renderCodexConfig(source: OalSource, options: RenderOptions): string {
	const profile = resolveCodexProfilePlan(options);
	const orchestration = resolveCodexOrchestration(options);
	const primaryProfile = codexPrimaryProfileName(orchestration.mode);
	return `${CODEX_CONFIG_SCHEMA_COMMENT}
profile = ${quoteToml(primaryProfile)}
approvals_reviewer = "auto_review"
model_instructions_file = "${OAL_CODEX_MODEL_INSTRUCTIONS_RELATIVE}"
developer_instructions = ${quoteToml(CODEX_DEVELOPER_INSTRUCTIONS)}

[notice]
hide_rate_limit_model_nudge = true

[memories]
extract_model = "gpt-5.4-mini"

[tui]
status_line = ["model-with-reasoning", "run-state", "git-branch", "task-progress", "context-remaining", "used-tokens"]

[features]
${renderCodexFeatures(orchestration)}

${renderCodexProfile({
	name: primaryProfile,
	model: profile.profileModel,
	approvalPolicy: "on-request",
	sandboxMode: "workspace-write",
	...optionalReasoningEfforts(profile.plan, profile.model),
	toolsViewImage: true,
})}
[profiles.${primaryProfile}.features]
${renderCodexFeatures(orchestration)}

${renderCodexProfile({
	name: "openagentlayer",
	model: profile.profileModel,
	approvalPolicy: "on-request",
	sandboxMode: "workspace-write",
	...optionalReasoningEfforts(profile.plan, profile.model),
	toolsViewImage: true,
})}
[profiles.openagentlayer.features]
${renderCodexFeatures(orchestration)}

${renderCodexProfile({
	name: `${primaryProfile}-implement`,
	model: profile.implementationModel,
	approvalPolicy: "on-request",
	sandboxMode: "workspace-write",
	...optionalReasoningEfforts(profile.implementPlan, profile.implementModel),
})}
${renderCodexProfile({
	name: `${primaryProfile}-utility`,
	model: profile.utilityProfileModel,
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
nickname_candidates = [${codexAgentNicknames(agent).map(quoteToml).join(", ")}]
config_file = "./agents/${agent.id}.toml"`,
	)
	.join("\n")}

[plugins."oal@openagentlayer-local"]
enabled = true
`;
}

function codexPrimaryProfileName(mode: CodexOrchestrationMode): string {
	switch (mode) {
		case "multi_agent":
			return "openagentlayer-multi-agent";
		case "multi_agent_v2":
			return "openagentlayer-multi-agent-v2";
		default:
			return "openagentlayer-opendex";
	}
}

function codexAgentNicknames(agent: AgentRecord): string[] {
	return [...new Set([agent.id, agent.name.toLowerCase(), ...agent.routes])];
}

interface CodexProfileConfig {
	name: string;
	model: string;
	approvalPolicy: "never" | "on-request";
	sandboxMode: "read-only" | "workspace-write";
	planReasoningEffort?: ReasoningEffort;
	modelReasoningEffort?: ReasoningEffort;
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
	profileModel: string;
	implementationModel: string;
	utilityProfileModel: string;
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
				profileModel: options.codexProfileModel ?? "gpt-5.4",
				implementationModel: "gpt-5.3-codex",
				utilityProfileModel: "gpt-5.4-mini",
				plan: "medium",
				model: "medium",
				implementPlan: "medium",
				implementModel: "medium",
				utilityPlan: "low",
				utilityModel: "low",
			};
		case "pro-5":
			return {
				profileModel: options.codexProfileModel ?? "gpt-5.4",
				implementationModel: "gpt-5.3-codex",
				utilityProfileModel: "gpt-5.4-mini",
				plan: "high",
				model: "medium",
				implementPlan: "medium",
				implementModel: "high",
				utilityPlan: "low",
				utilityModel: "medium",
			};
		case "pro-20":
			return {
				profileModel: options.codexProfileModel ?? "gpt-5.5",
				implementationModel: "gpt-5.3-codex",
				utilityProfileModel: "gpt-5.4-mini",
				plan: "high",
				model: "medium",
				implementPlan: "high",
				implementModel: "xhigh",
				utilityPlan: "low",
				utilityModel: "medium",
			};
		default:
			return {
				profileModel: options.codexProfileModel ?? "gpt-5.4",
				implementationModel: "gpt-5.3-codex",
				utilityProfileModel: "gpt-5.4-mini",
			};
	}
}

function resolveCodexAgentPlan(options: RenderOptions): {
	jobMaxRuntimeSeconds: number;
	maxThreads: number;
} {
	const plan = options.codexPlan ?? options.plan;
	switch (plan) {
		case "plus":
			return { jobMaxRuntimeSeconds: 300, maxThreads: 2 };
		case "pro-5":
			return { jobMaxRuntimeSeconds: 600, maxThreads: 4 };
		case "pro-20":
			return { jobMaxRuntimeSeconds: 900, maxThreads: 6 };
		default:
			return { jobMaxRuntimeSeconds: 600, maxThreads: 4 };
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
	const mode = input.mode ?? "multi_agent_v2";
	const maxThreads = clampCodexThreads(input.maxThreads, plan.maxThreads);
	const maxDepth = input.maxDepth ?? 1;
	const v2Threads = clampCodexThreads(
		input.multiAgentV2?.maxConcurrentThreadsPerSession ?? maxThreads,
		plan.maxThreads,
	);
	return {
		mode,
		maxDepth,
		maxThreads,
		jobMaxRuntimeSeconds:
			input.jobMaxRuntimeSeconds ?? plan.jobMaxRuntimeSeconds,
		multiAgentV2: {
			...(mode === "multi_agent_v2"
				? {
						usageHintEnabled: true,
						rootAgentUsageHintText:
							"Assume native subagents are encouraged for broad or parallel OAL work. For significant or separable coding implementation, spawn rendered GPT-5.3-Codex implementation agents such as hephaestus, daedalus, demeter, hecate, or prometheus instead of doing all edits in the parent reasoning session. Assign bounded jobs that fit the runtime cap, keep narrow single-owner edits local, and merge only final evidence.",
						subagentUsageHintText:
							"You are an OAL native subagent. Complete only the bounded assigned task within the runtime cap, return concise evidence and changed paths, and do not create nested peer orchestrators.",
					}
				: {}),
			...input.multiAgentV2,
			maxConcurrentThreadsPerSession: v2Threads,
		},
	};
}

function clampCodexThreads(
	value: number | undefined,
	planMaxThreads: number,
): number {
	const requested = value ?? planMaxThreads;
	return Math.max(1, Math.min(requested, planMaxThreads));
}

function renderCodexFeatures(
	orchestration: ResolvedCodexOrchestration,
): string {
	const baseFeatures = CODEX_FEATURES.map(([name, defaultEnabled]) => {
		const enabled =
			name === "apps" ? orchestration.mode === "opendex" : defaultEnabled;
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

function renderCodexRequirements(source: OalSource): string {
	const groups = codexHookGroups(source);
	const eventBlocks = [...groups.entries()]
		.map(([event, commands]) =>
			commands
				.map(
					(command) => `
[[hooks.${event}]]

[[hooks.${event}.hooks]]
type = "command"
command = ${quoteToml(command.replaceAll(OAL_CODEX_HOOKS_DIR, CODEX_MANAGED_HOOK_DIR_PLACEHOLDER))}
statusMessage = ${quoteToml(`Running OAL ${event} hook`)}
`,
				)
				.join(""),
		)
		.join("");
	return `[features]
hooks = true

[hooks]
managed_dir = ${quoteToml(CODEX_MANAGED_HOOK_DIR_PLACEHOLDER)}

${eventBlocks}`;
}

function renderCodexBaseInstructions(repoRoot: string): Promise<string> {
	return readFile(join(repoRoot, CODEX_BASE_INSTRUCTIONS_PATH), "utf8");
}

function codexHookGroups(source: OalSource): Map<string, string[]> {
	return source.hooks
		.flatMap((hook) =>
			(hook.events.codex ?? []).map((event) => ({
				event,
				command: `OAL_HOOK_PROVIDER=codex OAL_HOOK_EVENT=${event} ${OAL_CODEX_HOOKS_DIR}/${hook.script}`,
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
