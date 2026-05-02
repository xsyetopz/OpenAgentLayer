export type OperatingSystem = "macos" | "linux";
export type PackageManager =
	| "brew"
	| "apt"
	| "dnf"
	| "pacman"
	| "zypper"
	| "apk";
export type OptionalTool = "ctx7" | "deepwiki" | "playwright";

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
	optionalTools: OptionalTool[];
	commands: string[];
	notes: string[];
}

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
		"rtk gain",
		"rtk grep --help",
		"rtk find --help",
		...optionalCommands(optionalTools),
	];
	return {
		os: options.os,
		packageManager,
		requiredTools: [...CORE_TOOLS, "rtk"],
		optionalTools,
		commands,
		notes: [
			"Run as dry-run first; install mutates user machine state.",
			"Bun is installed before OAL-managed package-manager rewrites can run.",
			"RTK must be verified with `rtk gain` to avoid the wrong rtk package.",
			"Keep `rtk gain` at or above 80%; drops below 80% require command/output efficiency work before release.",
			"Use `rtk gain` to confirm token savings; prefer `rtk grep` and bounded `rtk find` for high-volume repository inspection.",
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
		...plan.commands.map((command) => `- ${command}`),
		"",
		"Notes:",
		...plan.notes.map((note) => `- ${note}`),
		"",
	].join("\n");
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

function optionalCommands(optionalTools: OptionalTool[]): string[] {
	const commands: string[] = [];
	if (optionalTools.includes("ctx7")) {
		commands.push("bunx ctx7 setup --cli --universal");
	}
	if (optionalTools.includes("deepwiki"))
		commands.push("echo 'Configure DeepWiki MCP manually from provider docs.'");
	if (optionalTools.includes("playwright"))
		commands.push("bunx playwright install --with-deps");
	return commands;
}
