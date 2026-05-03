import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
	planSetup,
	renderSetupPlan,
	type SetupScope,
} from "@openagentlayer/setup";
import type { OptionalTool } from "@openagentlayer/toolchain";
import { flag, option, providerOptions } from "../arguments";
import { installableProviders } from "../provider-binaries";
import { runCheckCommand } from "./check";
import { runDeployCommand } from "./deploy";
import { runPluginsCommand } from "./plugins";

export async function runSetupCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const scope: SetupScope =
		option(args, "--scope") === "project" ? "project" : "global";
	const requestedProviders = providerOptions(
		option(args, "--provider") ?? "all",
	);
	const availability = await installableProviders(requestedProviders);
	const providers = availability.providers;
	const home = resolve(option(args, "--home") ?? homedir());
	const target = resolve(option(args, "--target") ?? process.cwd());
	const binDir = resolve(option(args, "--bin-dir") ?? join(home, ".local/bin"));
	const optionalTools = setupOptionalTools(args);
	const dryRun = flag(args, "--dry-run");
	const quiet = flag(args, "--quiet");
	const verbose = flag(args, "--verbose");
	const rtk = flag(args, "--rtk");
	const setupOptions = {
		providers,
		skippedProviders: availability.skipped,
		scope,
		home,
		target: scope === "global" ? home : target,
		optionalTools,
		rtk,
		dryRun,
	};
	const plan = planSetup(
		scope === "global" ? { ...setupOptions, binDir } : setupOptions,
	);
	if (!quiet || dryRun) console.log(renderSetupPlan(plan).trimEnd());
	if (providers.length === 0) {
		console.log(
			"└ ⚠ No selected provider binaries found; setup wrote nothing.",
		);
		return;
	}
	await runOptionalSetup(
		plan.phases[0]?.name === "toolchain" ? plan.phases[0].commands : [],
		{ dryRun, quiet },
	);
	const providerArg = providers.join(",");
	const common = [
		"--provider",
		providerArg,
		"--scope",
		scope,
		...passthroughRenderArgs(args),
	];
	await runDeployCommand(repoRoot, [
		...common,
		...(scope === "global"
			? ["--home", home, "--bin-dir", binDir]
			: ["--target", target]),
		...(dryRun ? ["--dry-run"] : []),
		...(quiet ? ["--quiet"] : []),
		...(verbose ? ["--verbose"] : []),
	]);
	await runPluginsCommand(repoRoot, [
		"--provider",
		providerArg,
		"--home",
		home,
		...passthroughRenderArgs(args),
		...(dryRun ? ["--dry-run"] : []),
		...(quiet ? ["--quiet"] : []),
		...(verbose ? ["--verbose"] : []),
	]);
	await runCheckCommand(repoRoot, [
		...(verbose ? ["--verbose"] : []),
		...(dryRun
			? []
			: [
					"--installed",
					"--provider",
					providerArg,
					"--home",
					home,
					...(scope === "project" ? ["--target", target] : []),
				]),
	]);
}

function setupOptionalTools(args: string[]): OptionalTool[] {
	const tools = new Set<OptionalTool>();
	for (const tool of (option(args, "--optional") ?? "").split(",")) {
		if (tool === "ctx7" || tool === "deepwiki" || tool === "playwright")
			tools.add(tool);
	}
	if (flag(args, "--ctx7-cli")) tools.add("ctx7");
	if (flag(args, "--playwright-cli")) tools.add("playwright");
	if (flag(args, "--deepwiki-mcp")) tools.add("deepwiki");
	return [...tools];
}

function passthroughRenderArgs(args: string[]): string[] {
	const result: string[] = [];
	for (const name of [
		"--plan",
		"--codex-plan",
		"--claude-plan",
		"--opencode-plan",
		"--opencode-models-file",
		"--caveman-mode",
	]) {
		const value = option(args, name);
		if (value) result.push(name, value);
	}
	return result;
}

async function runOptionalSetup(
	commands: string[],
	options: { dryRun: boolean; quiet: boolean },
): Promise<void> {
	if (commands.length === 0) return;
	if (options.dryRun) return;
	for (const command of commands) {
		if (!options.quiet) console.log(`$ ${command}`);
		const child = Bun.spawn(["sh", "-lc", command], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, code] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		if (code !== 0)
			throw new Error(
				`Setup optional command failed (${command}) with exit code ${code}:\nstdout:\n${stdout}\nstderr:\n${stderr}`,
			);
	}
}
