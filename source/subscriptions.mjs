// @ts-nocheck
export const SWARM_POLICIES = {
	conservative: {
		maxThreads: 3,
		maxDepth: 1,
		jobMaxRuntimeSeconds: 1800,
		label: "coordinator + up to 2 specialists",
	},
	standard: {
		maxThreads: 4,
		maxDepth: 1,
		jobMaxRuntimeSeconds: 1800,
		label: "coordinator + up to 3 specialists",
	},
	aggressive: {
		maxThreads: 5,
		maxDepth: 2,
		jobMaxRuntimeSeconds: 2700,
		label: "coordinator + up to 4 specialists",
	},
	max: {
		maxThreads: 6,
		maxDepth: 2,
		jobMaxRuntimeSeconds: 3600,
		label: "coordinator + up to 5 specialists",
	},
};

export const DEFAULT_CLAUDE_PLAN = "max-5";
export const DEFAULT_CODEX_PLAN = "pro-5";
export const DEFAULT_COPILOT_PLAN = "pro";
export const SUPPORTED_CLAUDE_MODEL_IDS = [
	"claude-opus-4-7",
	"claude-sonnet-4-6",
	"claude-haiku-4-5",
];
export const SUPPORTED_CODEX_MODEL_IDS = [
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.4-mini",
	"gpt-5.3-codex",
	"gpt-5.3-codex-spark",
	"gpt-5.2",
];

const SUPPORTED_CODEX_MODELS = new Set(SUPPORTED_CODEX_MODEL_IDS);
const SUPPORTED_CLAUDE_MODELS = new Set(SUPPORTED_CLAUDE_MODEL_IDS);

const commonFeatureFlags = {
	codexHooks: true,
	multiAgentV2: true,
	collaborationModes: true,
	defaultModeRequestUserInput: true,
	fastMode: false,
	memories: true,
	shellTool: true,
	shellSnapshot: true,
	skillMcpDependencyInstall: true,
	unifiedExec: true,
};

export function isSupportedCodexModel(model) {
	return SUPPORTED_CODEX_MODELS.has(model);
}

export function assertSupportedCodexModel(model, context = "Codex model") {
	if (!isSupportedCodexModel(model)) {
		throw new Error(
			`${context} must be one of: ${SUPPORTED_CODEX_MODEL_IDS.join(", ")}. Received: ${model}`,
		);
	}
	return model;
}

export function isSupportedClaudeModel(model) {
	return SUPPORTED_CLAUDE_MODELS.has(model);
}

export function assertSupportedClaudeModel(model, context = "Claude model") {
	if (!isSupportedClaudeModel(model)) {
		throw new Error(
			`${context} must be one of: ${SUPPORTED_CLAUDE_MODEL_IDS.join(", ")}. Received: ${model}`,
		);
	}
	return model;
}

