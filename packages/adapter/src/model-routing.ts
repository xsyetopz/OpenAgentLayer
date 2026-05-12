import type { AgentRecord } from "@openagentlayer/source";

export type ModelPlan =
	| "plus"
	| "pro-5"
	| "pro-20"
	| "max-5"
	| "max-20"
	| "max-20-long"
	| "opencode-auto"
	| "opencode-auth"
	| "opencode-free";
export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";
export type CodexOrchestrationMode =
	| "symphony"
	| "multi_agent"
	| "multi_agent_v2";

export interface CodexMultiAgentV2Options {
	hideSpawnAgentMetadata?: boolean;
	maxConcurrentThreadsPerSession?: number;
	minWaitTimeoutMs?: number;
	rootAgentUsageHintText?: string;
	subagentUsageHintText?: string;
	usageHintEnabled?: boolean;
	usageHintText?: string;
}

export interface CodexOrchestrationOptions {
	mode?: CodexOrchestrationMode;
	maxDepth?: number;
	maxThreads?: number;
	jobMaxRuntimeSeconds?: number;
	multiAgentV2?: CodexMultiAgentV2Options;
}

export interface RenderOptions {
	plan?: ModelPlan;
	codexPlan?: Extract<ModelPlan, "plus" | "pro-5" | "pro-20">;
	claudePlan?: Extract<ModelPlan, "max-5" | "max-20" | "max-20-long">;
	opencodePlan?: Extract<
		ModelPlan,
		"opencode-auto" | "opencode-auth" | "opencode-free"
	>;
	opencodeModels?: readonly string[];
	codexOrchestration?: CodexOrchestrationOptions;
}

export interface RoutedModel {
	model: string;
	reasoningEffort?: ReasoningEffort;
}

export const OPENCODE_FREE_MODELS = [
	"opencode/nemotron-3-super-free",
	"opencode/minimax-m2.5-free",
	"opencode/hy3-preview-free",
	"opencode/big-pickle",
	"opencode/gpt-5-nano",
] as const;

const LINE_BREAK = /\r?\n/;

const CLAUDE_PLANS: Record<
	Extract<ModelPlan, "max-5" | "max-20" | "max-20-long">,
	Record<string, string>
> = {
	"max-5": {
		aphrodite: "claude-opus-4-6",
		apollo: "claude-sonnet-4-6",
		ares: "claude-haiku-4-5",
		artemis: "claude-haiku-4-5",
		asclepius: "claude-haiku-4-5",
		atalanta: "claude-haiku-4-5",
		athena: "claude-opus-4-6",
		calliope: "claude-haiku-4-5",
		chronos: "claude-haiku-4-5",
		daedalus: "claude-sonnet-4-6",
		demeter: "claude-sonnet-4-6",
		dionysus: "claude-haiku-4-5",
		hecate: "claude-sonnet-4-6",
		hephaestus: "claude-sonnet-4-6",
		hermes: "claude-haiku-4-5",
		hestia: "claude-haiku-4-5",
		janus: "claude-opus-4-6",
		mnemosyne: "claude-haiku-4-5",
		morpheus: "claude-opus-4-6",
		nemesis: "claude-opus-4-6",
		odysseus: "claude-opus-4-6",
		prometheus: "claude-sonnet-4-6",
		themis: "claude-opus-4-6",
	},
	"max-20": {
		aphrodite: "claude-opus-4-6",
		apollo: "claude-sonnet-4-6",
		ares: "claude-sonnet-4-6",
		artemis: "claude-haiku-4-5",
		asclepius: "claude-sonnet-4-6",
		atalanta: "claude-sonnet-4-6",
		athena: "claude-opus-4-6",
		calliope: "claude-haiku-4-5",
		chronos: "claude-haiku-4-5",
		daedalus: "claude-sonnet-4-6",
		demeter: "claude-sonnet-4-6",
		dionysus: "claude-sonnet-4-6",
		hecate: "claude-sonnet-4-6",
		hephaestus: "claude-sonnet-4-6",
		hermes: "claude-sonnet-4-6",
		hestia: "claude-haiku-4-5",
		janus: "claude-opus-4-6",
		mnemosyne: "claude-haiku-4-5",
		morpheus: "claude-opus-4-6",
		nemesis: "claude-opus-4-6",
		odysseus: "claude-opus-4-6",
		prometheus: "claude-sonnet-4-6",
		themis: "claude-opus-4-6",
	},
	"max-20-long": {
		aphrodite: "claude-opus-4-6[1m]",
		apollo: "claude-sonnet-4-6",
		ares: "claude-sonnet-4-6",
		artemis: "claude-haiku-4-5",
		asclepius: "claude-sonnet-4-6",
		atalanta: "claude-sonnet-4-6",
		athena: "claude-opus-4-6[1m]",
		calliope: "claude-haiku-4-5",
		chronos: "claude-haiku-4-5",
		daedalus: "claude-sonnet-4-6",
		demeter: "claude-sonnet-4-6",
		dionysus: "claude-sonnet-4-6",
		hecate: "claude-sonnet-4-6",
		hephaestus: "claude-sonnet-4-6",
		hermes: "claude-sonnet-4-6",
		hestia: "claude-haiku-4-5",
		janus: "claude-opus-4-6[1m]",
		mnemosyne: "claude-haiku-4-5",
		morpheus: "claude-opus-4-6[1m]",
		nemesis: "claude-opus-4-6[1m]",
		odysseus: "claude-opus-4-6[1m]",
		prometheus: "claude-sonnet-4-6",
		themis: "claude-opus-4-6[1m]",
	},
};

