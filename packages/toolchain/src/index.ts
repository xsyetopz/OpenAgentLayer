export {
	OFFICIAL_SKILL_CATALOG,
	type OfficialSkillCatalogEntry,
	type OfficialSkillId,
	officialSkillById,
	officialSkillIds,
	officialSkillLinks,
	parseOfficialSkillPage,
} from "./official-skills";

import {
	OFFICIAL_SKILL_CATALOG,
	type OfficialSkillId,
	officialSkillById,
} from "./official-skills";

export type OperatingSystem = "macos" | "linux";
export type PackageManager =
	| "brew"
	| "apt"
	| "dnf"
	| "pacman"
	| "zypper"
	| "apk";
export type OptionalTool = "ctx7" | "deepwiki" | "playwright" | OfficialSkillId;
export type OptionalToolAction = "install" | "remove";
export type OptionalToolProvider = "codex" | "claude" | "opencode";
export type OptionalToolScope = "global" | "project";

export interface ToolchainOptions {
	os: OperatingSystem;
	packageManager?: PackageManager;
	hasHomebrew?: boolean;
	includeOptional?: OptionalTool[];
	providers?: OptionalToolProvider[];
	context7ApiKey?: string;
}

export interface ToolchainPlan {
	os: OperatingSystem;
	packageManager: PackageManager;
	requiredTools: string[];
	optionalTools: string[];
	commands: string[];
	notes: string[];
}

export interface OptionalFeatureCommandOptions {
	providers?: OptionalToolProvider[];
	scope?: OptionalToolScope;
	context7ApiKey?: string;
	repoRoot?: string;
	targetRoot?: string;
}

export interface Context7ApiKeyStatus {
	present: boolean;
	valid: boolean;
	source?: string;
}

const CONTEXT7_DASHBOARD_URL = "https://context7.com/dashboard";
const CONTEXT7_API_KEY_PATTERN = /^ctx7sk-[A-Za-z0-9_-]{16,}$/;

const OPTIONAL_TOOL_LABELS: Record<OptionalTool, string> = {
	ctx7: "ctx7 [CLI]",
	deepwiki: "deepwiki [MCP]",
	playwright: "playwright [CLI]",
	...Object.fromEntries(
		OFFICIAL_SKILL_CATALOG.map((entry) => [
			entry.id,
			`${entry.publisher} ${entry.name} [skill]`,
		]),
	),
} as Record<OptionalTool, string>;

const CORE_TOOLS = [
	"bun",
	"ripgrep",
	"fd",
	"fzf",
	"bat",
	"eza",
	"git-delta",
	"jq",
	"yq",
	"just",
	"direnv",
	"mise",
	"zoxide",
	"dust",
	"hyperfine",
	"entr",
	"gh",
	"lazygit",
	"tmux",
	"btop",
	"shellcheck",
	"shfmt",
	"ast-grep",
	"sd",
	"tokei",
	"gitleaks",
	"pre-commit",
	"watchexec",
] as const;
const BREW_INSTALL =
	'/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
const BUN_INSTALL = ["curl -fsSL https://bun.sh/install", "bash"].join(" | ");
const RTK_INSTALL =
	"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh";

export function planToolchainInstall(options: ToolchainOptions): ToolchainPlan {
	const packageManager =
		options.packageManager ?? defaultPackageManager(options.os);
	const optionalTools = options.includeOptional ?? [];
	const providers = options.providers ?? ["codex", "claude", "opencode"];
	const commands = [
		...bootstrapCommands(options.os, packageManager, options.hasHomebrew),
		BUN_INSTALL,
		installCommand(packageManager, packageManagerTools(packageManager)),
		RTK_INSTALL,
		"rtk --version",
		"rtk gain",
		"rtk init -g --auto-patch",
		"rtk init -g --codex",
		"rtk init -g --opencode",
		"rtk init --show",
		"rtk grep --help",
		"rtk read --help",
		"rtk find --help",
		"rg --help",
		"fd --help",
		...(optionalTools.includes("ctx7")
			? [
					"bun install -g ctx7",
					"ctx7 --version",
					`# Optional: get a Context7 API key for higher rate limits at ${CONTEXT7_DASHBOARD_URL}`,
				]
			: []),
		...optionalFeatureCommands("install", optionalTools, {
			providers,
			scope: "global",
			...(options.context7ApiKey
				? { context7ApiKey: options.context7ApiKey }
				: {}),
		}),
	];
	return {
		os: options.os,
		packageManager,
		requiredTools: [...CORE_TOOLS, "rtk"],
		optionalTools: optionalTools.map(optionalToolLabel),
		commands,
		notes: [
			"Run as dry-run first; install mutates user machine state.",
			"Bun is installed before OAL-managed package-manager rewrites can run.",
			"RTK must be verified with `rtk gain` to avoid the wrong rtk package.",
			"RTK init must create global or project RTK.md policy before OAL hooks enforce RTK-wrapped commands.",
			"Keep `rtk gain` at or above 80%; drops below 80% require command/output efficiency work before release.",
			"Use `rtk gain` to confirm token savings; prefer capped `rtk grep`, bounded `rtk read`, and bounded `rtk find` for high-volume repository inspection.",
			"RTK flags are not raw tool flags: do not pass `--max` or `--file-type` to plain `rg`/`grep`, and do not pass `--max-lines` or `--level` to shell `read`.",
			"Use raw tool fallbacks only after RTK options are exhausted; prefer `rtk grep`, `rtk read`, `rtk find`, and `rtk git ls-files`.",
			"Use `rtk proxy -- rg` and `rtk proxy -- fd` for provider-shared source discovery only as a last resort; both respect `.gitignore` by default.",
			"Use `rtk git ls-files` when a task explicitly requires tracked files only.",
			"Use `jq`/`yq` for structured config, `shellcheck`/`shfmt` for shell, `hyperfine` for speed claims, `ast-grep`/`sd` for careful mechanical rewrites, and `gitleaks` for secret checks.",
		],
	};
}

