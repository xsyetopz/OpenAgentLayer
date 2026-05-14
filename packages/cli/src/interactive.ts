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
import {
	context7ApiKeyStatus,
	isExpectedContext7ApiKey,
	OFFICIAL_SKILL_CATALOG,
	OFFICIAL_SKILL_CATEGORIES,
	type OfficialSkillCatalogEntry,
	type OfficialSkillCategory,
	type OptionalTool,
} from "@openagentlayer/toolchain";
import { runCheckCommand } from "./commands/check";
import { runDeployCommand } from "./commands/deploy";
import { runPluginsCommand } from "./commands/plugins";
import { runPreviewCommand } from "./commands/preview";
import { runProfilesCommand } from "./commands/profiles";
import { runSetupCommand } from "./commands/setup";
import { runStateCommand } from "./commands/state";
import {
	fetchOfficialSkillCatalog,
	runFeaturesCommand,
} from "./commands/toolchain";
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

type InteractiveAction =
	| "setup"
	| "repair"
	| "status"
	| "validate"
	| "artifacts"
	| "deploy"
	| "skills"
	| "plugins"
	| "profiles"
	| "uninstall";
type ProviderMulti = WorkflowProvider[];
type SetupIntent = "setup" | "repair";
type SetupProfileChoice =
	| { value: "manual"; label: string; hint: string }
	| { value: string; label: string; hint: string; name: string };

const POSITIVE_INTEGER_PATTERN = /^\d+$/;

export const CODEX_PLAN_OPTIONS = [
	{ value: "plus", label: "Plus", hint: "low lead, medium code" },
	{ value: "pro-5", label: "Pro 5x", hint: "medium lead, high code" },
	{ value: "pro-20", label: "Pro 20x", hint: "high lead, high code" },
];

export const CODEX_ORCHESTRATION_OPTIONS = [
	{
		value: "multi_agent_v2",
		label: "Codex multi_agent_v2",
		hint: "default native OAL agents, uses v2 thread limit",
	},
	{
		value: "multi_agent",
		label: "Codex multi_agent",
		hint: "native shallow agents, bounded by agents table",
	},
	{
		value: "opendex",
		label: "OpenDex",
		hint: "external Rust control-plane mode, native multi-agent disabled",
	},
] as const;

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

export const PROFILE_ACTION_OPTIONS = [
	{ value: "list", label: "List profiles" },
	{ value: "show", label: "Show active profile" },
	{ value: "use", label: "Activate profile" },
	{ value: "edit", label: "Edit profile" },
	{ value: "rename", label: "Rename profile" },
	{ value: "remove", label: "Remove profile" },
] as const;

export const UNINSTALL_PROVIDER_OPTIONS = [
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
] as const;

export const OPTIONAL_FEATURE_OPTIONS = optionalFeatureOptions();

export const WORKFLOW_OPTIONS = [
	{
		value: "setup",
		label: "Review and apply setup",
		hint: "Start · profile, providers, toolchain, optional tools",
	},
	{
		value: "repair",
		label: "Repair existing install",
		hint: "Start · inspect state, then reapply selected providers",
	},
	{
		value: "status",
		label: "Status and installed state",
		hint: "Inspect · profile, availability, manifest drift",
	},
	{
		value: "validate",
		label: "Validate source",
		hint: "Inspect · renderability and source checks",
	},
	{
		value: "artifacts",
		label: "Preview generated files",
		hint: "Artifacts · tree or selected file content",
	},
	{
		value: "deploy",
		label: "Deploy provider files",
		hint: "Artifacts · write Codex, Claude, or OpenCode artifacts",
	},
	{
		value: "skills",
		label: "Official skills",
		hint: "Extend · install from officialskills.sh tabs",
	},
	{
		value: "plugins",
		label: "Plugin payloads",
		hint: "Extend · sync provider plugin payloads",
	},
	{
		value: "profiles",
		label: "Profiles",
		hint: "Manage · list, edit, rename, activate, remove",
	},
	{
		value: "uninstall",
		label: "Uninstall OAL",
		hint: "Manage · remove owned provider artifacts",
	},
] as const;

const OFFICIAL_SKILLS_URL = "https://officialskills.sh/#find-skills";
const OFFICIAL_SKILLS_CATALOG_URL = "https://officialskills.sh/";

