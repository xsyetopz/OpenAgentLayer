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
import type { Provider } from "@openagentlayer/source";
import type { OptionalTool } from "@openagentlayer/toolchain";
import { runCheckCommand } from "./commands/check";
import { runDeployCommand } from "./commands/deploy";
import { runPluginsCommand } from "./commands/plugins";
import { runPreviewCommand } from "./commands/preview";
import { runProfilesCommand } from "./commands/profiles";
import { runSetupCommand } from "./commands/setup";
import { runStateCommand } from "./commands/state";
import { runFeaturesCommand } from "./commands/toolchain";
import { runUninstallCommand } from "./commands/uninstall";
import {
	configPathFromArgs,
	loadConfig,
	type OalProfile,
	PROFILE_NAME_PATTERN,
	saveConfig,
	setupArgsForProfile,
} from "./config-state";
import { printDetail, printHeader, printStep, printWarning } from "./output";
import { installableProviders } from "./provider-binaries";
import { cavemanModes } from "./source";
import {
	buildSetupArgs,
	providerSetArg,
	type WorkflowProvider,
	type WorkflowScope,
} from "./workflows";

type InteractiveAction = "setup" | "inspect" | "repair" | "remove" | "advanced";
type AdvancedAction =
	| "preview"
	| "deploy"
	| "plugins"
	| "features"
	| "profiles"
	| "state"
	| "uninstall"
	| "check";
type ProviderMulti = WorkflowProvider[];
type SetupIntent = "setup" | "repair";
type SetupProfileChoice =
	| { value: "manual"; label: string; hint: string }
	| { value: string; label: string; hint: string; name: string };

export const CODEX_PLAN_OPTIONS = [
	{ value: "plus", label: "Plus", hint: "low lead, medium code" },
	{ value: "pro-5", label: "Pro 5x", hint: "medium lead, high code" },
	{ value: "pro-20", label: "Pro 20x", hint: "high lead, high code" },
];

export const CLAUDE_PLAN_OPTIONS = [
	{ value: "max-5", label: "Max 5x", hint: "Opus/Sonnet/Haiku routing" },
	{ value: "max-20", label: "Max 20x", hint: "more Sonnet worker routes" },
	{
		value: "max-20-long",
		label: "Max 20x + 1M Opus",
		hint: "1M Opus for lead/review",
	},
];

export const OPENCODE_PLAN_OPTIONS = [
	{
		value: "opencode-free",
		label: "Free fallback",
		hint: "OpenCode free models only",
	},
	{
		value: "opencode-auto",
		label: "Auto",
		hint: "detected auth models, free fallback",
	},
	{
		value: "opencode-auth",
		label: "Require auth",
		hint: "require auth model detection",
	},
];

export async function runInteractiveCommand(repoRoot: string): Promise<void> {
	if (!process.stdin.isTTY)
		throw new Error("Interactive mode requires a TTY. Pass a command instead");
	intro("OpenAgentLayer");
	for (;;) {
		const action = await workflowPrompt();
		if (action === "setup") await interactiveSetup(repoRoot, "setup");
		else if (action === "repair") await interactiveSetup(repoRoot, "repair");
		else if (action === "inspect") await interactiveInspect(repoRoot);
		else if (action === "remove") await interactiveUninstall();
		else await interactiveAdvanced(repoRoot);
		const again = await ask<boolean>(
			confirm({
				message: "Run another OAL workflow?",
				initialValue: false,
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
				{
					value: "setup",
					label: "Review / apply setup",
					hint: "profile, current state, optional tools, deploy",
				},
				{
					value: "inspect",
					label: "Inspect OAL",
					hint: "check source or preview generated artifacts",
				},
				{
					value: "repair",
					label: "Repair existing OAL",
					hint: "preview state, then reapply selected providers",
				},
				{
					value: "remove",
					label: "Remove OAL",
					hint: "uninstall owned provider artifacts",
				},
				{
					value: "advanced",
					label: "Advanced commands",
					hint: "direct low-level CLI surfaces",
				},
			],
		}),
	);
}