export function renderToolchainPlan(plan: ToolchainPlan): string {
	return [
		"# OpenAgentLayer Toolchain Plan",
		"",
		`OS: ${plan.os}`,
		`Package manager: ${plan.packageManager}`,
		`Required tools: ${plan.requiredTools.join(", ")}`,
		`Optional tools: ${plan.optionalTools.join(", ") || "none"}`,
		"",
		"Commands:",
		"```bash",
		...plan.commands,
		"```",
		"",
		"Notes:",
		...plan.notes.map((note) => `- ${note}`),
		"",
	].join("\n");
}

export function optionalToolLabel(tool: OptionalTool): string {
	return OPTIONAL_TOOL_LABELS[tool];
}

export function context7ApiKeyStatus(
	env: NodeJS.ProcessEnv = process.env,
): Context7ApiKeyStatus {
	const entries = [
		["CONTEXT7_API_KEY", env["CONTEXT7_API_KEY"]],
		["CTX7_API_KEY", env["CTX7_API_KEY"]],
	] as const;
	const found = entries.find(([, value]) => typeof value === "string");
	if (!found) return { present: false, valid: false };
	const [source, rawValue] = found;
	const value = rawValue?.trim() ?? "";
	return {
		present: value.length > 0,
		valid: isExpectedContext7ApiKey(value),
		source,
	};
}

export function isExpectedContext7ApiKey(value: string): boolean {
	return CONTEXT7_API_KEY_PATTERN.test(value.trim());
}

function defaultPackageManager(os: OperatingSystem): PackageManager {
	return os === "macos" ? "brew" : "apt";
}

function bootstrapCommands(
	os: OperatingSystem,
	packageManager: PackageManager,
	hasHomebrew = true,
): string[] {
	if (os === "macos" && packageManager === "brew" && !hasHomebrew)
		return [BREW_INSTALL];
	if (os === "linux") return [linuxRefreshCommand(packageManager)];
	return [];
}

function installCommand(
	packageManager: PackageManager,
	tools: readonly string[],
): string {
	switch (packageManager) {
		case "brew":
			return `brew install ${tools.join(" ")}`;
		case "apt":
			return `sudo apt-get install -y ${tools.join(" ")}`;
		case "dnf":
			return `sudo dnf install -y ${tools.join(" ")}`;
		case "pacman":
			return `sudo pacman -S --needed ${tools.join(" ")}`;
		case "zypper":
			return `sudo zypper install -y ${tools.join(" ")}`;
		default:
			return `sudo apk add ${tools.join(" ")}`;
	}
}

function packageManagerTools(
	packageManager: PackageManager,
): readonly string[] {
	if (packageManager === "brew")
		return CORE_TOOLS.filter((tool) => tool !== "bun");
	return CORE_TOOLS;
}

function linuxRefreshCommand(packageManager: PackageManager): string {
	switch (packageManager) {
		case "apt":
			return "sudo apt-get update";
		case "dnf":
			return "sudo dnf check-update || true";
		case "pacman":
			return "sudo pacman -Sy";
		case "zypper":
			return "sudo zypper refresh";
		case "apk":
			return "sudo apk update";
		default:
			return "brew update";
	}
}

export function optionalFeatureCommands(
	action: OptionalToolAction,
	optionalTools: OptionalTool[],
	options: OptionalFeatureCommandOptions = {},
): string[] {
	const commands: string[] = [];
	const providers = options.providers ?? ["codex", "claude", "opencode"];
	if (optionalTools.includes("ctx7")) {
		commands.push(ctx7Command(action, options));
	}
	if (optionalTools.includes("deepwiki") && providers.includes("claude"))
		commands.push(
			action === "install"
				? "claude mcp add oal-deepwiki-docs --scope user -- bunx ctx7@latest mcp deepwiki"
				: "claude mcp remove oal-deepwiki-docs --scope user",
		);
	if (optionalTools.includes("playwright")) {
		commands.push(
			action === "install"
				? "bunx -p playwright playwright install --with-deps"
				: "bunx -p playwright playwright uninstall --all",
		);
	}
	for (const tool of optionalTools) {
		const command = officialSkillById(tool);
		if (!command) continue;
		commands.push(officialSkillCommand(action, command));
	}
	return commands;
}

function officialSkillCommand(
	action: OptionalToolAction,
	command: { repo: string; skill: string },
): string {
	if (action === "remove")
		return `# Review installed skill target before removing ${command.skill} with bunx skills remove ${command.skill}`;
	return `bunx skills add ${command.repo} --skill ${command.skill}`;
}

function ctx7Command(
	action: OptionalToolAction,
	options: OptionalFeatureCommandOptions,
): string {
	const verb = action === "install" ? "setup" : "remove";
	const providers = options.providers ?? ["codex", "claude", "opencode"];
	const providerFlags = providers.map((provider) => `--${provider}`);
	const scopeFlags = options.scope === "project" ? ["--project"] : [];
	return [
		"ctx7",
		verb,
		"--cli",
		"--yes",
		...providerFlags,
		...scopeFlags,
		...(action === "install" && options.context7ApiKey
			? [`--api-key=${shellQuote(options.context7ApiKey)}`]
			: []),
	].join(" ");
}

function shellQuote(value: string): string {
	return `'${value.replaceAll("'", "'\\''")}'`;
}