const OPENCODE_AUTH_BY_AGENT: Record<string, readonly string[]> = {
	aphrodite: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	apollo: ["opencode/gpt-5.3-codex", "opencode/claude-sonnet-4-6"],
	ares: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	artemis: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	asclepius: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	atalanta: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	athena: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	calliope: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	chronos: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	daedalus: ["opencode/gpt-5.3-codex", "opencode/claude-sonnet-4-6"],
	demeter: ["opencode/gpt-5.3-codex", "opencode/claude-sonnet-4-6"],
	dionysus: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	hecate: ["opencode/gpt-5.3-codex", "opencode/claude-sonnet-4-6"],
	hephaestus: ["opencode/gpt-5.3-codex", "opencode/claude-sonnet-4-6"],
	hermes: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	hestia: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	janus: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	mnemosyne: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	morpheus: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	nemesis: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	odysseus: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	prometheus: ["opencode/gpt-5.3-codex", "opencode/claude-sonnet-4-6"],
	themis: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
};

const OPENCODE_FREE_BY_AGENT: Record<string, string> = {
	aphrodite: OPENCODE_FREE_MODELS[3],
	apollo: OPENCODE_FREE_MODELS[1],
	ares: OPENCODE_FREE_MODELS[2],
	artemis: OPENCODE_FREE_MODELS[4],
	asclepius: OPENCODE_FREE_MODELS[2],
	atalanta: OPENCODE_FREE_MODELS[2],
	athena: OPENCODE_FREE_MODELS[0],
	calliope: OPENCODE_FREE_MODELS[4],
	chronos: OPENCODE_FREE_MODELS[4],
	daedalus: OPENCODE_FREE_MODELS[1],
	demeter: OPENCODE_FREE_MODELS[1],
	dionysus: OPENCODE_FREE_MODELS[2],
	hecate: OPENCODE_FREE_MODELS[1],
	hephaestus: OPENCODE_FREE_MODELS[1],
	hermes: OPENCODE_FREE_MODELS[2],
	hestia: OPENCODE_FREE_MODELS[4],
	janus: OPENCODE_FREE_MODELS[0],
	mnemosyne: OPENCODE_FREE_MODELS[4],
	morpheus: OPENCODE_FREE_MODELS[3],
	nemesis: OPENCODE_FREE_MODELS[0],
	odysseus: OPENCODE_FREE_MODELS[0],
	prometheus: OPENCODE_FREE_MODELS[1],
	themis: OPENCODE_FREE_MODELS[0],
};

const OPENCODE_FORBIDDEN = new Set([
	"opencode/gpt-5.4",
	"opencode/gpt-5.2",
	"opencode/gpt-5.3-codex-spark",
	"opencode/claude-opus-4-7",
]);

export function resolveCodexModel(
	agent: AgentRecord,
	options: RenderOptions = {},
): RoutedModel {
	const plan =
		options.codexPlan ?? (isCodexPlan(options.plan) ? options.plan : undefined);
	const sourceModel = agent.models.codex ?? "gpt-5.4-mini";
	const model = plan ? codexPlanModel(sourceModel, plan) : codexDefaultModel(sourceModel);
	return {
		model,
		...(plan ? { reasoningEffort: codexReasoningEffort(model, plan) } : {}),
	};
}