async function interactiveSetup(
	repoRoot: string,
	intent: SetupIntent,
): Promise<void> {
	const savedProfile = await savedProfilePrompt();
	if (savedProfile) {
		const verbose = await ask<boolean>(
			confirm({
				message: "Show detailed command output?",
				initialValue: savedProfile.profile.verbose ?? false,
			}),
		);
		const selection = selectionFromProfile(savedProfile.profile, intent);
		const baseArgs = setupArgsForProfile(savedProfile.profile, [
			...(verbose ? ["--verbose"] : []),
		]);
		await printSetupStatePreview(repoRoot, baseArgs);
		const dryRun = await confirmApplyPrompt(selection, savedProfile.name);
		await runSetupCommand(
			repoRoot,
			setupArgsForProfile(savedProfile.profile, [
				...(dryRun ? ["--dry-run"] : []),
				...(verbose ? ["--verbose"] : []),
			]),
		);
		log.success(dryRun ? "Setup dry-run complete." : "Setup applied.");
		return;
	}
	const providers = await availableProviderPrompt();
	const scope = await scopePrompt();
	const home = scope === "global" ? await globalHomePrompt() : undefined;
	const target = scope === "project" ? await targetPrompt() : undefined;
	const codexPlan = providers.includes("codex")
		? await codexPlanPrompt()
		: undefined;
	const claudePlan = providers.includes("claude")
		? await claudePlanPrompt()
		: undefined;
	const opencodePlan = providers.includes("opencode")
		? await opencodePlanPrompt()
		: undefined;
	const cavemanMode = await cavemanModePrompt();
	const rtk = await ask<boolean>(
		confirm({ message: "Set up RTK enforcement?", initialValue: true }),
	);
	const toolchain = await ask<boolean>(
		confirm({
			message: "Install OAL command-line tools?",
			initialValue: true,
		}),
	);
	const optionalTools = await optionalToolPrompt();
	const verbose = await ask<boolean>(
		confirm({ message: "Show detailed command output?", initialValue: false }),
	);
	const workflowSelection = {
		providers,
		scope,
		...(home ? { home } : {}),
		...(target ? { target } : {}),
		...(codexPlan ? { codexPlan } : {}),
		...(claudePlan ? { claudePlan } : {}),
		...(opencodePlan ? { opencodePlan } : {}),
		cavemanMode,
		rtk,
		toolchain,
		optionalTools,
		intent,
	};
	const baseArgs = buildSetupArgs({
		...workflowSelection,
		verbose,
	});
	await printSetupStatePreview(repoRoot, baseArgs);
	await maybeSaveProfile(workflowSelection);
	const dryRun = await confirmApplyPrompt(workflowSelection);
	await runSetupCommand(
		repoRoot,
		buildSetupArgs({
			...workflowSelection,
			dryRun,
			verbose,
		}),
	);
	log.success(dryRun ? "Setup dry-run complete." : "Setup applied.");
}

async function savedProfilePrompt(): Promise<
	{ name: string; profile: OalProfile } | undefined
> {
	const configPath = configPathFromArgs([]);
	const config = await loadConfig(configPath);
	const choices = setupProfileChoices(config);
	printHeader("Profile config");
	printDetail("path", configPath);
	printDetail("profiles", Object.keys(config.profiles).length.toString());
	if (choices.length === 1) return undefined;
	const choice = await ask<string>(
		select({
			message: "Setup profile",
			options: choices,
		}),
	);
	if (choice === "manual") return undefined;
	const name = choice.slice("profile:".length);
	const profile = config.profiles[name];
	if (!profile)
		throw new Error(`Profile \`${name}\` is available to save first`);
	return { name, profile };
}

export function setupProfileChoices(config: {
	activeProfile?: string;
	profiles: Record<string, OalProfile>;
}): SetupProfileChoice[] {
	const names = Object.keys(config.profiles).sort();
	const choices: SetupProfileChoice[] = [
		{
			value: "manual",
			label: "Create or update setup",
			hint: "choose providers, plans, tools, and target",
		},
	];
	if (config.activeProfile && config.profiles[config.activeProfile]) {
		choices.push({
			value: `profile:${config.activeProfile}`,
			label: `Use active profile: ${config.activeProfile}`,
			hint: profileSummary(config.profiles[config.activeProfile]),
			name: config.activeProfile,
		});
	}
	for (const name of names) {
		if (name === config.activeProfile) continue;
		choices.push({
			value: `profile:${name}`,
			label: `Use saved profile: ${name}`,
			hint: profileSummary(config.profiles[name]),
			name,
		});
	}
	return choices;
}

