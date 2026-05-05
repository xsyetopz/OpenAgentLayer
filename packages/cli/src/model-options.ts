import { readFile } from "node:fs/promises";
import {
	assertKnownModelPlan,
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
			throw new Error(`Unsupported Codex plan \`${codexPlan}\`.`);
		options.codexPlan = codexPlan;
	}
	if (claudePlan) {
		assertKnownModelPlan(claudePlan);
		if (!isClaudePlan(claudePlan))
			throw new Error(`Unsupported Claude plan \`${claudePlan}\`.`);
		options.claudePlan = claudePlan;
	}
	if (opencodePlan) {
		assertKnownModelPlan(opencodePlan);
		if (!isOpenCodePlan(opencodePlan))
			throw new Error(`Unsupported OpenCode plan \`${opencodePlan}\`.`);
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
	return options;
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
		throw new Error("OpenCode auth plan requires `opencode models`.");
	return [];
}
