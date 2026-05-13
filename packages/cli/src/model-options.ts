import { readFile } from "node:fs/promises";
import {
	assertKnownModelPlan,
	type CodexOrchestrationMode,
	isClaudePlan,
	isCodexPlan,
	isOpenCodePlan,
	parseOpenCodeModels,
	type RenderOptions,
} from "@openagentlayer/adapter";
import { option } from "./arguments";

export async function renderOptions(args: string[]): Promise<RenderOptions> {
	const plan = option(args, "--plan");
	const codexPlan = option(args, "--codex-plan");
	const claudePlan = option(args, "--claude-plan");
	const opencodePlan = option(args, "--opencode-plan");
	const modelsFile = option(args, "--opencode-models-file");
	const options: RenderOptions = {};
	if (plan) {
		assertKnownModelPlan(plan);
		options.plan = plan;
	}
	if (codexPlan) {
		assertKnownModelPlan(codexPlan);
		if (!isCodexPlan(codexPlan))
			throw new Error(`Unsupported Codex plan \`${codexPlan}\``);
		options.codexPlan = codexPlan;
	}
	if (claudePlan) {
		assertKnownModelPlan(claudePlan);
		if (!isClaudePlan(claudePlan))
			throw new Error(`Unsupported Claude plan \`${claudePlan}\``);
		options.claudePlan = claudePlan;
	}
	if (opencodePlan) {
		assertKnownModelPlan(opencodePlan);
		if (!isOpenCodePlan(opencodePlan))
			throw new Error(`Unsupported OpenCode plan \`${opencodePlan}\``);
		options.opencodePlan = opencodePlan;
	}
	if (modelsFile)
		options.opencodeModels = parseOpenCodeModels(
			await readFile(modelsFile, "utf8"),
		);
	else if (
		options.opencodePlan === "opencode-auto" ||
		options.opencodePlan === "opencode-auth"
	)
		options.opencodeModels = await detectOpenCodeModels(options.opencodePlan);
	else if (plan === "opencode-auto" || plan === "opencode-auth")
		options.opencodeModels = await detectOpenCodeModels(plan);
	const codexOrchestration = codexOrchestrationOptions(args);
	if (codexOrchestration) options.codexOrchestration = codexOrchestration;
	return options;
}

function codexOrchestrationOptions(
	args: string[],
): RenderOptions["codexOrchestration"] {
	const mode = option(args, "--codex-orchestration");
	const result: NonNullable<RenderOptions["codexOrchestration"]> = {};
	if (mode) result.mode = codexOrchestrationMode(mode);
	assignInteger(result, "maxDepth", option(args, "--codex-agent-max-depth"));
	assignInteger(
		result,
		"maxThreads",
		option(args, "--codex-agent-max-threads"),
	);
	assignInteger(
		result,
		"jobMaxRuntimeSeconds",
		option(args, "--codex-agent-job-max-runtime-seconds"),
	);
	const multiAgentV2: NonNullable<
		NonNullable<RenderOptions["codexOrchestration"]>["multiAgentV2"]
	> = {};
	assignInteger(
		multiAgentV2,
		"maxConcurrentThreadsPerSession",
		option(args, "--codex-multi-agent-v2-max-concurrent-threads-per-session"),
	);
	assignInteger(
		multiAgentV2,
		"minWaitTimeoutMs",
		option(args, "--codex-multi-agent-v2-min-wait-timeout-ms"),
		3600000,
	);
	assignBoolean(
		multiAgentV2,
		"hideSpawnAgentMetadata",
		option(args, "--codex-multi-agent-v2-hide-spawn-agent-metadata"),
	);
	assignBoolean(
		multiAgentV2,
		"usageHintEnabled",
		option(args, "--codex-multi-agent-v2-usage-hint-enabled"),
	);
	assignString(
		multiAgentV2,
		"usageHintText",
		option(args, "--codex-multi-agent-v2-usage-hint-text"),
	);
	assignString(
		multiAgentV2,
		"rootAgentUsageHintText",
		option(args, "--codex-multi-agent-v2-root-usage-hint-text"),
	);
	assignString(
		multiAgentV2,
		"subagentUsageHintText",
		option(args, "--codex-multi-agent-v2-subagent-usage-hint-text"),
	);
	if (Object.keys(multiAgentV2).length > 0) result.multiAgentV2 = multiAgentV2;
	return Object.keys(result).length > 0 ? result : undefined;
}

function codexOrchestrationMode(value: string): CodexOrchestrationMode {
	if (
		value === "opendex" ||
		value === "multi_agent" ||
		value === "multi_agent_v2"
	)
		return value;
	throw new Error(
		`Unsupported Codex orchestration \`${value}\`. Expected opendex, multi_agent, or multi_agent_v2`,
	);
}

function assignInteger<T extends object, K extends keyof T>(
	target: T,
	key: K,
	value: string | undefined,
	max?: number,
): void {
	if (!value) return;
	const parsed = Number(value);
	if (
		!(Number.isInteger(parsed) && parsed >= 1 && (max == null || parsed <= max))
	)
		throw new Error(`Expected positive integer for ${String(key)}`);
	target[key] = parsed as T[K];
}

function assignBoolean<T extends object, K extends keyof T>(
	target: T,
	key: K,
	value: string | undefined,
): void {
	if (!value) return;
	if (value !== "true" && value !== "false")
		throw new Error(`Expected true or false for ${String(key)}`);
	target[key] = (value === "true") as T[K];
}

function assignString<T extends object, K extends keyof T>(
	target: T,
	key: K,
	value: string | undefined,
): void {
	if (value) target[key] = value as T[K];
}

async function detectOpenCodeModels(plan: string): Promise<string[]> {
	const proc = Bun.spawn(["opencode", "models"], {
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, _stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	if (exitCode === 0) return parseOpenCodeModels(stdout);
	if (plan === "opencode-auth")
		throw new Error("OpenCode auth plan requires `opencode models`");
	return [];
}
