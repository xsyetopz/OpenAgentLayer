import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { type OptionalTool, officialSkillIds } from "@openagentlayer/toolchain";
import { flag, option, providerOptions, scopeOption } from "./arguments";
import { expandProviders } from "./provider-binaries";
import {
	buildSetupArgs,
	type SetupWorkflowSelection,
	type WorkflowProvider,
	type WorkflowScope,
} from "./workflows";

export const CONFIG_VERSION = 1;
export const PROFILE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export interface OalProfile extends SetupWorkflowSelection {
	providers: WorkflowProvider[];
	scope: WorkflowScope;
}

export interface OalConfig {
	version: typeof CONFIG_VERSION;
	activeProfile?: string;
	profiles: Record<string, OalProfile>;
}

export interface ProfileSelection {
	name?: string;
	profile?: OalProfile;
	configPath: string;
	config: OalConfig;
}

const VALUE_FLAGS = new Set([
	"--provider",
	"--scope",
	"--home",
	"--target",
	"--bin-dir",
	"--plan",
	"--codex-plan",
	"--codex-orchestration",
	"--codex-agent-max-depth",
	"--codex-agent-max-threads",
	"--codex-agent-job-max-runtime-seconds",
	"--codex-multi-agent-v2-max-concurrent-threads-per-session",
	"--codex-multi-agent-v2-min-wait-timeout-ms",
	"--codex-multi-agent-v2-hide-spawn-agent-metadata",
	"--codex-multi-agent-v2-usage-hint-enabled",
	"--codex-multi-agent-v2-usage-hint-text",
	"--codex-multi-agent-v2-root-usage-hint-text",
	"--codex-multi-agent-v2-subagent-usage-hint-text",
	"--claude-plan",
	"--opencode-plan",
	"--opencode-models-file",
	"--caveman-mode",
	"--optional",
]);
const PROFILE_CONTROL_FLAGS = new Set(["--profile", "--config"]);

export function defaultConfigPath(home = homedir()): string {
	return join(home, ".openagentlayer", "config.json");
}

export async function loadConfig(
	path = defaultConfigPath(),
): Promise<OalConfig> {
	try {
		const parsed = JSON.parse(
			await readFile(path, "utf8"),
		) as Partial<OalConfig>;
		return normalizeConfig(parsed);
	} catch (error) {
		if (isMissingFile(error)) return emptyConfig();
		throw error;
	}
}

export async function saveConfig(
	path: string,
	config: OalConfig,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(
		path,
		`${JSON.stringify(normalizeConfig(config), undefined, 2)}\n`,
	);
}

export function configPathFromArgs(args: string[]): string {
	return resolve(option(args, "--config") ?? defaultConfigPath());
}

export async function loadProfileSelection(
	args: string[],
): Promise<ProfileSelection> {
	const configPath = configPathFromArgs(args);
	const config = await loadConfig(configPath);
	const name = option(args, "--profile") ?? config.activeProfile;
	if (!name) return { configPath, config };
	assertProfileName(name);
	const profile = config.profiles[name];
	if (!profile)
		throw new Error(`Profile \`${name}\` is available to save first`);
	return { name, profile, configPath, config };
}

