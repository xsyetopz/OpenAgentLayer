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
	codexProfileModel?: string;
	codexOrchestration?: string;
	codexAgentMaxDepth?: string;
	codexAgentMaxThreads?: string;
	codexAgentJobMaxRuntimeSeconds?: string;
	codexMultiAgentV2MaxConcurrentThreadsPerSession?: string;
	codexMultiAgentV2MinWaitTimeoutMs?: string;
	codexMultiAgentV2HideSpawnAgentMetadata?: string;
	codexMultiAgentV2UsageHintEnabled?: string;
	codexMultiAgentV2UsageHintText?: string;
	codexMultiAgentV2RootUsageHintText?: string;
	codexMultiAgentV2SubagentUsageHintText?: string;
	claudePlan?: string;
	opencodePlan?: string;
	cavemanMode?: string;
	optionalTools?: OptionalTool[];
	context7ApiKey?: string;
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
	if (selection.providers.includes("codex"))
		appendValue(args, "--codex-profile-model", selection.codexProfileModel);
	appendCodexOrchestrationArgs(args, selection);
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
	if (selection.context7ApiKey)
		args.push("--context7-api-key", selection.context7ApiKey);
	if (selection.dryRun) args.push("--dry-run");
	if (selection.verbose) args.push("--verbose");
	return args;
}

function appendCodexOrchestrationArgs(
	args: string[],
	selection: SetupWorkflowSelection,
): void {
	if (!selection.providers.includes("codex")) return;
	appendValue(args, "--codex-orchestration", selection.codexOrchestration);
	appendValue(args, "--codex-agent-max-depth", selection.codexAgentMaxDepth);
	appendValue(
		args,
		"--codex-agent-max-threads",
		selection.codexAgentMaxThreads,
	);
	appendValue(
		args,
		"--codex-agent-job-max-runtime-seconds",
		selection.codexAgentJobMaxRuntimeSeconds,
	);
	appendValue(
		args,
		"--codex-multi-agent-v2-max-concurrent-threads-per-session",
		selection.codexMultiAgentV2MaxConcurrentThreadsPerSession,
	);
	appendValue(
		args,
		"--codex-multi-agent-v2-min-wait-timeout-ms",
		selection.codexMultiAgentV2MinWaitTimeoutMs,
	);
	appendValue(
		args,
		"--codex-multi-agent-v2-hide-spawn-agent-metadata",
		selection.codexMultiAgentV2HideSpawnAgentMetadata,
	);
	appendValue(
		args,
		"--codex-multi-agent-v2-usage-hint-enabled",
		selection.codexMultiAgentV2UsageHintEnabled,
	);
	appendValue(
		args,
		"--codex-multi-agent-v2-usage-hint-text",
		selection.codexMultiAgentV2UsageHintText,
	);
	appendValue(
		args,
		"--codex-multi-agent-v2-root-usage-hint-text",
		selection.codexMultiAgentV2RootUsageHintText,
	);
	appendValue(
		args,
		"--codex-multi-agent-v2-subagent-usage-hint-text",
		selection.codexMultiAgentV2SubagentUsageHintText,
	);
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

function appendValue(
	args: string[],
	name: string,
	value: string | undefined,
): void {
	if (value) args.push(name, value);
}
