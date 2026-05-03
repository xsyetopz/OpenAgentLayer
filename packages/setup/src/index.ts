import type { Provider } from "@openagentlayer/source";
import {
	type OptionalTool,
	optionalFeatureCommands,
} from "@openagentlayer/toolchain";

export type SetupScope = "project" | "global";
export type SetupPhaseName = "toolchain" | "deploy" | "plugins" | "check";

export interface SetupPlanOptions {
	providers: Provider[];
	skippedProviders?: readonly { provider: Provider; reason: string }[];
	scope: SetupScope;
	home: string;
	target?: string;
	binDir?: string;
	optionalTools?: OptionalTool[];
	rtk?: boolean;
	dryRun?: boolean;
}

export interface SetupPhase {
	name: SetupPhaseName;
	action: string;
	commands: string[];
}

export interface SetupPlan {
	providers: Provider[];
	skippedProviders: readonly { provider: Provider; reason: string }[];
	scope: SetupScope;
	home: string;
	target: string;
	binDir?: string;
	optionalTools: OptionalTool[];
	dryRun: boolean;
	phases: SetupPhase[];
}

export function planSetup(options: SetupPlanOptions): SetupPlan {
	const optionalTools = options.optionalTools ?? [];
	const phases: SetupPhase[] = [];
	if (options.rtk || optionalTools.length > 0) {
		phases.push({
			name: "toolchain",
			action: "Install optional OAL tool surfaces",
			commands: [
				...(options.rtk
					? [
							"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh",
							"rtk init -g --auto-patch",
							"rtk init -g --codex",
							"rtk init -g --opencode",
						]
					: []),
				...optionalFeatureCommands("install", optionalTools),
			],
		});
	}
	phases.push({
		name: "deploy",
		action: "Deploy provider-native OAL artifacts",
		commands: [],
	});
	phases.push({
		name: "plugins",
		action: "Sync provider plugin payloads",
		commands: [],
	});
	phases.push({
		name: "check",
		action: "Validate source and installed state",
		commands: [],
	});
	const plan: SetupPlan = {
		providers: options.providers,
		skippedProviders: options.skippedProviders ?? [],
		scope: options.scope,
		home: options.home,
		target: options.target ?? options.home,
		optionalTools,
		dryRun: options.dryRun === true,
		phases,
	};
	if (options.binDir) plan.binDir = options.binDir;
	return plan;
}

export function renderSetupPlan(plan: SetupPlan): string {
	const lines = [
		`OpenAgentLayer setup · ${plan.dryRun ? "dry-run" : "apply"}`,
		"◇ Provider check",
		`  providers: ${plan.providers.join(", ") || "none"}`,
	];
	for (const skipped of plan.skippedProviders)
		lines.push(`  ! skip ${skipped.provider}: ${skipped.reason}`);
	lines.push("◇ Target");
	lines.push(`  scope: ${plan.scope}`);
	lines.push(`  home: ${plan.home}`);
	lines.push(`  target: ${plan.target}`);
	if (plan.binDir) lines.push(`  bin: ${plan.binDir}`);
	lines.push("◇ Optional tools");
	lines.push(`  selected: ${plan.optionalTools.join(", ") || "none"}`);
	for (const phase of plan.phases) {
		lines.push(`◇ ${phase.action}`);
		for (const command of phase.commands) lines.push(`  $ ${command}`);
	}
	lines.push("└ ✓ Setup plan ready");
	return `${lines.join("\n")}\n`;
}