export const CODEX_PLANS = {
	plus: {
		name: "plus",
		displayName: "Plus",
		swarmPolicy: "standard",
		agentAssignments: {
			athena: ["gpt-5.5", "high"],
			hephaestus: ["gpt-5.3-codex", "medium"],
			nemesis: ["gpt-5.3-codex", "high"],
			odysseus: ["gpt-5.5", "high"],
			hermes: ["gpt-5.4-mini", "medium"],
			atalanta: ["gpt-5.4-mini", "high"],
			calliope: ["gpt-5.4-mini", "high"],
		},
		profiles: {
			main: {
				model: "gpt-5.5",
				modelReasoning: "medium",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			utility: {
				model: "gpt-5.4-mini",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			implementation: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			review: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			approvalAuto: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			runtimeLong: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				backgroundTerminalMaxTimeout: 7200,
				features: {
					...commonFeatureFlags,
					unifiedExec: true,
					preventIdleSleep: true,
				},
			},
		},
	},
	"pro-5": {
		name: "pro-5",
		displayName: "Pro 5x",
		swarmPolicy: "aggressive",
		agentAssignments: {
			athena: ["gpt-5.5", "high"],
			hephaestus: ["gpt-5.3-codex", "medium"],
			nemesis: ["gpt-5.3-codex", "high"],
			odysseus: ["gpt-5.5", "high"],
			hermes: ["gpt-5.4-mini", "medium"],
			atalanta: ["gpt-5.4-mini", "high"],
			calliope: ["gpt-5.4-mini", "high"],
		},
		profiles: {
			main: {
				model: "gpt-5.5",
				modelReasoning: "medium",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			utility: {
				model: "gpt-5.4-mini",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			implementation: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			review: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			approvalAuto: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			runtimeLong: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				backgroundTerminalMaxTimeout: 7200,
				features: {
					...commonFeatureFlags,
					unifiedExec: true,
					preventIdleSleep: true,
				},
			},
		},
	},
	"pro-20": {
		name: "pro-20",
		displayName: "Pro 20x",
		swarmPolicy: "max",
		agentAssignments: {
			athena: ["gpt-5.5", "high"],
			hephaestus: ["gpt-5.3-codex", "medium"],
			nemesis: ["gpt-5.3-codex", "high"],
			odysseus: ["gpt-5.5", "high"],
			hermes: ["gpt-5.4-mini", "medium"],
			atalanta: ["gpt-5.4-mini", "high"],
			calliope: ["gpt-5.4-mini", "high"],
		},
		profiles: {
			main: {
				model: "gpt-5.5",
				modelReasoning: "medium",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			utility: {
				model: "gpt-5.4-mini",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			implementation: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			review: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			approvalAuto: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			runtimeLong: {
				model: "gpt-5.3-codex",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				approvalsReviewer: "auto_review",
				sandbox: "workspace-write",
				backgroundTerminalMaxTimeout: 7200,
				features: {
					...commonFeatureFlags,
					unifiedExec: true,
					preventIdleSleep: true,
				},
			},
		},
	},
};

for (const [planName, plan] of Object.entries(CODEX_PLANS)) {
	for (const [agentName, [model]] of Object.entries(plan.agentAssignments)) {
		assertSupportedCodexModel(
			model,
			`CODEX_PLANS.${planName}.agentAssignments.${agentName}`,
		);
	}
	for (const [profileName, profile] of Object.entries(plan.profiles)) {
		assertSupportedCodexModel(
			profile.model,
			`CODEX_PLANS.${planName}.profiles.${profileName}.model`,
		);
	}
}

function profileToRoute(profile) {
	return {
		model: profile.model,
		reasoning: profile.modelReasoning,
		verbosity: profile.verbosity,
	};
}

export const CLAUDE_PLANS = {
	pro: {
		name: "pro",
		displayName: "Pro",
		swarmPolicy: "conservative",
		models: {
			ccaModel: "claude-sonnet-4-6",
			opusModel: "claude-sonnet-4-6",
			sonnetModel: "claude-sonnet-4-6",
			haikuModel: "claude-haiku-4-5",
		},
	},
	"max-5": {
		name: "max-5",
		displayName: "Max 5x",
		swarmPolicy: "aggressive",
		models: {
			ccaModel: "claude-opus-4-7",
			opusModel: "claude-opus-4-7",
			sonnetModel: "claude-sonnet-4-6",
			haikuModel: "claude-haiku-4-5",
		},
	},
	"max-20": {
		name: "max-20",
		displayName: "Max 20x",
		swarmPolicy: "max",
		models: {
			ccaModel: "claude-opus-4-7",
			opusModel: "claude-opus-4-7",
			sonnetModel: "claude-sonnet-4-6",
			haikuModel: "claude-sonnet-4-6",
		},
	},
};

for (const [planName, plan] of Object.entries(CLAUDE_PLANS)) {
	for (const [modelName, model] of Object.entries(plan.models)) {
		assertSupportedClaudeModel(
			model,
			`CLAUDE_PLANS.${planName}.models.${modelName}`,
		);
	}
}

export const COPILOT_MODELS = {
	gpt5Mini: "github-copilot/gpt-5-mini",
	gpt52: "github-copilot/gpt-5.2",
	gpt53Codex: "github-copilot/gpt-5.3-codex",
	gpt54Mini: "github-copilot/gpt-5.4-mini",
};

export const COPILOT_PLANS = {
	pro: {
		name: "pro",
		displayName: "Pro",
		swarmPolicy: "conservative",
		roleModels: {
			build: COPILOT_MODELS.gpt5Mini,
			plan: COPILOT_MODELS.gpt52,
			explore: COPILOT_MODELS.gpt52,
			review: COPILOT_MODELS.gpt52,
			implement: COPILOT_MODELS.gpt52,
			document: COPILOT_MODELS.gpt5Mini,
			test: COPILOT_MODELS.gpt5Mini,
		},
	},
	"pro-plus": {
		name: "pro-plus",
		displayName: "Pro+",
		swarmPolicy: "aggressive",
		roleModels: {
			build: COPILOT_MODELS.gpt53Codex,
			plan: COPILOT_MODELS.gpt52,
			explore: COPILOT_MODELS.gpt52,
			review: COPILOT_MODELS.gpt52,
			implement: COPILOT_MODELS.gpt53Codex,
			document: COPILOT_MODELS.gpt54Mini,
			test: COPILOT_MODELS.gpt54Mini,
		},
	},
};

export function normalizeClaudePlan(value = "") {
	return CLAUDE_PLANS[value] ? value : "";
}

export function normalizeCodexPlan(value = "") {
	return CODEX_PLANS[value] ? value : "";
}

export function normalizeCopilotPlan(value = "") {
	return COPILOT_PLANS[value] ? value : "";
}

export const resolveClaudePlan = normalizeClaudePlan;
export const resolveCodexPlan = normalizeCodexPlan;
export const resolveCopilotPlan = normalizeCopilotPlan;

export function getCodexPlan(value = "") {
	const planName = normalizeCodexPlan(value) || DEFAULT_CODEX_PLAN;
	const plan = CODEX_PLANS[planName];
	return {
		id: plan.name,
		displayName: plan.displayName,
		swarm: SWARM_POLICIES[plan.swarmPolicy],
		agentAssignments: plan.agentAssignments,
		profiles: plan.profiles,
		main: profileToRoute(plan.profiles.main),
		implement: profileToRoute(plan.profiles.implementation),
		review: profileToRoute(plan.profiles.review),
		utility: profileToRoute(plan.profiles.utility),
		approvalAuto: profileToRoute(plan.profiles.approvalAuto),
		runtimeLong: profileToRoute(plan.profiles.runtimeLong),
	};
}

export function getClaudePlan(value = "") {
	const planName = normalizeClaudePlan(value) || DEFAULT_CLAUDE_PLAN;
	const plan = CLAUDE_PLANS[planName];
	return {
		id: plan.name,
		displayName: plan.displayName,
		swarm: SWARM_POLICIES[plan.swarmPolicy],
		models: plan.models,
	};
}

export function getCopilotPlan(value = "") {
	const planName = normalizeCopilotPlan(value) || DEFAULT_COPILOT_PLAN;
	const plan = COPILOT_PLANS[planName];
	return {
		id: plan.name,
		displayName: plan.displayName,
		swarm: SWARM_POLICIES[plan.swarmPolicy],
		roleModels: plan.roleModels,
	};
}