export async function runInteractiveCommand(repoRoot: string): Promise<void> {
	if (!process.stdin.isTTY)
		throw new Error("Interactive mode requires a TTY. Pass a command instead");
	intro("OpenAgentLayer");
	for (;;) {
		const action = await workflowPrompt();
		if (action === "setup") await interactiveSetup(repoRoot, "setup");
		else if (action === "repair") await interactiveSetup(repoRoot, "repair");
		else if (action === "status") await interactiveStatus(repoRoot);
		else if (action === "validate") await runCheckCommand(repoRoot);
		else if (action === "artifacts") await interactiveArtifacts(repoRoot);
		else if (action === "deploy") await interactiveDeploy(repoRoot);
		else if (action === "skills") await interactiveFeatures();
		else if (action === "plugins") await interactivePlugins(repoRoot);
		else if (action === "profiles") await interactiveProfiles();
		else await interactiveUninstall();
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
			message: "OpenAgentLayer command hub",
			options: [...WORKFLOW_OPTIONS],
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
		const context7ApiKey = selection.optionalTools.includes("ctx7")
			? await context7ApiKeyPrompt()
			: undefined;
		const previewExtraArgs = [
			...(context7ApiKey ? ["--context7-api-key", context7ApiKey] : []),
			...(verbose ? ["--verbose"] : []),
		];
		const baseArgs = setupArgsForProfile(
			savedProfile.profile,
			previewExtraArgs,
		);
		await printSetupStatePreview(repoRoot, baseArgs);
		const dryRun = await confirmApplyPrompt(
			{
				...selection,
				...(context7ApiKey ? { context7ApiKey } : {}),
			},
			savedProfile.name,
		);
		await runSetupCommand(
			repoRoot,
			setupArgsForProfile(savedProfile.profile, [
				...(context7ApiKey ? ["--context7-api-key", context7ApiKey] : []),
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
	const codexOrchestration = providers.includes("codex")
		? await codexOrchestrationPrompt()
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
	const context7ApiKey = optionalTools.includes("ctx7")
		? await context7ApiKeyPrompt()
		: undefined;
	const verbose = await ask<boolean>(
		confirm({ message: "Show detailed command output?", initialValue: false }),
	);
	const workflowSelection = {
		providers,
		scope,
		...(home ? { home } : {}),
		...(target ? { target } : {}),
		...(codexPlan ? { codexPlan } : {}),
		...(codexOrchestration ?? {}),
		...(claudePlan ? { claudePlan } : {}),
		...(opencodePlan ? { opencodePlan } : {}),
		cavemanMode,
		rtk,
		toolchain,
		optionalTools,
		...(context7ApiKey ? { context7ApiKey } : {}),
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

async function interactiveStatus(repoRoot: string): Promise<void> {
	const action = await ask<"state" | "installed">(
		select({
			message: "Status target",
			options: [
				{
					value: "state",
					label: "State summary",
					hint: "profile, provider availability, deploy plan",
				},
				{
					value: "installed",
					label: "Installed state",
					hint: "manifest and drift checks",
				},
			],
		}),
	);
	if (action === "state") {
		await runStateCommand(repoRoot, ["inspect"]);
		return;
	}
	const providers = await availableProviderPrompt();
	await runCheckCommand(repoRoot, [
		"--installed",
		"--provider",
		providerSetArg(providers),
		"--home",
		await globalHomePrompt(),
	]);
}

async function interactiveArtifacts(repoRoot: string): Promise<void> {
	const action = await ask<"tree" | "content">(
		select({
			message: "Artifact preview",
			options: [
				{
					value: "tree",
					label: "Generated artifact tree",
					hint: "provider files without contents",
				},
				{
					value: "content",
					label: "Generated artifact content",
					hint: "select one path",
				},
			],
		}),
	);
	const providers = await providerPrompt();
	const args = ["--provider", providerSetArg(providers)];
	if (action === "content") {
		args.push("--content");
		args.push("--path", await artifactPathPrompt());
	}
	await runPreviewCommand(repoRoot, args);
}

async function interactiveProfiles(): Promise<void> {
	const action = await ask<
		"list" | "show" | "use" | "edit" | "rename" | "remove"
	>(
		select({
			message: "Profiles",
			options: [...PROFILE_ACTION_OPTIONS],
		}),
	);
	if (action === "edit") {
		const name = await profileNameSelectionPrompt(action);
		const profile = await profileEditPrompt();
		const configPath = configPathFromArgs([]);
		const config = await loadConfig(configPath);
		config.profiles[name] = profile;
		await saveConfig(configPath, config);
		log.success(`Edited profile ${name}`);
		return;
	}
	if (action === "rename") {
		const name = await profileNameSelectionPrompt(action);
		const newName = await profileNamePrompt("New profile name");
		await runProfilesCommand([action, name, newName]);
		return;
	}
	if (action === "use" || action === "remove") {
		const name = await profileNameSelectionPrompt(action);
		await runProfilesCommand([action, name]);
		return;
	}
	await runProfilesCommand([action]);
}

async function profileEditPrompt(): Promise<OalProfile> {
	const providers = await availableProviderPrompt();
	const scope = await scopePrompt();
	const home = scope === "global" ? await globalHomePrompt() : undefined;
	const target = scope === "project" ? await targetPrompt() : undefined;
	const codexPlan = providers.includes("codex")
		? await codexPlanPrompt()
		: undefined;
	const codexOrchestration = providers.includes("codex")
		? await codexOrchestrationPrompt()
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
	return {
		providers,
		scope,
		...(home ? { home } : {}),
		...(target ? { target } : {}),
		...(codexPlan ? { codexPlan } : {}),
		...(codexOrchestration ?? {}),
		...(claudePlan ? { claudePlan } : {}),
		...(opencodePlan ? { opencodePlan } : {}),
		cavemanMode,
		rtk,
		toolchain,
		optionalTools,
	};
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
	const providers = await ask<ProviderMulti>(
		multiselect({
			message: "Providers to remove",
			required: true,
			options: [...UNINSTALL_PROVIDER_OPTIONS],
		}),
	);
	const scope = await scopePrompt();
	const targetArgs = ["--scope", scope];
	if (scope === "global") targetArgs.push("--home", await globalHomePrompt());
	else targetArgs.push("--target", await targetPrompt());
	for (const provider of providers)
		await runUninstallCommand(["--provider", provider, ...targetArgs]);
}

async function interactiveFeatures(): Promise<void> {
	const action = await ask<"install" | "remove" | "catalog">(
		select({
			message: "Official skills",
			options: [
				{ value: "install", label: "Install skills by tab" },
				{ value: "remove", label: "Remove selected skills" },
				{ value: "catalog", label: "Print website skill catalog" },
			],
		}),
	);
	if (action === "catalog") {
		await runFeaturesCommand(["--catalog-url", OFFICIAL_SKILLS_CATALOG_URL]);
		return;
	}
	const catalog = await officialSkillsCatalog();
	const category = await officialSkillCategoryPrompt(catalog);
	const categoryCatalog =
		category === "all"
			? catalog
			: catalog.filter((entry) => entry.category === category);
	const selection = await ask<"all" | "choose">(
		select({
			message: "Skill selection",
			options: [
				{ value: "all", label: `All in ${category} tab` },
				{ value: "choose", label: "Choose skills" },
			],
		}),
	);
	const features =
		selection === "all"
			? ["all"]
			: await ask<OptionalTool[]>(
					multiselect({
						message: "Skills",
						required: true,
						options: officialSkillOptions(categoryCatalog),
					}),
				);
	await runFeaturesCommand([
		"--catalog-url",
		OFFICIAL_SKILLS_CATALOG_URL,
		"--category",
		category,
		`--${action}`,
		features.join(","),
	]);
}

export function officialSkillOptions(
	catalog: readonly OfficialSkillCatalogEntry[],
) {
	const seen = new Set<string>();
	return catalog.flatMap((entry) => {
		if (seen.has(entry.id)) return [];
		seen.add(entry.id);
		return [
			{
				value: entry.id as OptionalTool,
				label: `${entry.publisher} ${entry.name}`,
				hint: `${entry.category} · ${entry.sourceStatus}`,
			},
		];
	});
}

async function officialSkillsCatalog(): Promise<OfficialSkillCatalogEntry[]> {
	try {
		return await fetchOfficialSkillCatalog(OFFICIAL_SKILLS_CATALOG_URL);
	} catch (error) {
		printWarning(
			`Could not load ${OFFICIAL_SKILLS_URL}; using bundled skill catalog. ${error instanceof Error ? error.message : String(error)}`,
		);
		return [...OFFICIAL_SKILL_CATALOG];
	}
}

function officialSkillCategoryPrompt(
	catalog: readonly OfficialSkillCatalogEntry[],
): Promise<OfficialSkillCategory | "all"> {
	const counts = new Map<OfficialSkillCategory | "all", number>([
		["all", catalog.length],
	]);
	for (const category of OFFICIAL_SKILL_CATEGORIES)
		counts.set(
			category,
			catalog.filter((entry) => entry.category === category).length,
		);
	return ask<OfficialSkillCategory | "all">(
		select({
			message: "Skill tab",
			options: [
				{ value: "all", label: "All", hint: `${counts.get("all") ?? 0}` },
				...OFFICIAL_SKILL_CATEGORIES.map((category) => ({
					value: category,
					label: category,
					hint: `${counts.get(category) ?? 0}`,
				})),
			],
		}),
	);
}

function optionalFeatureOptions() {
	return [
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
		...officialSkillOptions(OFFICIAL_SKILL_CATALOG),
	];
}

function optionalToolPrompt(): Promise<OptionalTool[]> {
	return ask<OptionalTool[]>(
		multiselect({
			message: "Optional tools and bundled skills",
			required: false,
			options: optionalFeatureOptions(),
		}),
	);
}

async function confirmApplyPrompt(
	selection: {
		providers: Provider[];
		scope: WorkflowScope;
		home?: string;
		target?: string;
		codexPlan?: string;
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
		rtk: boolean;
		toolchain: boolean;
		optionalTools: OptionalTool[];
		context7ApiKey?: string;
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
	if (selection.codexOrchestration)
		printDetail("codex orchestration", selection.codexOrchestration);
	if (selection.codexAgentMaxDepth)
		printDetail("codex max depth", selection.codexAgentMaxDepth);
	if (selection.codexAgentMaxThreads)
		printDetail("codex max threads", selection.codexAgentMaxThreads);
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
	if (selection.optionalTools.includes("ctx7"))
		printDetail(
			"context7 key",
			selection.context7ApiKey ? "provided" : "environment or not configured",
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
		...(selection.codexOrchestration
			? { codexOrchestration: selection.codexOrchestration }
			: {}),
		...(selection.codexAgentMaxDepth
			? { codexAgentMaxDepth: selection.codexAgentMaxDepth }
			: {}),
		...(selection.codexAgentMaxThreads
			? { codexAgentMaxThreads: selection.codexAgentMaxThreads }
			: {}),
		...(selection.codexAgentJobMaxRuntimeSeconds
			? {
					codexAgentJobMaxRuntimeSeconds:
						selection.codexAgentJobMaxRuntimeSeconds,
				}
			: {}),
		...(selection.codexMultiAgentV2MaxConcurrentThreadsPerSession
			? {
					codexMultiAgentV2MaxConcurrentThreadsPerSession:
						selection.codexMultiAgentV2MaxConcurrentThreadsPerSession,
				}
			: {}),
		...(selection.codexMultiAgentV2MinWaitTimeoutMs
			? {
					codexMultiAgentV2MinWaitTimeoutMs:
						selection.codexMultiAgentV2MinWaitTimeoutMs,
				}
			: {}),
		...(selection.codexMultiAgentV2HideSpawnAgentMetadata
			? {
					codexMultiAgentV2HideSpawnAgentMetadata:
						selection.codexMultiAgentV2HideSpawnAgentMetadata,
				}
			: {}),
		...(selection.codexMultiAgentV2UsageHintEnabled
			? {
					codexMultiAgentV2UsageHintEnabled:
						selection.codexMultiAgentV2UsageHintEnabled,
				}
			: {}),
		...(selection.codexMultiAgentV2UsageHintText
			? {
					codexMultiAgentV2UsageHintText:
						selection.codexMultiAgentV2UsageHintText,
				}
			: {}),
		...(selection.codexMultiAgentV2RootUsageHintText
			? {
					codexMultiAgentV2RootUsageHintText:
						selection.codexMultiAgentV2RootUsageHintText,
				}
			: {}),
		...(selection.codexMultiAgentV2SubagentUsageHintText
			? {
					codexMultiAgentV2SubagentUsageHintText:
						selection.codexMultiAgentV2SubagentUsageHintText,
				}
			: {}),
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

async function profileNameSelectionPrompt(
	action: "use" | "edit" | "rename" | "remove",
): Promise<string> {
	const config = await loadConfig(configPathFromArgs([]));
	const names = Object.keys(config.profiles).sort();
	if (names.length === 0) return profileNamePrompt("Profile name");
	const activeProfile =
		config.activeProfile && config.profiles[config.activeProfile]
			? config.activeProfile
			: undefined;
	return ask<string>(
		select({
			message:
				action === "use"
					? "Profile to activate"
					: action === "edit"
						? "Profile to edit"
						: action === "rename"
							? "Profile to rename"
							: "Profile to remove",
			options: names.map((name) => ({
				value: name,
				label: activeProfile === name ? `${name} [active]` : name,
				hint: profileSummary(config.profiles[name]),
			})),
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

async function codexOrchestrationPrompt(): Promise<
	Partial<OalProfile> | undefined
> {
	const codexOrchestration = await ask<string>(
		select({
			message: "Codex orchestration",
			options: [...CODEX_ORCHESTRATION_OPTIONS],
		}),
	);
	const codexAgentMaxDepth = await positiveIntegerPrompt(
		"Codex agents.max_depth",
		"1",
	);
	const codexAgentMaxThreads = await positiveIntegerPrompt(
		codexOrchestration === "multi_agent_v2"
			? "Codex v2 thread limit"
			: "Codex agents.max_threads",
		"1",
	);
	const codexAgentJobMaxRuntimeSeconds = await positiveIntegerPrompt(
		"Codex agent job max runtime seconds",
		"900",
	);
	const result: Partial<OalProfile> = {
		codexOrchestration,
		codexAgentMaxDepth,
		codexAgentMaxThreads,
		codexAgentJobMaxRuntimeSeconds,
	};
	if (codexOrchestration !== "multi_agent_v2") return result;
	result.codexMultiAgentV2MaxConcurrentThreadsPerSession = codexAgentMaxThreads;
	const minWaitTimeoutMs = await optionalIntegerPrompt(
		"Codex multi_agent_v2 min_wait_timeout_ms",
	);
	if (minWaitTimeoutMs)
		result.codexMultiAgentV2MinWaitTimeoutMs = minWaitTimeoutMs;
	result.codexMultiAgentV2HideSpawnAgentMetadata = booleanText(
		await ask<boolean>(
			confirm({
				message: "Hide Codex multi_agent_v2 spawn metadata?",
				initialValue: true,
			}),
		),
	);
	result.codexMultiAgentV2UsageHintEnabled = booleanText(
		await ask<boolean>(
			confirm({
				message: "Enable Codex multi_agent_v2 usage hints?",
				initialValue: true,
			}),
		),
	);
	const usageHintText = await optionalTextPrompt(
		"Codex multi_agent_v2 usage_hint_text",
	);
	if (usageHintText) result.codexMultiAgentV2UsageHintText = usageHintText;
	const rootUsageHintText = await optionalTextPrompt(
		"Codex multi_agent_v2 root_agent_usage_hint_text",
	);
	if (rootUsageHintText)
		result.codexMultiAgentV2RootUsageHintText = rootUsageHintText;
	const subagentUsageHintText = await optionalTextPrompt(
		"Codex multi_agent_v2 subagent_usage_hint_text",
	);
	if (subagentUsageHintText)
		result.codexMultiAgentV2SubagentUsageHintText = subagentUsageHintText;
	return result;
}

function positiveIntegerPrompt(
	message: string,
	initialValue: string,
): Promise<string> {
	return ask<string>(
		text({
			message,
			initialValue,
			validate: positiveIntegerValidation,
		}),
	);
}

async function optionalIntegerPrompt(
	message: string,
): Promise<string | undefined> {
	const value = await ask<string>(
		text({
			message,
			placeholder: "leave blank",
			validate: (candidate) =>
				candidate && candidate.length > 0
					? positiveIntegerValidation(candidate)
					: undefined,
		}),
	);
	return value || undefined;
}

async function optionalTextPrompt(
	message: string,
): Promise<string | undefined> {
	const value = await ask<string>(
		text({
			message,
			placeholder: "leave blank",
		}),
	);
	return value || undefined;
}

function positiveIntegerValidation(
	value: string | undefined,
): string | undefined {
	return value && POSITIVE_INTEGER_PATTERN.test(value) && Number(value) >= 1
		? undefined
		: "Use a positive integer";
}

function booleanText(value: boolean): string {
	return value ? "true" : "false";
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

async function context7ApiKeyPrompt(): Promise<string | undefined> {
	const status = context7ApiKeyStatus();
	if (status.valid) {
		log.info(`Context7 API key detected in ${status.source}.`);
		return undefined;
	}
	const message = status.present
		? "Context7 API key format was not recognized. Provide one now for higher rate limits?"
		: "Provide a Context7 API key for higher rate limits?";
	const provide = await ask<boolean>(confirm({ message, initialValue: false }));
	if (!provide) {
		log.info("Get a Context7 API key at https://context7.com/dashboard.");
		return undefined;
	}
	return ask<string>(
		text({
			message: "Context7 API key",
			placeholder: "ctx7sk-...",
			validate: (value) =>
				isExpectedContext7ApiKey(value ?? "")
					? undefined
					: "Expected a Context7 API key like ctx7sk-...",
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
