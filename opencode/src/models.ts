import type { ProviderAvailability } from "./types.ts";

export const MODELS = {
	COPILOT_GPT_5_MINI: "github-copilot/gpt-5-mini",
	OPENCODE_BIG_PICKLE: "opencode/big-pickle",
	OPENCODE_GPT_5_NANO: "opencode/gpt-5-nano",
	OPENCODE_TRINITY_LARGE_PREVIEW_FREE: "opencode/trinity-large-preview-free",
	OPENCODE_MINIMAX_M2_5_FREE: "opencode/minimax-m2.5-free",
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

const COPILOT_FALLBACK: Record<AgentRole, ModelConfig> = {
	build: { model: MODELS.COPILOT_GPT_5_MINI, temperature: 0.7 },
	plan: { model: MODELS.COPILOT_GPT_5_MINI, temperature: 0.8 },
	explore: { model: MODELS.COPILOT_GPT_5_MINI, temperature: 0.8 },
	review: { model: MODELS.COPILOT_GPT_5_MINI, temperature: 0.7 },
	implement: { model: MODELS.COPILOT_GPT_5_MINI, temperature: 0.7 },
	document: { model: MODELS.COPILOT_GPT_5_MINI, temperature: 1.0 },
	test: { model: MODELS.COPILOT_GPT_5_MINI, temperature: 0.7 },
};

const FREE_FALLBACK: Record<AgentRole, ModelConfig> = {
	build: { model: MODELS.OPENCODE_BIG_PICKLE, temperature: 0.7 },
	plan: { model: MODELS.OPENCODE_TRINITY_LARGE_PREVIEW_FREE, temperature: 0.8 },
	explore: {
		model: MODELS.OPENCODE_TRINITY_LARGE_PREVIEW_FREE,
		temperature: 0.8,
	},
	review: {
		model: MODELS.OPENCODE_TRINITY_LARGE_PREVIEW_FREE,
		temperature: 0.7,
	},
	implement: { model: MODELS.OPENCODE_BIG_PICKLE, temperature: 0.7 },
	document: {
		model: MODELS.OPENCODE_TRINITY_LARGE_PREVIEW_FREE,
		temperature: 1.0,
	},
	test: { model: MODELS.OPENCODE_TRINITY_LARGE_PREVIEW_FREE, temperature: 0.7 },
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

export function resolveModel(
	role: AgentRole,
	providers: ProviderAvailability,
	modelOverrides: Record<string, string> = {},
	defaultModel?: string,
): ModelAssignment {
	const configuredModel = modelOverrides[role] ?? defaultModel;
	if (configuredModel) {
		return {
			model: configuredModel as ModelId,
			tier: "custom",
		};
	}
	if (providers.githubCopilot) {
		return assignModelFromConfig(role, COPILOT_FALLBACK, "copilot");
	}
	return assignModelFromConfig(role, FREE_FALLBACK, "free");
}
