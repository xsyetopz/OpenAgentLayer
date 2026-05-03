#!/usr/bin/env bun
import { resolve } from "node:path";
import { Command } from "commander";
import { runAcceptCommand } from "./commands/accept";
import { runBinCommand } from "./commands/bin";
import { runCheckCommand } from "./commands/check";
import { runDeployCommand } from "./commands/deploy";
import { runPluginsCommand } from "./commands/plugins";
import { runPreviewCommand } from "./commands/preview";
import { runProviderE2eCommand } from "./commands/provider-e2e";
import { runRenderCommand } from "./commands/render";
import { runRoadmapEvidenceCommand } from "./commands/roadmap-evidence";
import { runRtkGainCommand } from "./commands/rtk-gain";
import { runRtkReportCommand } from "./commands/rtk-report";
import { runSetupCommand } from "./commands/setup";
import { runFeaturesCommand, runToolchainCommand } from "./commands/toolchain";
import { runUninstallCommand } from "./commands/uninstall";
import { runInteractiveCommand } from "./interactive";

const repoRoot = resolve(import.meta.dir, "../../..");

const program = new Command()
	.name("oal")
	.description("OpenAgentLayer provider-native generator and deployer")
	.enablePositionalOptions(false)
	.showSuggestionAfterError()
	.showHelpAfterError()
	.exitOverride();

program
	.command("accept")
	.description("run full OAL acceptance")
	.action(() => runAcceptCommand(repoRoot));

program
	.command("check")
	.description("validate OAL source and renderability")
	.option("--verbose", "print source and render internals")
	.option("--installed", "also validate installed provider state")
	.option(
		"--provider <provider>",
		"all, codex, claude, opencode, or comma-separated set",
		"all",
	)
	.option("--home <dir>", "home directory for global installed checks")
	.option("--target <dir>", "project target directory for installed checks")
	.action((options) => runCheckCommand(repoRoot, argsFromOptions(options)));

addRenderOptions(
	program
		.command("setup")
		.description("set up or update OAL across provider homes"),
)
	.option("--target <dir>", "project target directory")
	.option("--bin-dir <dir>", "global executable directory")
	.option("--dry-run", "print planned setup without writing")
	.option("--verbose", "print detailed setup output")
	.option("--quiet", "suppress normal setup output")
	.option("--optional <tools>", "comma-separated ctx7,deepwiki,playwright")
	.option("--rtk", "install/init RTK policy surfaces")
	.option("--ctx7-cli", "install/configure Context7 CLI")
	.option("--playwright-cli", "install/configure Playwright CLI")
	.option("--deepwiki-mcp", "configure DeepWiki MCP where supported")
	.action((options) => runSetupCommand(repoRoot, argsFromOptions(options)));

program
	.command("bin")
	.description("install, inspect, or remove the local oal executable shim")
	.option("--home <dir>", "home directory for global CLI ownership")
	.option("--bin-dir <dir>", "directory that should contain oal")
	.option("--remove", "remove owned oal executable shim")
	.option("--dry-run", "print planned binary change without writing")
	.addHelpText(
		"after",
		`
Examples:
  $ oal bin --dry-run
  $ oal bin --bin-dir "$HOME/.local/bin"
  $ oal bin --remove
`,
	)
	.action((options) => runBinCommand(repoRoot, argsFromOptions(options)));

addRenderOptions(
	program
		.command("preview")
		.description("show generated artifact paths and optional content"),
)
	.option("--path <artifact>", "show one generated artifact")
	.option("--content", "include artifact content")
	.action((options) => runPreviewCommand(repoRoot, argsFromOptions(options)));

addRenderOptions(
	program
		.command("render")
		.description("write generated artifacts to an output dir"),
)
	.option("--out <dir>", "output directory")
	.action((options) => runRenderCommand(repoRoot, argsFromOptions(options)));