export function resolveClaudeModel(
	agent: AgentRecord,
	options: RenderOptions = {},
): string {
	const plan =
		options.claudePlan ??
		(isClaudePlan(options.plan) ? options.plan : undefined);
	if (plan)
		return (
			CLAUDE_PLANS[plan][agent.id] ?? agent.models.claude ?? "claude-haiku-4-5"
		);
	return agent.models.claude ?? "claude-haiku-4-5";
}

function codexReasoningEffort(
	model: string,
	plan: Extract<ModelPlan, "plus" | "pro-5" | "pro-20">,
): ReasoningEffort {
	if (model === "gpt-5.3-codex") return plan === "plus" ? "medium" : "high";
	if (model === "gpt-5.5") return "high";
	if (model === "gpt-5.4-mini") return plan === "pro-20" ? "medium" : "low";
	return "low";
}

function codexPlanModel(
	model: string,
	plan: Extract<ModelPlan, "plus" | "pro-5" | "pro-20">,
): string {
	if ((plan === "plus" || plan === "pro-5") && model === "gpt-5.5")
		return "gpt-5.3-codex";
	return model;
}

function codexDefaultModel(model: string): string {
	if (model === "gpt-5.5") return "gpt-5.3-codex";
	return model;
}

export function resolveOpenCodeModel(
	agent: AgentRecord,
	options: RenderOptions = {},
): string {
	const plan =
		options.opencodePlan ??
		(isOpenCodePlan(options.plan) ? options.plan : undefined);
	if (plan === "opencode-free")
		return OPENCODE_FREE_BY_AGENT[agent.id] ?? OPENCODE_FREE_MODELS[0];
	if (plan === "opencode-auth" || plan === "opencode-auto") {
		const detected = new Set(
			(options.opencodeModels ?? []).filter(isAllowedOpenCodeModel),
		);
		const preferred = OPENCODE_AUTH_BY_AGENT[agent.id] ?? [];
		const selected = preferred.find((model) => detected.has(model));
		if (selected) return selected;
		if (plan === "opencode-auth")
			throw new Error(
				`OpenCode auth plan has no allowed detected model for \`${agent.id}\`.`,
			);
		return OPENCODE_FREE_BY_AGENT[agent.id] ?? OPENCODE_FREE_MODELS[0];
	}
	return (
		agent.models.opencode ??
		OPENCODE_FREE_BY_AGENT[agent.id] ??
		OPENCODE_FREE_MODELS[0]
	);
}

export function parseOpenCodeModels(output: string): string[] {
	return output
		.split(LINE_BREAK)
		.map((line) => line.trim())
		.filter((line) => line.startsWith("opencode/"));
}

export function isAllowedOpenCodeModel(model: string): boolean {
	if (OPENCODE_FORBIDDEN.has(model)) return false;
	return (
		model === "opencode/gpt-5.5" ||
		model === "opencode/gpt-5.4-mini" ||
		model === "opencode/gpt-5.3-codex" ||
		model === "opencode/claude-opus-4-6" ||
		model === "opencode/claude-opus-4-6[1m]" ||
		model === "opencode/claude-sonnet-4-6" ||
		model === "opencode/claude-haiku-4-5" ||
		(OPENCODE_FREE_MODELS as readonly string[]).includes(model)
	);
}

export function isCodexPlan(
	plan: string | undefined,
): plan is Extract<ModelPlan, "plus" | "pro-5" | "pro-20"> {
	return plan === "plus" || plan === "pro-5" || plan === "pro-20";
}

export function isClaudePlan(
	plan: string | undefined,
): plan is Extract<ModelPlan, "max-5" | "max-20" | "max-20-long"> {
	return plan === "max-5" || plan === "max-20" || plan === "max-20-long";
}

export function isOpenCodePlan(
	plan: string | undefined,
): plan is Extract<
	ModelPlan,
	"opencode-auto" | "opencode-auth" | "opencode-free"
> {
	return (
		plan === "opencode-auto" ||
		plan === "opencode-auth" ||
		plan === "opencode-free"
	);
}

export function assertKnownModelPlan(plan: string): asserts plan is ModelPlan {
	if (
		![
			"plus",
			"pro-5",
			"pro-20",
			"max-5",
			"max-20",
			"max-20-long",
			"opencode-auto",
			"opencode-auth",
			"opencode-free",
		].includes(plan)
	)
		throw new Error(`Unsupported model plan \`${plan}\``);
}
