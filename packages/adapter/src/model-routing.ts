import type { AgentRecord, ModelClass } from "@openagentlayer/source";

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
export type ReasoningEffort = "low" | "medium" | "high";

export interface RenderOptions {
	plan?: ModelPlan;
	codexPlan?: Extract<ModelPlan, "plus" | "pro-5" | "pro-20">;
	claudePlan?: Extract<ModelPlan, "max-5" | "max-20" | "max-20-long">;
	opencodePlan?: Extract<
		ModelPlan,
		"opencode-auto" | "opencode-auth" | "opencode-free"
	>;
	opencodeModels?: readonly string[];
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

const CODEX_PLANS: Record<
	Extract<ModelPlan, "plus" | "pro-5" | "pro-20">,
	Record<ModelClass, RoutedModel>
> = {
	plus: {
		architect: { model: "gpt-5.5", reasoningEffort: "low" },
		orchestrator: { model: "gpt-5.5", reasoningEffort: "low" },
		reviewer: { model: "gpt-5.5", reasoningEffort: "low" },
		implementer: { model: "gpt-5.3-codex", reasoningEffort: "medium" },
		specialist: { model: "gpt-5.3-codex", reasoningEffort: "medium" },
		explorer: { model: "gpt-5.4-mini", reasoningEffort: "low" },
		validator: { model: "gpt-5.4-mini", reasoningEffort: "low" },
		maintainer: { model: "gpt-5.4-mini", reasoningEffort: "low" },
		taste: { model: "gpt-5.5", reasoningEffort: "low" },
	},
	"pro-5": {
		architect: { model: "gpt-5.5", reasoningEffort: "medium" },
		orchestrator: { model: "gpt-5.5", reasoningEffort: "medium" },
		reviewer: { model: "gpt-5.5", reasoningEffort: "medium" },
		implementer: { model: "gpt-5.3-codex", reasoningEffort: "high" },
		specialist: { model: "gpt-5.3-codex", reasoningEffort: "high" },
		explorer: { model: "gpt-5.4-mini", reasoningEffort: "low" },
		validator: { model: "gpt-5.4-mini", reasoningEffort: "low" },
		maintainer: { model: "gpt-5.4-mini", reasoningEffort: "low" },
		taste: { model: "gpt-5.5", reasoningEffort: "medium" },
	},
	"pro-20": {
		architect: { model: "gpt-5.5", reasoningEffort: "medium" },
		orchestrator: { model: "gpt-5.5", reasoningEffort: "medium" },
		reviewer: { model: "gpt-5.5", reasoningEffort: "high" },
		implementer: { model: "gpt-5.3-codex", reasoningEffort: "high" },
		specialist: { model: "gpt-5.3-codex", reasoningEffort: "high" },
		explorer: { model: "gpt-5.4-mini", reasoningEffort: "medium" },
		validator: { model: "gpt-5.4-mini", reasoningEffort: "medium" },
		maintainer: { model: "gpt-5.4-mini", reasoningEffort: "medium" },
		taste: { model: "gpt-5.5", reasoningEffort: "high" },
	},
};

const CLAUDE_PLANS: Record<
	Extract<ModelPlan, "max-5" | "max-20" | "max-20-long">,
	Record<ModelClass, string>
> = {
	"max-5": {
		architect: "claude-opus-4-6",
		orchestrator: "claude-opus-4-6",
		reviewer: "claude-opus-4-6",
		implementer: "claude-sonnet-4-6",
		specialist: "claude-sonnet-4-6",
		explorer: "claude-haiku-4-5",
		validator: "claude-haiku-4-5",
		maintainer: "claude-haiku-4-5",
		taste: "claude-opus-4-6",
	},
	"max-20": {
		architect: "claude-opus-4-6",
		orchestrator: "claude-opus-4-6",
		reviewer: "claude-opus-4-6",
		implementer: "claude-sonnet-4-6",
		specialist: "claude-sonnet-4-6",
		explorer: "claude-sonnet-4-6",
		validator: "claude-sonnet-4-6",
		maintainer: "claude-haiku-4-5",
		taste: "claude-opus-4-6",
	},
	"max-20-long": {
		architect: "claude-opus-4-6[1m]",
		orchestrator: "claude-opus-4-6[1m]",
		reviewer: "claude-opus-4-6[1m]",
		implementer: "claude-sonnet-4-6",
		specialist: "claude-sonnet-4-6",
		explorer: "claude-sonnet-4-6",
		validator: "claude-sonnet-4-6",
		maintainer: "claude-haiku-4-5",
		taste: "claude-opus-4-6[1m]",
	},
};

const OPENCODE_AUTH_BY_CLASS: Record<ModelClass, readonly string[]> = {
	architect: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	orchestrator: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	reviewer: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
	implementer: ["opencode/gpt-5.3-codex", "opencode/claude-sonnet-4-6"],
	specialist: ["opencode/gpt-5.3-codex", "opencode/claude-sonnet-4-6"],
	explorer: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	validator: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	maintainer: ["opencode/gpt-5.4-mini", "opencode/claude-haiku-4-5"],
	taste: ["opencode/gpt-5.5", "opencode/claude-opus-4-6"],
};

const OPENCODE_FREE_BY_CLASS: Record<ModelClass, string> = {
	architect: OPENCODE_FREE_MODELS[0],
	orchestrator: OPENCODE_FREE_MODELS[0],
	reviewer: OPENCODE_FREE_MODELS[0],
	implementer: OPENCODE_FREE_MODELS[1],
	specialist: OPENCODE_FREE_MODELS[1],
	explorer: OPENCODE_FREE_MODELS[2],
	validator: OPENCODE_FREE_MODELS[2],
	maintainer: OPENCODE_FREE_MODELS[4],
	taste: OPENCODE_FREE_MODELS[3],
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
	if (plan) return CODEX_PLANS[plan][agent.modelClass];
	return { model: agent.models.codex ?? "gpt-5.4-mini" };
}

export function resolveClaudeModel(
	agent: AgentRecord,
	options: RenderOptions = {},
): string {
	const plan =
		options.claudePlan ??
		(isClaudePlan(options.plan) ? options.plan : undefined);
	if (plan) return CLAUDE_PLANS[plan][agent.modelClass];
	return agent.models.claude ?? "claude-haiku-4-5";
}

export function resolveOpenCodeModel(
	agent: AgentRecord,
	options: RenderOptions = {},
): string {
	const plan =
		options.opencodePlan ??
		(isOpenCodePlan(options.plan) ? options.plan : undefined);
	if (plan === "opencode-free") return OPENCODE_FREE_BY_CLASS[agent.modelClass];
	if (plan === "opencode-auth" || plan === "opencode-auto") {
		const detected = new Set(
			(options.opencodeModels ?? []).filter(isAllowedOpenCodeModel),
		);
		const selected = OPENCODE_AUTH_BY_CLASS[agent.modelClass].find((model) =>
			detected.has(model),
		);
		if (selected) return selected;
		if (plan === "opencode-auth")
			throw new Error(
				`OpenCode auth plan has no allowed detected model for ${agent.id}.`,
			);
		return OPENCODE_FREE_BY_CLASS[agent.modelClass];
	}
	return agent.models.opencode ?? OPENCODE_FREE_BY_CLASS[agent.modelClass];
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
		throw new Error(`Unsupported model plan ${plan}.`);
}
