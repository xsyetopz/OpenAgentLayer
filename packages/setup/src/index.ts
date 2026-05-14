import type { Provider } from "@openagentlayer/source";
import { RTK_INSTALL_COMMAND } from "@openagentlayer/source";
import {
	type OptionalTool,
	optionalFeatureCommands,
	planToolchainInstall,
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
	repoRoot?: string;
	optionalTools?: OptionalTool[];
	context7ApiKey?: string;
	toolchain?: boolean;
	hasHomebrew?: boolean;
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
	const optionalFeatureOptions = {
		providers: options.providers,
		scope: options.scope,
		targetRoot: options.target ?? options.home,
		...(options.repoRoot ? { repoRoot: options.repoRoot } : {}),
		...(options.context7ApiKey
			? { context7ApiKey: options.context7ApiKey }
			: {}),
	};
	const phases: SetupPhase[] = [];
	if (options.toolchain) {
		const toolchainPlan = planToolchainInstall({
			os: process.platform === "darwin" ? "macos" : "linux",
			includeOptional: optionalTools,
			providers: options.providers,
			...(options.context7ApiKey
				? { context7ApiKey: options.context7ApiKey }
				: {}),
			...(options.hasHomebrew === undefined
				? {}
				: { hasHomebrew: options.hasHomebrew }),
		});
		phases.push({
			name: "toolchain",
			action: "Install OAL command-line toolchain",
			commands: toolchainPlan.commands,
		});
	} else if (options.rtk || optionalTools.length > 0) {
		phases.push({
			name: "toolchain",
			action: "Install optional OAL tool surfaces",
			commands: [
				...(options.rtk
					? [
							RTK_INSTALL_COMMAND,
							"rtk init -g --auto-patch",
							"rtk init -g --codex",
							"rtk init -g --opencode",
						]
					: []),
				...optionalFeatureCommands(
					"install",
					optionalTools,
					optionalFeatureOptions,
				),
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
		paint(
			"bold",
			`OpenAgentLayer setup · ${plan.dryRun ? "dry-run" : "apply"}`,
		),
		paint("cyan", "◇ Provider check"),
		`  providers: ${plan.providers.join(", ") || "none"}`,
	];
	for (const skipped of plan.skippedProviders)
		lines.push(
			paint("yellow", `  ! skip ${skipped.provider}: ${skipped.reason}`),
		);
	lines.push(paint("cyan", "◇ Target"));
	lines.push(`  scope: ${plan.scope}`);
	lines.push(`  home: ${plan.home}`);
	lines.push(`  target: ${plan.target}`);
	if (plan.binDir) lines.push(`  bin: ${plan.binDir}`);
	lines.push(paint("cyan", "◇ Optional tools"));
	lines.push(`  selected: ${plan.optionalTools.join(", ") || "none"}`);
	for (const phase of plan.phases) {
		lines.push(paint("cyan", `◇ ${phase.action}`));
		for (const command of phase.commands)
			lines.push(paint("dim", `  $ ${command}`));
	}
	lines.push(paint("green", "└ ✓ Setup plan ready"));
	return `${lines.join("\n")}\n`;
}

function paint(
	name: "bold" | "cyan" | "dim" | "green" | "yellow",
	text: string,
): string {
	if (!colorEnabled()) return text;
	const codes = {
		bold: 1,
		cyan: 36,
		dim: 2,
		green: 32,
		yellow: 33,
	} as const;
	return `\u001b[${codes[name]}m${text}\u001b[0m`;
}

function colorEnabled(): boolean {
	if (process.env["NO_COLOR"]) return false;
	if (process.env["FORCE_COLOR"] && process.env["FORCE_COLOR"] !== "0")
		return true;
	return process.stdout.isTTY === true;
}