addRenderOptions(
	program
		.command("deploy")
		.description("deploy OAL artifacts into project or global provider home"),
)
	.option("--target <dir>", "project target directory")
	.option("--bin-dir <dir>", "global executable directory")
	.option("--skip-bin", "skip global oal executable shim")
	.option("--dry-run", "print planned changes without writing")
	.option("--verbose", "print per-artifact deploy details")
	.option("--quiet", "suppress normal progress output")
	.addHelpText(
		"after",
		`
Examples:
  $ oal deploy --target /repo --scope project --provider all --dry-run
  $ oal deploy --scope global --provider codex,opencode --dry-run --verbose
  $ oal deploy --scope global --provider all --bin-dir "$HOME/.local/bin"
`,
	)
	.action((options) => runDeployCommand(repoRoot, argsFromOptions(options)));

program
	.command("uninstall")
	.description("remove OAL-owned artifacts for one provider")
	.option("--target <dir>", "project target directory")
	.option("--scope <scope>", "project or global", "project")
	.option("--home <dir>", "home directory for global scope")
	.option("--verbose", "print per-artifact uninstall details")
	.option("--quiet", "suppress normal progress output")
	.requiredOption("--provider <provider>", "codex, claude, or opencode")
	.addHelpText(
		"after",
		`
Examples:
  $ oal uninstall --target /repo --scope project --provider codex
  $ oal uninstall --scope global --provider opencode --verbose
`,
	)
	.action((options) => runUninstallCommand(argsFromOptions(options)));

addRenderOptions(
	program
		.command("plugins")
		.description("sync provider plugin payloads into provider homes"),
)
	.option("--dry-run", "print planned changes without writing")
	.option("--verbose", "print per-artifact plugin sync details")
	.option("--quiet", "suppress normal progress output")
	.option("--json", "print structured JSON")
	.action((options) => runPluginsCommand(repoRoot, argsFromOptions(options)));

program
	.command("toolchain")
	.description("print OS package-manager setup commands")
	.option("--os <os>", "macos or linux")
	.option("--pkg <manager>", "brew, apt, dnf, pacman, zypper, or apk")
	.option("--optional <tools>", "comma-separated optional tools")
	.option("--json", "print JSON")
	.option("--homebrew-missing", "pretend Homebrew is missing on macOS")
	.action((options) => runToolchainCommand(argsFromOptions(options)));

program
	.command("features")
	.description("print optional feature install or removal commands")
	.option("--install <tools>", "comma-separated optional tools")
	.option("--remove <tools>", "comma-separated optional tools")
	.action((options) => runFeaturesCommand(argsFromOptions(options)));

program
	.command("rtk-gain")
	.description("check RTK gain policy")
	.option("--from-file <path>", "read fixture output")
	.option("--allow-empty-history", "treat empty RTK history as neutral")
	.action((options) => runRtkGainCommand(repoRoot, argsFromOptions(options)));

program
	.command("rtk-report")
	.description("summarize RTK project history by command routing kind")
	.option("--project <dir>", "project path to filter")
	.option("--db <path>", "RTK history sqlite database")
	.action((options) => runRtkReportCommand(argsFromOptions(options)));

program
	.command("roadmap-evidence")
	.description("print OAL acceptance evidence")
	.action(() => runRoadmapEvidenceCommand(repoRoot));

program
	.command("provider-e2e")
	.description(
		"check real provider binaries and optionally run headless live prompts",
	)
	.option(
		"--provider <provider>",
		"all, codex, opencode, or comma-separated set",
		"all",
	)
	.option("--live", "run live headless prompts in temp fixtures")
	.action((options) =>
		runProviderE2eCommand(repoRoot, argsFromOptions(options)),
	);

program
	.command("interactive", { isDefault: true })
	.description("choose an OAL workflow interactively")
	.action(() => runInteractiveCommand(repoRoot));

try {
	if (unknownCommand(process.argv)) {
		console.error(`error: unknown command '${process.argv[2]}'`);
		program.outputHelp({ error: true });
		process.exit(1);
	}
	if (process.argv.slice(2).length === 0 && !process.stdin.isTTY) {
		program.outputHelp();
		process.exit(0);
	}
	await program.parseAsync();
} catch (error) {
	if (isCommanderExit(error)) process.exit(error.exitCode);
	throw error;
}

