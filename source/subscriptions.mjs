// @ts-nocheck
export const SWARM_POLICIES = {
	conservative: {
		maxThreads: 3,
		label: "coordinator + up to 2 specialists",
	},
	standard: {
		maxThreads: 4,
		label: "coordinator + up to 3 specialists",
	},
	aggressive: {
		maxThreads: 5,
		label: "coordinator + up to 4 specialists",
	},
	max: {
		maxThreads: 6,
		label: "coordinator + up to 5 specialists",
	},
};

export const DEFAULT_CLAUDE_PLAN = "pro-5";
export const DEFAULT_CODEX_PLAN = "pro-5";
export const DEFAULT_COPILOT_PLAN = "pro";

export const CLAUDE_PLAN_ALIASES = {
	"5x": "pro-5",
	"20x": "pro-20",
};

export const CODEX_PLAN_ALIASES = {
	pro: "pro-5",
};

const commonFeatureFlags = {
	codexHooks: true,
	sqlite: true,
	multiAgent: true,
	fastMode: false,
};

export const CODEX_PLANS = {
	go: {
		name: "go",
		displayName: "Go",
		swarmPolicy: "conservative",
		agentAssignments: {
			athena: ["gpt-5.4-mini", "high"],
			hephaestus: ["gpt-5.3-codex", "high"],
			nemesis: ["gpt-5.4-mini", "high"],
			odysseus: ["gpt-5.4-mini", "high"],
			hermes: ["gpt-5.4-mini", "medium"],
			atalanta: ["gpt-5.4-mini", "medium"],
			calliope: ["gpt-5.4-mini", "medium"],
		},
		profiles: {
			main: {
				model: "gpt-5.4-mini",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			utility: {
				model: "gpt-5.4-mini",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			acceptEdits: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "never",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			longrun: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
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
	plus: {
		name: "plus",
		displayName: "Plus",
		swarmPolicy: "standard",
		agentAssignments: {
			athena: ["gpt-5.3-codex", "xhigh"],
			hephaestus: ["gpt-5.3-codex", "high"],
			nemesis: ["gpt-5.3-codex", "xhigh"],
			odysseus: ["gpt-5.3-codex", "xhigh"],
			hermes: ["gpt-5.4-mini", "medium"],
			atalanta: ["gpt-5.4-mini", "medium"],
			calliope: ["gpt-5.4-mini", "medium"],
		},
		profiles: {
			main: {
				model: "gpt-5.3-codex",
				modelReasoning: "xhigh",
				planReasoning: "xhigh",
				verbosity: "low",
				approval: "on-request",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			utility: {
				model: "gpt-5.4-mini",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			acceptEdits: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "never",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			longrun: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
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
			athena: ["gpt-5.2", "xhigh"],
			hephaestus: ["gpt-5.3-codex", "high"],
			nemesis: ["gpt-5.2", "xhigh"],
			odysseus: ["gpt-5.2", "xhigh"],
			hermes: ["gpt-5.3-codex-spark", "medium"],
			atalanta: ["gpt-5.3-codex-spark", "medium"],
			calliope: ["gpt-5.3-codex-spark", "medium"],
		},
		profiles: {
			main: {
				model: "gpt-5.2",
				modelReasoning: "xhigh",
				planReasoning: "xhigh",
				verbosity: "low",
				approval: "on-request",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			utility: {
				model: "gpt-5.3-codex-spark",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			acceptEdits: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "never",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			longrun: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
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
			athena: ["gpt-5.2", "xhigh"],
			hephaestus: ["gpt-5.3-codex", "high"],
			nemesis: ["gpt-5.2", "xhigh"],
			odysseus: ["gpt-5.2", "xhigh"],
			hermes: ["gpt-5.3-codex-spark", "medium"],
			atalanta: ["gpt-5.3-codex-spark", "medium"],
			calliope: ["gpt-5.3-codex-spark", "medium"],
		},
		profiles: {
			main: {
				model: "gpt-5.2",
				modelReasoning: "xhigh",
				planReasoning: "xhigh",
				verbosity: "low",
				approval: "on-request",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			utility: {
				model: "gpt-5.3-codex-spark",
				modelReasoning: "medium",
				planReasoning: "medium",
				verbosity: "low",
				approval: "on-request",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			acceptEdits: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "never",
				sandbox: "workspace-write",
				features: commonFeatureFlags,
			},
			longrun: {
				model: "gpt-5.3-codex",
				modelReasoning: "high",
				planReasoning: "high",
				verbosity: "low",
				approval: "on-request",
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

function profileToRoute(profile) {
	return {
		model: profile.model,
		reasoning: profile.modelReasoning,
		verbosity: profile.verbosity,
	};
}

export const CLAUDE_PLANS = {
	plus: {
		name: "plus",
		displayName: "Plus",
		swarmPolicy: "conservative",
		models: {
			ccaModel: "claude-sonnet-4-6",
			opusModel: "claude-sonnet-4-6",
			sonnetModel: "claude-sonnet-4-6",
			haikuModel: "claude-haiku-4-5",
		},
	},
	"pro-5": {
		name: "pro-5",
		displayName: "Pro 5x",
		swarmPolicy: "aggressive",
		models: {
			ccaModel: "opusplan",
			opusModel: "claude-opus-4-6[1m]",
			sonnetModel: "claude-sonnet-4-6",
			haikuModel: "claude-haiku-4-5",
		},
	},
	"pro-20": {
		name: "pro-20",
		displayName: "Pro 20x",
		swarmPolicy: "max",
		models: {
			ccaModel: "opus[1m]",
			opusModel: "claude-opus-4-6[1m]",
			sonnetModel: "claude-sonnet-4-6",
			haikuModel: "claude-sonnet-4-6",
		},
	},
};

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
	const normalized = CLAUDE_PLAN_ALIASES[value] ?? value ?? "";
	return CLAUDE_PLANS[normalized] ? normalized : "";
}

export function normalizeCodexPlan(value = "") {
	const normalized = CODEX_PLAN_ALIASES[value] ?? value ?? "";
	return CODEX_PLANS[normalized] ? normalized : "";
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
		main: profileToRoute(plan.profiles.main),
		implement: profileToRoute(plan.profiles.acceptEdits),
		utility: profileToRoute(plan.profiles.utility),
		longrun: profileToRoute(plan.profiles.longrun),
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
