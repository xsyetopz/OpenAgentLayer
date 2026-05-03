import type { Provider } from "@openagentlayer/source";
import type { OptionalTool } from "@openagentlayer/toolchain";

export type WorkflowScope = "project" | "global";
export type WorkflowProvider = Provider;

export interface SetupWorkflowSelection {
	providers: WorkflowProvider[];
	scope: WorkflowScope;
	home?: string;
	target?: string;
	binDir?: string;
	codexPlan?: string;
	claudePlan?: string;
	opencodePlan?: string;
	cavemanMode?: string;
	optionalTools?: OptionalTool[];
	toolchain?: boolean;
	rtk?: boolean;
	dryRun?: boolean;
	verbose?: boolean;
}

export function buildSetupArgs(selection: SetupWorkflowSelection): string[] {
	const args = [
		"--provider",
		providerSetArg(selection.providers),
		"--scope",
		selection.scope,
	];
	if (selection.scope === "global" && selection.home)
		args.push("--home", selection.home);
	if (selection.scope === "project" && selection.target)
		args.push("--target", selection.target);
	if (selection.binDir) args.push("--bin-dir", selection.binDir);
	appendProviderPlan(args, "codex", selection.codexPlan, selection.providers);
	appendProviderPlan(args, "claude", selection.claudePlan, selection.providers);
	appendProviderPlan(
		args,
		"opencode",
		selection.opencodePlan,
		selection.providers,
	);
	if (selection.cavemanMode && selection.cavemanMode !== "source")
		args.push("--caveman-mode", selection.cavemanMode);
	if (selection.rtk) args.push("--rtk");
	if (selection.toolchain) args.push("--toolchain");
	if (selection.optionalTools && selection.optionalTools.length > 0)
		args.push("--optional", selection.optionalTools.join(","));
	if (selection.dryRun) args.push("--dry-run");
	if (selection.verbose) args.push("--verbose");
	return args;
}

export function providerSetArg(providers: readonly WorkflowProvider[]): string {
	const unique = [...new Set(providers)];
	if (unique.length === 3) return "all";
	return unique.join(",");
}

function appendProviderPlan(
	args: string[],
	provider: WorkflowProvider,
	value: string | undefined,
	providers: readonly WorkflowProvider[],
): void {
	if (value && providers.includes(provider))
		args.push(`--${provider}-plan`, value);
}