export function buildProfileFromArgs(args: string[]): OalProfile {
	const providers = expandProviders(
		providerOptions(option(args, "--provider") ?? "all"),
	);
	const scope = scopeOption(option(args, "--scope") ?? "global");
	const profile: OalProfile = { providers, scope };
	assignValue(profile, "home", option(args, "--home"));
	assignValue(profile, "target", option(args, "--target"));
	assignValue(profile, "binDir", option(args, "--bin-dir"));
	assignValue(profile, "codexPlan", option(args, "--codex-plan"));
	assignValue(
		profile,
		"codexOrchestration",
		option(args, "--codex-orchestration"),
	);
	assignValue(
		profile,
		"codexAgentMaxDepth",
		option(args, "--codex-agent-max-depth"),
	);
	assignValue(
		profile,
		"codexAgentMaxThreads",
		option(args, "--codex-agent-max-threads"),
	);
	assignValue(
		profile,
		"codexAgentJobMaxRuntimeSeconds",
		option(args, "--codex-agent-job-max-runtime-seconds"),
	);
	assignValue(
		profile,
		"codexMultiAgentV2MaxConcurrentThreadsPerSession",
		option(args, "--codex-multi-agent-v2-max-concurrent-threads-per-session"),
	);
	assignValue(
		profile,
		"codexMultiAgentV2MinWaitTimeoutMs",
		option(args, "--codex-multi-agent-v2-min-wait-timeout-ms"),
	);
	assignValue(
		profile,
		"codexMultiAgentV2HideSpawnAgentMetadata",
		option(args, "--codex-multi-agent-v2-hide-spawn-agent-metadata"),
	);
	assignValue(
		profile,
		"codexMultiAgentV2UsageHintEnabled",
		option(args, "--codex-multi-agent-v2-usage-hint-enabled"),
	);
	assignValue(
		profile,
		"codexMultiAgentV2UsageHintText",
		option(args, "--codex-multi-agent-v2-usage-hint-text"),
	);
	assignValue(
		profile,
		"codexMultiAgentV2RootUsageHintText",
		option(args, "--codex-multi-agent-v2-root-usage-hint-text"),
	);
	assignValue(
		profile,
		"codexMultiAgentV2SubagentUsageHintText",
		option(args, "--codex-multi-agent-v2-subagent-usage-hint-text"),
	);
	assignValue(profile, "claudePlan", option(args, "--claude-plan"));
	assignValue(profile, "opencodePlan", option(args, "--opencode-plan"));
	assignValue(profile, "cavemanMode", option(args, "--caveman-mode"));
	const optionalTools = profileOptionalTools(args);
	if (optionalTools.length > 0) profile.optionalTools = optionalTools;
	if (flag(args, "--toolchain")) profile.toolchain = true;
	if (flag(args, "--rtk")) profile.rtk = true;
	if (flag(args, "--verbose")) profile.verbose = true;
	return profile;
}

export function setupArgsForProfile(
	profile: OalProfile,
	explicitArgs: string[] = [],
): string[] {
	const profileArgs = buildSetupArgs(profile);
	const userArgs = stripProfileControlArgs(explicitArgs);
	const userFlagNames = new Set(flagNames(userArgs));
	const filteredProfileArgs = removeFlags(profileArgs, userFlagNames);
	return [...filteredProfileArgs, ...userArgs];
}

export function assertProfileName(name: string): void {
	if (PROFILE_NAME_PATTERN.test(name)) return;
	throw new Error(
		`Profile \`${name}\` uses letters, digits, dot, dash, or underscore`,
	);
}

function normalizeConfig(config: Partial<OalConfig>): OalConfig {
	const profiles: Record<string, OalProfile> = {};
	for (const [name, profile] of Object.entries(config.profiles ?? {})) {
		assertProfileName(name);
		profiles[name] = normalizeProfile(profile);
	}
	const normalized: OalConfig = { version: CONFIG_VERSION, profiles };
	if (config.activeProfile) {
		assertProfileName(config.activeProfile);
		if (profiles[config.activeProfile])
			normalized.activeProfile = config.activeProfile;
	}
	return normalized;
}

