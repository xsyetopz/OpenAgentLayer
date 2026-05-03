import { homedir } from "node:os";
import { resolve } from "node:path";
import {
	cancel,
	confirm,
	intro,
	isCancel,
	log,
	multiselect,
	outro,
	select,
	text,
} from "@clack/prompts";
import { runCheckCommand } from "./commands/check";
import { runDeployCommand } from "./commands/deploy";
import { runPluginsCommand } from "./commands/plugins";
import { runPreviewCommand } from "./commands/preview";
import { runSetupCommand } from "./commands/setup";
import { runFeaturesCommand } from "./commands/toolchain";
import { runUninstallCommand } from "./commands/uninstall";
import { cavemanModes } from "./source";

type InteractiveAction =
	| "setup"
	| "update"
	| "preview"
	| "deploy"
	| "plugins"
	| "features"
	| "uninstall"
	| "check";
type InteractiveProvider = "all" | "codex" | "claude" | "opencode";
type ProviderSingle = Exclude<InteractiveProvider, "all">;
type ProviderMulti = ProviderSingle[];
type Scope = "project" | "global";

export async function runInteractiveCommand(repoRoot: string): Promise<void> {
	if (!process.stdin.isTTY)
		throw new Error("Interactive mode requires a TTY. Pass a command instead.");
	intro("OpenAgentLayer");
	for (;;) {
		const action = await workflowPrompt();
		if (action === "check") await runCheckCommand(repoRoot);
		else if (action === "setup" || action === "update")
			await interactiveSetup(repoRoot);
		else if (action === "preview") await interactivePreview(repoRoot);
		else if (action === "deploy") await interactiveDeploy(repoRoot);
		else if (action === "plugins") await interactivePlugins(repoRoot);
		else if (action === "features") await interactiveFeatures();
		else await interactiveUninstall();
		const again = await ask<boolean>(
			confirm({
				message: "Run another OAL workflow?",
				initialValue: true,
			}),
		);
		if (!again) break;
	}
	outro("✓ Done");
}

function workflowPrompt(): Promise<InteractiveAction> {
	return ask<InteractiveAction>(
		select({
			message: "Choose workflow",
			options: [
				{ value: "setup", label: "Set up OAL", hint: "guided install/update" },
				{ value: "update", label: "Update OAL", hint: "rerun managed setup" },
				{ value: "preview", label: "Preview", hint: "no writes" },
				{
					value: "deploy",
					label: "Deploy",
					hint: "render and merge managed artifacts",
				},
				{
					value: "plugins",
					label: "Plugins",
					hint: "sync provider plugin payloads",
				},
				{
					value: "features",
					label: "Features",
					hint: "optional tool commands",
				},
				{
					value: "uninstall",
					label: "Uninstall",
					hint: "remove OAL-owned files",
				},
				{ value: "check", label: "Check", hint: "validate source graph" },
			],
		}),
	);
}

async function interactiveSetup(repoRoot: string): Promise<void> {
	const provider = await providerPrompt();
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await globalHomePrompt());
	else args.push("--target", await targetPrompt());
	await appendProviderPlans(args, provider);
	appendCavemanMode(args, await cavemanModePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Initialize RTK?", initialValue: true }),
		)
	)
		args.push("--rtk");
	const optional = await optionalToolPrompt();
	if (optional.length > 0) args.push("--optional", optional.join(","));
	if (
		await ask<boolean>(
			confirm({ message: "Dry-run only?", initialValue: true }),
		)
	)
		args.push("--dry-run");
	await runSetupCommand(repoRoot, args);
}

async function interactivePreview(repoRoot: string): Promise<void> {
	const provider = await providerPrompt();
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await globalHomePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Include artifact contents?", initialValue: false }),
		)
	)
		args.push("--content");
	await runPreviewCommand(repoRoot, args);
}

async function interactiveDeploy(repoRoot: string): Promise<void> {
	const provider = await providerPrompt();
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await globalHomePrompt());
	else args.push("--target", await targetPrompt());
	appendCavemanMode(args, await cavemanModePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Dry-run only?", initialValue: true }),
		)
	)
		args.push("--dry-run");
	await runDeployCommand(repoRoot, args);
}

async function interactivePlugins(repoRoot: string): Promise<void> {
	const provider = await providerPrompt();
	const args = ["--provider", provider, "--home", await globalHomePrompt()];
	appendCavemanMode(args, await cavemanModePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Dry-run only?", initialValue: true }),
		)
	)
		args.push("--dry-run");
	await runPluginsCommand(repoRoot, args);
	log.success(`Plugin sync complete for ${provider}.`);
}

async function interactiveUninstall(): Promise<void> {
	const provider = await providerSinglePrompt();
	const scope = await scopePrompt();
	const args = ["--provider", provider, "--scope", scope];
	if (scope === "global") args.push("--home", await globalHomePrompt());
	else args.push("--target", await targetPrompt());
	await runUninstallCommand(args);
}

async function interactiveFeatures(): Promise<void> {
	const action = await ask<"install" | "remove">(
		select({
			message: "Feature action",
			options: [
				{ value: "install", label: "Install optional features" },
				{ value: "remove", label: "Remove optional features" },
			],
		}),
	);
	const feature = await ask<"ctx7" | "deepwiki" | "playwright">(
		select({
			message: "Feature",
			options: [
				{ value: "ctx7", label: "Context7 [CLI]" },
				{ value: "playwright", label: "Playwright [CLI]" },
				{ value: "deepwiki", label: "DeepWiki [MCP]" },
			],
		}),
	);
	runFeaturesCommand([`--${action}`, feature]);
}

