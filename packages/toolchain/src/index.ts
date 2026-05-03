export type OperatingSystem = "macos" | "linux";
export type PackageManager =
	| "brew"
	| "apt"
	| "dnf"
	| "pacman"
	| "zypper"
	| "apk";
export type OptionalTool =
	| "ctx7"
	| "deepwiki"
	| "playwright"
	| "anthropic-docs"
	| "opencode-docs";
export type OptionalToolAction = "install" | "remove";
export type OptionalToolProvider = "codex" | "claude" | "opencode";
export type OptionalToolScope = "global" | "project";

export interface ToolchainOptions {
	os: OperatingSystem;
	packageManager?: PackageManager;
	hasHomebrew?: boolean;
	includeOptional?: OptionalTool[];
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
}

const OPTIONAL_TOOL_LABELS: Record<OptionalTool, string> = {
	ctx7: "ctx7 [CLI]",
	deepwiki: "deepwiki [MCP]",
	playwright: "playwright [CLI]",
	"anthropic-docs": "Anthropic Docs [MCP]",
	"opencode-docs": "OpenCode Docs [MCP]",
};

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
const RTK_INSTALL =
	"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/master/install.sh | sh";

export function planToolchainInstall(options: ToolchainOptions): ToolchainPlan {
	const packageManager =
		options.packageManager ?? defaultPackageManager(options.os);
	const optionalTools = options.includeOptional ?? [];
	const commands = [
		...bootstrapCommands(options.os, packageManager, options.hasHomebrew),
		installCommand(packageManager, [...CORE_TOOLS]),
		RTK_INSTALL,
		"rtk --version",
		"rtk gain",
		"rtk init -g --auto-patch",
		"rtk init -g --codex",
		"rtk init -g --opencode",
		"rtk init --show",
		"rtk grep --help",
		"rtk find --help",
		...optionalFeatureCommands("install", optionalTools, {
			providers: ["codex", "claude", "opencode"],
			scope: "global",
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
			"Use `rtk gain` to confirm token savings; prefer `rtk grep` and bounded `rtk find` for high-volume repository inspection.",
			"Use `rg` and `fd` for provider-shared source discovery; both respect `.gitignore` by default.",
			"Use `git ls-files` when a task explicitly requires tracked files only.",
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
	if (optionalTools.includes("ctx7")) {
		commands.push(ctx7Command(action, options));
	}
	if (optionalTools.includes("deepwiki"))
		commands.push(
			action === "install"
				? "claude mcp add oal-deepwiki-docs --scope user -- bunx ctx7@latest mcp deepwiki && opencode mcp add oal-deepwiki-docs -- bunx ctx7@latest mcp deepwiki"
				: "claude mcp remove oal-deepwiki-docs --scope user && opencode mcp remove oal-deepwiki-docs",
		);
	if (optionalTools.includes("anthropic-docs"))
		commands.push(
			action === "install"
				? "claude mcp add oal-anthropic-docs --scope user -- oal mcp serve anthropic-docs"
				: "claude mcp remove oal-anthropic-docs --scope user",
		);
	if (optionalTools.includes("opencode-docs"))
		commands.push(
			action === "install"
				? "opencode mcp add oal-opencode-docs -- oal mcp serve opencode-docs"
				: "opencode mcp remove oal-opencode-docs",
		);
	if (optionalTools.includes("playwright"))
		commands.push(
			action === "install"
				? "bunx -p playwright playwright install --with-deps"
				: "bunx -p playwright playwright uninstall --all",
		);
	return commands;
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
		"bunx",
		"ctx7",
		verb,
		"--cli",
		"--yes",
		...providerFlags,
		...scopeFlags,
	].join(" ");
}