function selectionFromProfile(profile: OalProfile, intent: SetupIntent) {
	return {
		...profile,
		rtk: profile.rtk ?? false,
		toolchain: profile.toolchain ?? false,
		optionalTools: profile.optionalTools ?? [],
		intent,
	};
}

function profileSummary(profile: OalProfile): string {
	const target =
		profile.scope === "global"
			? `home ${profile.home ?? homedir()}`
			: `target ${profile.target ?? process.cwd()}`;
	return `${providerSetArg(profile.providers)} ${profile.scope}, ${target}`;
}

async function printSetupStatePreview(
	repoRoot: string,
	args: string[],
): Promise<void> {
	printHeader("Current install state", "before apply");
	await runStateCommand(repoRoot, ["inspect", ...args]);
}

async function interactiveInspect(repoRoot: string): Promise<void> {
	const action = await ask<
		"state" | "check" | "installed" | "preview" | "content"
	>(
		select({
			message: "Inspect target",
			options: [
				{
					value: "state",
					label: "State summary",
					hint: "profile, provider availability, deploy plan",
				},
				{ value: "check", label: "Check source", hint: "renderability only" },
				{
					value: "installed",
					label: "Check installed state",
					hint: "manifest and drift checks",
				},
				{ value: "preview", label: "Preview artifact tree", hint: "no writes" },
				{
					value: "content",
					label: "Preview artifact content",
					hint: "select one path",
				},
			],
		}),
	);
	if (action === "state") {
		await runStateCommand(repoRoot, ["inspect"]);
		return;
	}
	if (action === "check") {
		await runCheckCommand(repoRoot);
		return;
	}
	if (action === "installed") {
		const providers = await availableProviderPrompt();
		await runCheckCommand(repoRoot, [
			"--installed",
			"--provider",
			providerSetArg(providers),
			"--home",
			await globalHomePrompt(),
		]);
		return;
	}
	const providers = await providerPrompt();
	const args = ["--provider", providerSetArg(providers)];
	if (action === "content") {
		args.push("--content");
		args.push("--path", await artifactPathPrompt());
	}
	await runPreviewCommand(repoRoot, args);
}

async function interactiveAdvanced(repoRoot: string): Promise<void> {
	const action = await ask<AdvancedAction>(
		select({
			message: "Advanced command",
			options: [
				{
					value: "preview",
					label: "preview",
					hint: "show generated artifacts",
				},
				{ value: "deploy", label: "deploy", hint: "write provider artifacts" },
				{ value: "plugins", label: "plugins", hint: "sync plugin payloads" },
				{
					value: "features",
					label: "features",
					hint: "optional feature commands",
				},
				{ value: "state", label: "state", hint: "profile and install state" },
				{ value: "profiles", label: "profiles", hint: "saved setup profiles" },
				{ value: "uninstall", label: "uninstall", hint: "remove owned files" },
				{ value: "check", label: "check", hint: "validate source" },
			],
		}),
	);
	if (action === "check") await runCheckCommand(repoRoot);
	else if (action === "preview") await interactivePreview(repoRoot);
	else if (action === "deploy") await interactiveDeploy(repoRoot);
	else if (action === "plugins") await interactivePlugins(repoRoot);
	else if (action === "features") await interactiveFeatures();
	else if (action === "state") await runStateCommand(repoRoot, ["inspect"]);
	else if (action === "profiles") await interactiveProfiles();
	else await interactiveUninstall();
}

async function interactiveProfiles(): Promise<void> {
	const action = await ask<"list" | "show" | "use">(
		select({
			message: "Profiles",
			options: [
				{ value: "list", label: "List profiles" },
				{ value: "show", label: "Show active profile" },
				{ value: "use", label: "Activate profile" },
			],
		}),
	);
	if (action === "use") {
		const name = await profileNamePrompt("Profile name");
		await runProfilesCommand(["use", name]);
		return;
	}
	await runProfilesCommand([action]);
}

