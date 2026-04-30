import { COPILOT_MODELS, getCopilotPlan } from "../../source/subscriptions.mjs";
import type { ProviderAvailability } from "./types.ts";

export const MODELS = {
	COPILOT_GPT_5_MINI: COPILOT_MODELS.gpt5Mini,
	COPILOT_GPT_5_2: COPILOT_MODELS.gpt52,
	COPILOT_GPT_5_3_CODEX: COPILOT_MODELS.gpt53Codex,
	COPILOT_GPT_5_4_MINI: COPILOT_MODELS.gpt54Mini,
	OPENCODE_BIG_PICKLE: "opencode/big-pickle",
	OPENCODE_GPT_5_NANO: "opencode/gpt-5-nano",
	OPENCODE_MINIMAX_M2_5_FREE: "opencode/minimax-m2.5-free",
	OPENCODE_NEMOTRON_3_SUPER_FREE: "opencode/nemotron-3-super-free",
	OPENCODE_QWEN3_6_PLUS_FREE: "opencode/qwen3.6-plus-free",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

export type AgentRole =
	| "build"
	| "plan"
	| "explore"
	| "review"
	| "implement"
	| "document"
	| "test";

interface ModelConfig {
	model: ModelId;
	temperature?: number;
	top_p?: number;
	thinking?: boolean;
}

const FREE_FALLBACK: Record<AgentRole, ModelConfig> = {
	build: { model: MODELS.OPENCODE_BIG_PICKLE, temperature: 0.7 },
	plan: { model: MODELS.OPENCODE_QWEN3_6_PLUS_FREE, temperature: 0.8 },
	explore: {
		model: MODELS.OPENCODE_QWEN3_6_PLUS_FREE,
		temperature: 0.8,
	},
	review: {
		model: MODELS.OPENCODE_QWEN3_6_PLUS_FREE,
		temperature: 0.7,
	},
	implement: { model: MODELS.OPENCODE_BIG_PICKLE, temperature: 0.7 },
	document: {
		model: MODELS.OPENCODE_QWEN3_6_PLUS_FREE,
		temperature: 1.0,
	},
	test: { model: MODELS.OPENCODE_QWEN3_6_PLUS_FREE, temperature: 0.7 },
};

export interface ModelAssignment {
	model: ModelId;
	tier: "custom" | "copilot" | "free";
	temperature?: number;
	top_p?: number;
	thinking?: boolean;
}

function assignModelFromConfig(
	role: AgentRole,
	configMap: Record<AgentRole, ModelConfig>,
	tier: ModelAssignment["tier"],
): ModelAssignment {
	const config = configMap[role];
	const assignment: ModelAssignment = { model: config.model, tier };
	if (config.temperature !== undefined) {
		assignment.temperature = config.temperature;
	}
	if (config.top_p !== undefined) {
		assignment.top_p = config.top_p;
	}
	if ("thinking" in config && config.thinking !== undefined) {
		assignment.thinking = config.thinking;
	}
	return assignment;
}

function copilotFallback(
	role: AgentRole,
	planName: string | undefined,
): ModelAssignment {
	const roleModels = getCopilotPlan(planName).roleModels;
	const assignment: ModelAssignment = {
		model: roleModels[role] as ModelId,
		tier: "copilot",
	};
	assignment.temperature =
		role === "document"
			? 1.0
			: role === "plan" || role === "explore"
				? 0.8
				: 0.7;
	return assignment;
}

export function resolveModel(
	role: AgentRole,
	providers: ProviderAvailability,
	modelOverrides: Record<string, string> = {},
	defaultModel?: string,
	copilotPlan?: string,
): ModelAssignment {
	const configuredModel = modelOverrides[role] ?? defaultModel;
	if (configuredModel) {
		return {
			model: configuredModel as ModelId,
			tier: "custom",
		};
	}
	if (providers.githubCopilot) {
		return copilotFallback(
			role,
			copilotPlan ?? process.env["OABTW_COPILOT_PLAN"],
		);
	}
	return assignModelFromConfig(role, FREE_FALLBACK, "free");
}