async function appendProviderPlans(
	args: string[],
	provider: string,
): Promise<void> {
	const selected =
		provider === "all" ? ["codex", "claude", "opencode"] : provider.split(",");
	if (selected.includes("codex"))
		args.push("--codex-plan", await codexPlanPrompt());
	if (selected.includes("claude"))
		args.push("--claude-plan", await claudePlanPrompt());
	if (selected.includes("opencode"))
		args.push("--opencode-plan", await opencodePlanPrompt());
}

function codexPlanPrompt(): Promise<string> {
	return ask<string>(
		select({
			message: "ChatGPT/Codex subscription",
			options: [
				{ value: "pro-5", label: "Pro 5x", hint: "medium lead, high code" },
				{
					value: "pro-20",
					label: "Pro 20x",
					hint: "high lead/review, high code",
				},
				{ value: "plus", label: "Plus", hint: "low lead, medium code" },
			],
		}),
	);
}

function claudePlanPrompt(): Promise<string> {
	return ask<string>(
		select({
			message: "Claude subscription",
			options: [
				{ value: "max-5", label: "Max 5x", hint: "Opus/Sonnet/Haiku routing" },
				{
					value: "max-20",
					label: "Max 20x",
					hint: "more Sonnet worker routes",
				},
				{
					value: "max-20-long",
					label: "Max 20x long",
					hint: "1M Opus for lead/review",
				},
			],
		}),
	);
}

function opencodePlanPrompt(): Promise<string> {
	return ask<string>(
		select({
			message: "OpenCode model mode",
			options: [
				{
					value: "opencode-auto",
					label: "Auto",
					hint: "detected auth models, free fallback",
				},
				{
					value: "opencode-free",
					label: "Free fallback",
					hint: "OpenCode free models only",
				},
				{
					value: "opencode-auth",
					label: "Require auth",
					hint: "fail if auth models missing",
				},
			],
		}),
	);
}

function optionalToolPrompt(): Promise<string[]> {
	return ask<string[]>(
		multiselect({
			message: "Optional tool phases",
			required: false,
			options: [
				{ value: "ctx7", label: "Context7 [CLI]", hint: "current docs lookup" },
				{
					value: "playwright",
					label: "Playwright [CLI]",
					hint: "browser automation",
				},
				{
					value: "deepwiki",
					label: "DeepWiki [MCP]",
					hint: "repository knowledge MCP",
				},
			],
		}),
	);
}

function appendCavemanMode(args: string[], mode: string): void {
	if (mode !== "source") args.push("--caveman-mode", mode);
}

function cavemanModePrompt(): Promise<string> {
	return ask<string>(
		select({
			message: "Caveman output mode",
			options: [
				{
					value: "source",
					label: "Source default",
					hint: "use source/product.json",
				},
				...cavemanModes.map((mode) => ({
					value: mode,
					label: mode,
				})),
			],
		}),
	);
}

async function providerPrompt(): Promise<string> {
	const providers = await ask<ProviderMulti>(
		multiselect({
			message: "Providers",
			required: true,
			options: [
				{ value: "codex", label: "Codex", hint: "AGENTS.md, TOML, hooks" },
				{
					value: "claude",
					label: "Claude Code",
					hint: "CLAUDE.md, settings, hooks",
				},
				{
					value: "opencode",
					label: "OpenCode",
					hint: "JSONC, plugins, tools",
				},
			],
		}),
	);
	return providers.length === 3 ? "all" : providers.join(",");
}

function providerSinglePrompt(): Promise<ProviderSingle> {
	return ask<ProviderSingle>(
		select({
			message: "Provider to remove",
			options: [
				{ value: "codex", label: "Codex", hint: "owned Codex artifacts" },
				{
					value: "claude",
					label: "Claude Code",
					hint: "owned Claude artifacts",
				},
				{
					value: "opencode",
					label: "OpenCode",
					hint: "owned OpenCode artifacts",
				},
			],
		}),
	);
}

function scopePrompt(): Promise<Scope> {
	return ask<Scope>(
		select({
			message: "Scope",
			options: [
				{ value: "project", label: "Project", hint: "target repository" },
				{
					value: "global",
					label: "Global",
					hint: "provider home plus oal shim",
				},
			],
		}),
	);
}

function targetPrompt(): Promise<string> {
	return ask<string>(
		text({
			message: "Project target",
			placeholder: process.cwd(),
			defaultValue: process.cwd(),
			validate: (value) => (value?.trim() ? undefined : "Target is required"),
		}),
	);
}

async function homePrompt(): Promise<string> {
	return resolve(
		await ask<string>(
			text({
				message: "Home directory",
				placeholder: homedir(),
				defaultValue: homedir(),
				validate: (value) => (value?.trim() ? undefined : "Home is required"),
			}),
		),
	);
}

async function globalHomePrompt(): Promise<string> {
	const detectedHome = resolve(homedir());
	const useDetectedHome = await ask<boolean>(
		confirm({
			message: `Use detected home ${detectedHome}?`,
			initialValue: true,
		}),
	);
	if (useDetectedHome) return detectedHome;
	return homePrompt();
}

async function ask<T>(prompt: Promise<unknown>): Promise<T> {
	const answer = await prompt;
	if (isCancel(answer)) {
		cancel("Cancelled.");
		process.exit(0);
	}
	return answer as T;
}