async function interactivePreview(repoRoot: string): Promise<void> {
	const providers = await providerPrompt();
	const args = ["--provider", providerSetArg(providers)];
	if (
		await ask<boolean>(
			confirm({ message: "Include artifact contents?", initialValue: false }),
		)
	)
		args.push("--content");
	await runPreviewCommand(repoRoot, args);
}

async function interactiveDeploy(repoRoot: string): Promise<void> {
	const providers = await availableProviderPrompt();
	const scope = await scopePrompt();
	const args = ["--provider", providerSetArg(providers), "--scope", scope];
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
	const providers = await availableProviderPrompt();
	const args = [
		"--provider",
		providerSetArg(providers),
		"--home",
		await globalHomePrompt(),
	];
	appendCavemanMode(args, await cavemanModePrompt());
	if (
		await ask<boolean>(
			confirm({ message: "Dry-run only?", initialValue: true }),
		)
	)
		args.push("--dry-run");
	await runPluginsCommand(repoRoot, args);
	log.success(`Plugin sync complete for ${providerSetArg(providers)}.`);
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
	const feature = await ask<OptionalTool>(
		select({
			message: "Feature",
			options: [
				{ value: "ctx7", label: "Context7 [CLI]" },
				{ value: "playwright", label: "Playwright [CLI]" },
				{ value: "deepwiki", label: "DeepWiki [MCP]" },
				{ value: "anthropic-docs", label: "Anthropic Docs [MCP]" },
				{ value: "opencode-docs", label: "OpenCode Docs [MCP]" },
			],
		}),
	);
	runFeaturesCommand([`--${action}`, feature]);
}

async function confirmApplyPrompt(
	selection: {
		providers: Provider[];
		scope: WorkflowScope;
		home?: string;
		target?: string;
		codexPlan?: string;
		claudePlan?: string;
		opencodePlan?: string;
		cavemanMode?: string;
		rtk: boolean;
		toolchain: boolean;
		optionalTools: OptionalTool[];
		intent: SetupIntent;
	},
	profileName?: string,
): Promise<boolean> {
	printHeader("OpenAgentLayer workflow", selection.intent);
	if (profileName) printDetail("profile", profileName);
	printStep("Selected providers");
	printDetail("providers", providerSetArg(selection.providers));
	printStep("Target");
	printDetail("scope", selection.scope);
	printDetail(
		selection.scope === "global" ? "home" : "target",
		selection.scope === "global"
			? (selection.home ?? homedir())
			: (selection.target ?? process.cwd()),
	);
	printStep("Model plans");
	if (selection.codexPlan) printDetail("codex", selection.codexPlan);
	if (selection.claudePlan) printDetail("claude", selection.claudePlan);
	if (selection.opencodePlan) printDetail("opencode", selection.opencodePlan);
	printStep("Options");
	printDetail("caveman", selection.cavemanMode ?? "source");
	printDetail("rtk", selection.rtk ? "yes" : "no");
	printDetail("toolchain", selection.toolchain ? "yes" : "no");
	printDetail(
		"optional",
		selection.optionalTools.length > 0
			? selection.optionalTools.join(", ")
			: "none",
	);
	const apply = await ask<boolean>(
		confirm({ message: "Apply changes now?", initialValue: false }),
	);
	return !apply;
}

async function maybeSaveProfile(selection: OalProfile): Promise<void> {
	const save = await ask<boolean>(
		confirm({ message: "Save this setup as a profile?", initialValue: false }),
	);
	if (!save) return;
	const name = await profileNamePrompt("Profile name");
	const activate = await ask<boolean>(
		confirm({ message: "Make this the active profile?", initialValue: true }),
	);
	const configPath = configPathFromArgs([]);
	const config = await loadConfig(configPath);
	config.profiles[name] = {
		providers: selection.providers,
		scope: selection.scope,
		...(selection.home ? { home: selection.home } : {}),
		...(selection.target ? { target: selection.target } : {}),
		...(selection.codexPlan ? { codexPlan: selection.codexPlan } : {}),
		...(selection.claudePlan ? { claudePlan: selection.claudePlan } : {}),
		...(selection.opencodePlan ? { opencodePlan: selection.opencodePlan } : {}),
		...(selection.cavemanMode ? { cavemanMode: selection.cavemanMode } : {}),
		...(selection.optionalTools
			? { optionalTools: selection.optionalTools }
			: {}),
		...(selection.toolchain ? { toolchain: true } : {}),
		...(selection.rtk ? { rtk: true } : {}),
	};
	if (activate) config.activeProfile = name;
	await saveConfig(configPath, config);
	log.success(`Saved profile ${name}`);
}