function normalizeProfile(
	profile: Partial<OalProfile> | undefined,
): OalProfile {
	const providers = expandProviders(
		providerOptions(
			(profile?.providers ?? ["codex", "claude", "opencode"]).join(","),
		),
	);
	const scope = scopeOption(profile?.scope ?? "global");
	const normalized: OalProfile = { providers, scope };
	assignValue(normalized, "home", profile?.home);
	assignValue(normalized, "target", profile?.target);
	assignValue(normalized, "binDir", profile?.binDir);
	assignValue(normalized, "codexPlan", profile?.codexPlan);
	assignValue(normalized, "codexOrchestration", profile?.codexOrchestration);
	assignValue(normalized, "codexAgentMaxDepth", profile?.codexAgentMaxDepth);
	assignValue(
		normalized,
		"codexAgentMaxThreads",
		profile?.codexAgentMaxThreads,
	);
	assignValue(
		normalized,
		"codexAgentJobMaxRuntimeSeconds",
		profile?.codexAgentJobMaxRuntimeSeconds,
	);
	assignValue(
		normalized,
		"codexMultiAgentV2MaxConcurrentThreadsPerSession",
		profile?.codexMultiAgentV2MaxConcurrentThreadsPerSession,
	);
	assignValue(
		normalized,
		"codexMultiAgentV2MinWaitTimeoutMs",
		profile?.codexMultiAgentV2MinWaitTimeoutMs,
	);
	assignValue(
		normalized,
		"codexMultiAgentV2HideSpawnAgentMetadata",
		profile?.codexMultiAgentV2HideSpawnAgentMetadata,
	);
	assignValue(
		normalized,
		"codexMultiAgentV2UsageHintEnabled",
		profile?.codexMultiAgentV2UsageHintEnabled,
	);
	assignValue(
		normalized,
		"codexMultiAgentV2UsageHintText",
		profile?.codexMultiAgentV2UsageHintText,
	);
	assignValue(
		normalized,
		"codexMultiAgentV2RootUsageHintText",
		profile?.codexMultiAgentV2RootUsageHintText,
	);
	assignValue(
		normalized,
		"codexMultiAgentV2SubagentUsageHintText",
		profile?.codexMultiAgentV2SubagentUsageHintText,
	);
	assignValue(normalized, "claudePlan", profile?.claudePlan);
	assignValue(normalized, "opencodePlan", profile?.opencodePlan);
	assignValue(normalized, "cavemanMode", profile?.cavemanMode);
	if (profile?.optionalTools)
		normalized.optionalTools = [...new Set(profile.optionalTools)];
	if (profile?.toolchain) normalized.toolchain = true;
	if (profile?.rtk) normalized.rtk = true;
	if (profile?.verbose) normalized.verbose = true;
	return normalized;
}

function emptyConfig(): OalConfig {
	return { version: CONFIG_VERSION, profiles: {} };
}

function assignValue<T extends object, K extends keyof T>(
	target: T,
	key: K,
	value: T[K] | undefined,
): void {
	if (typeof value === "string" && value.length > 0) target[key] = value;
}

function profileOptionalTools(args: string[]): OptionalTool[] {
	const tools = new Set<OptionalTool>();
	for (const tool of (option(args, "--optional") ?? "").split(",")) {
		if (
			tool === "ctx7" ||
			tool === "deepwiki" ||
			tool === "playwright" ||
			officialSkillIds().includes(
				tool as ReturnType<typeof officialSkillIds>[number],
			)
		)
			tools.add(tool as OptionalTool);
	}
	if (flag(args, "--ctx7-cli")) tools.add("ctx7");
	if (flag(args, "--playwright-cli")) tools.add("playwright");
	if (flag(args, "--deepwiki-mcp")) tools.add("deepwiki");
	return [...tools];
}

function stripProfileControlArgs(args: string[]): string[] {
	return removeFlags(args, PROFILE_CONTROL_FLAGS);
}

function removeFlags(args: string[], names: Set<string>): string[] {
	const result: string[] = [];
	let index = 0;
	while (index < args.length) {
		const current = args[index];
		if (names.has(current)) {
			if (VALUE_FLAGS.has(current) || PROFILE_CONTROL_FLAGS.has(current))
				index += 1;
			index += 1;
			continue;
		}
		result.push(current);
		index += 1;
	}
	return result;
}

function flagNames(args: string[]): string[] {
	const names: string[] = [];
	let index = 0;
	while (index < args.length) {
		const current = args[index];
		if (!current.startsWith("--")) {
			index += 1;
			continue;
		}
		names.push(current);
		if (VALUE_FLAGS.has(current) || PROFILE_CONTROL_FLAGS.has(current))
			index += 1;
		index += 1;
	}
	return names;
}

function isMissingFile(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error["code"] === "ENOENT"
	);
}