function unknownCommand(argv: string[]): boolean {
	const command = argv[2];
	if (!command || command.startsWith("-")) return false;
	if (command === "help") return false;
	return !program.commands.some((candidate) => candidate.name() === command);
}

function addRenderOptions(command: Command): Command {
	return command
		.option(
			"--provider <provider>",
			"all, codex, claude, opencode, or comma-separated set",
			"all",
		)
		.option("--scope <scope>", "project or global", "project")
		.option("--home <dir>", "home directory for global scope")
		.option("--plan <plan>", "legacy shared model plan")
		.option("--codex-plan <plan>", "Codex plan: plus, pro-5, or pro-20")
		.option(
			"--claude-plan <plan>",
			"Claude plan: max-5, max-20, or max-20-long",
		)
		.option(
			"--opencode-plan <plan>",
			"OpenCode plan: opencode-auto, opencode-auth, or opencode-free",
		)
		.option("--opencode-models-file <path>", "saved `opencode models` output")
		.option(
			"--caveman-mode <mode>",
			"off, lite, full, ultra, wenyan-lite, wenyan, or wenyan-ultra",
		);
}

function argsFromOptions(options: Record<string, unknown>): string[] {
	const args: string[] = [];
	pushValue(args, "--provider", options["provider"]);
	pushValue(args, "--scope", options["scope"]);
	pushValue(args, "--home", options["home"]);
	pushValue(args, "--plan", options["plan"]);
	pushValue(args, "--codex-plan", options["codexPlan"]);
	pushValue(args, "--claude-plan", options["claudePlan"]);
	pushValue(args, "--opencode-plan", options["opencodePlan"]);
	pushValue(args, "--opencode-models-file", options["opencodeModelsFile"]);
	pushValue(args, "--caveman-mode", options["cavemanMode"]);
	pushValue(args, "--path", options["path"]);
	pushValue(args, "--out", options["out"]);
	pushValue(args, "--target", options["target"]);
	pushValue(args, "--bin-dir", options["binDir"]);
	pushValue(args, "--os", options["os"]);
	pushValue(args, "--pkg", options["pkg"]);
	pushValue(args, "--optional", options["optional"]);
	pushValue(args, "--install", options["install"]);
	pushValue(args, "--remove", options["remove"]);
	pushValue(args, "--from-file", options["fromFile"]);
	pushValue(args, "--project", options["project"]);
	pushValue(args, "--db", options["db"]);
	pushFlag(args, "--content", options["content"]);
	pushFlag(args, "--installed", options["installed"]);
	pushFlag(args, "--rtk", options["rtk"]);
	pushFlag(args, "--ctx7-cli", options["ctx7Cli"]);
	pushFlag(args, "--playwright-cli", options["playwrightCli"]);
	pushFlag(args, "--deepwiki-mcp", options["deepwikiMcp"]);
	pushFlag(args, "--dry-run", options["dryRun"]);
	pushFlag(args, "--skip-bin", options["skipBin"]);
	pushFlag(args, "--verbose", options["verbose"]);
	pushFlag(args, "--quiet", options["quiet"]);
	pushFlag(args, "--remove", options["remove"]);
	pushFlag(args, "--json", options["json"]);
	pushFlag(args, "--homebrew-missing", options["homebrewMissing"]);
	pushFlag(args, "--allow-empty-history", options["allowEmptyHistory"]);
	pushFlag(args, "--live", options["live"]);
	return args;
}

function pushValue(args: string[], flag: string, value: unknown): void {
	if (typeof value === "string" && value.length > 0) args.push(flag, value);
}

function pushFlag(args: string[], flag: string, value: unknown): void {
	if (value === true) args.push(flag);
}

function isCommanderExit(error: unknown): error is { exitCode: number } {
	return (
		typeof error === "object" &&
		error !== null &&
		"exitCode" in error &&
		typeof error["exitCode"] === "number"
	);
}