function profileNamePrompt(message: string): Promise<string> {
	return ask<string>(
		text({
			message,
			placeholder: "default",
			validate: (value) =>
				PROFILE_NAME_PATTERN.test(value ?? "")
					? undefined
					: "Use letters, digits, dot, dash, or underscore",
		}),
	);
}

function codexPlanPrompt(): Promise<string> {
	return ask<string>(
		select({
			message: "ChatGPT/Codex subscription",
			options: CODEX_PLAN_OPTIONS,
		}),
	);
}

function claudePlanPrompt(): Promise<string> {
	return ask<string>(
		select({
			message: "Claude subscription",
			options: CLAUDE_PLAN_OPTIONS,
		}),
	);
}

function opencodePlanPrompt(): Promise<string> {
	return ask<string>(
		select({
			message: "OpenCode model mode",
			options: OPENCODE_PLAN_OPTIONS,
		}),
	);
}

function optionalToolPrompt(): Promise<OptionalTool[]> {
	return ask<OptionalTool[]>(
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
				{
					value: "anthropic-docs",
					label: "Anthropic Docs [MCP]",
					hint: "Claude Code and Anthropic docs",
				},
				{
					value: "opencode-docs",
					label: "OpenCode Docs [MCP]",
					hint: "OpenCode config, tools, plugin docs",
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

async function availableProviderPrompt(): Promise<ProviderMulti> {
	const availability = await installableProviders(["all"]);
	printHeader("Provider preflight");
	for (const provider of availability.providers)
		printDetail(provider, "available");
	for (const skipped of availability.skipped)
		printWarning(`${skipped.provider} disabled: ${skipped.reason}`);
	if (availability.providers.length === 0)
		throw new Error(
			"Install `codex`, `claude`, or `opencode` to run provider setup",
		);
	return providerPrompt(availability.providers);
}

function providerPrompt(
	providers: readonly WorkflowProvider[] = ["codex", "claude", "opencode"],
): Promise<ProviderMulti> {
	return ask<ProviderMulti>(
		multiselect({
			message: "Providers",
			required: true,
			options: providers.map((provider) => ({
				value: provider,
				label: providerLabel(provider),
				hint: providerHint(provider),
			})),
		}),
	);
}

function providerSinglePrompt(): Promise<WorkflowProvider> {
	return ask<WorkflowProvider>(
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

function scopePrompt(): Promise<WorkflowScope> {
	return ask<WorkflowScope>(
		select({
			message: "Scope",
			options: [
				{
					value: "global",
					label: "Global",
					hint: "provider home plus oal shim",
				},
				{ value: "project", label: "Project", hint: "target repository" },
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

function artifactPathPrompt(): Promise<string> {
	return ask<string>(
		text({
			message: "Artifact path",
			placeholder: ".codex/config.toml",
			defaultValue: ".codex/config.toml",
			validate: (value) => (value?.trim() ? undefined : "Path is required"),
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
			message: `Use detected home \`${detectedHome}\`?`,
			initialValue: true,
		}),
	);
	if (useDetectedHome) return detectedHome;
	return homePrompt();
}

function providerLabel(provider: WorkflowProvider): string {
	if (provider === "codex") return "Codex";
	if (provider === "claude") return "Claude Code";
	return "OpenCode";
}

function providerHint(provider: WorkflowProvider): string {
	if (provider === "codex") return "AGENTS.md, TOML, hooks";
	if (provider === "claude") return "CLAUDE.md, settings, hooks";
	return "JSONC, plugins, tools";
}

async function ask<T>(prompt: Promise<unknown>): Promise<T> {
	const answer = await prompt;
	if (isCancel(answer)) {
		cancel("Cancelled.");
		process.exit(0);
	}
	return answer as T;
}
