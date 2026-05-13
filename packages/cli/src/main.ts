#!/usr/bin/env bun
import { resolve } from "node:path";
import { Command } from "commander";
import { runAcceptCommand } from "./commands/accept";
import { runBinCommand } from "./commands/bin";
import { runCheckCommand } from "./commands/check";
import { runCodexCommand } from "./commands/codex";
import { runCodexUsageCommand } from "./commands/codex-usage";
import { runDeployCommand } from "./commands/deploy";
import { runInspectCommand } from "./commands/inspect";
import { runMcpCommand } from "./commands/mcp";
import { runOpenDexCommand } from "./commands/opendex";
import { runPluginsCommand } from "./commands/plugins";
import { runPreviewCommand } from "./commands/preview";
import { runProfilesCommand } from "./commands/profiles";
import { runProviderE2eCommand } from "./commands/provider-e2e";
import { runRenderCommand } from "./commands/render";
import { runRoadmapEvidenceCommand } from "./commands/roadmap-evidence";
import { runRtkGainCommand } from "./commands/rtk-gain";
import { runRtkReportCommand } from "./commands/rtk-report";
import { runSetupCommand } from "./commands/setup";
import { runStateCommand } from "./commands/state";
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
	.option("--profile <name>", "saved setup profile")
	.option("--config <path>", "OAL config file")
	.option("--bin-dir <dir>", "global executable directory")
	.option("--dry-run", "print planned setup without writing")
	.option("--verbose", "print detailed setup output")
	.option("--quiet", "suppress normal setup output")
	.option(
		"--optional <tools>",
		"comma-separated ctx7,deepwiki,playwright,anthropic-docs,opencode-docs",
	)
	.option("--toolchain", "install OAL command-line toolchain when missing")
	.option("--rtk", "install/init RTK policy surfaces")
	.option("--ctx7-cli", "install/configure Context7 CLI")
	.option("--context7-api-key <key>", "Context7 API key for higher rate limits")
	.option("--playwright-cli", "install/configure Playwright CLI")
	.option("--deepwiki-mcp", "configure DeepWiki MCP where supported")
	.option("--anthropic-docs-mcp", "configure Anthropic/Claude docs MCP")
	.option("--opencode-docs-mcp", "configure OpenCode docs MCP")
	.action((options) => runSetupCommand(repoRoot, argsFromOptions(options)));

addRenderOptions(
	program
		.command("profiles")
		.description("list, show, save, activate, or remove setup profiles")
		.argument("[action]", "list, show, save, use, remove, or args", "list")
		.argument("[name]", "profile name")
		.option("--config <path>", "OAL config file")
		.option("--target <dir>", "project target directory")
		.option("--bin-dir <dir>", "global executable directory")
		.option(
			"--optional <tools>",
			"comma-separated ctx7,deepwiki,playwright,anthropic-docs,opencode-docs",
		)
		.option("--toolchain", "install OAL command-line toolchain when missing")
		.option("--rtk", "install/init RTK policy surfaces")
		.option("--verbose", "print detailed setup output")
		.option("--activate", "activate the saved profile")
		.action((action: string, name: string | undefined, options) =>
			runProfilesCommand([
				action,
				...(name ? [name] : []),
				...argsFromOptions(options),
			]),
		),
);

addRenderOptions(
	program
		.command("state")
		.description(
			"inspect selected profile, provider availability, and deploy state",
		)
		.argument("[action]", "inspect", "inspect")
		.option("--profile <name>", "saved setup profile")
		.option("--config <path>", "OAL config file")
		.option("--target <dir>", "project target directory")
		.option("--bin-dir <dir>", "global executable directory")
		.option(
			"--optional <tools>",
			"comma-separated ctx7,deepwiki,playwright,anthropic-docs,opencode-docs",
		)
		.option("--json", "print structured JSON")
		.action((action: string, options) =>
			runStateCommand(repoRoot, [action, ...argsFromOptions(options)]),
		),
);

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

program
	.command("codex")
	.description("run OAL-managed Codex launch, agent, route, or peer workflows")
	.argument("<action>", "launch, agent, route, or peer")
	.argument("[values...]", "agent/route/mode plus prompt text")
	.option("--cwd <dir>", "working directory for Codex")
	.option("--out <path>", "write Codex output to a file")
	.option("--dry-run", "print the planned Codex command without launching")
	.addHelpText(
		"after",
		`
Examples:
  $ oal codex launch "spawn hermes to map the runtime hooks, wait, then summarize"
  $ oal codex agent hermes --dry-run "map the runtime hooks"
  $ oal codex route review --dry-run "audit the current diff"
  $ oal codex peer batch --dry-run "investigate, implement, validate, and review"
`,
	)
	.action((action: string, values: string[], options) =>
		runCodexCommand(repoRoot, [action, ...values, ...argsFromOptions(options)]),
	);

program
	.command("codex-usage")
	.description("inspect local Codex state for weekly quota-drain patterns")
	.option("--home <dir>", "home directory containing .codex/state_5.sqlite")
	.option("--db <path>", "explicit Codex state SQLite database")
	.option("--project <dir>", "only include threads for one project cwd")
	.option("--limit <n>", "number of rows to print", "12")
	.option("--json", "print structured JSON")
	.action((options) => runCodexUsageCommand(argsFromOptions(options)));

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
	.option("--diff", "print generated artifact diffs during dry-run")
	.option("--verbose", "print per-artifact deploy details")
	.option("--quiet", "suppress normal progress output")
	.addHelpText(
		"after",
		`
Examples:
  $ oal deploy --target /repo --scope project --provider all --dry-run
  $ oal deploy --target /repo --scope project --provider codex --dry-run --diff
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
	.option(
		"--optional <tools>",
		"comma-separated ctx7,deepwiki,playwright,anthropic-docs,opencode-docs",
	)
	.option("--json", "print JSON")
	.option("--context7-api-key <key>", "Context7 API key for ctx7 setup")
	.option("--homebrew-missing", "pretend Homebrew is missing on macOS")
	.action((options) => runToolchainCommand(argsFromOptions(options)));

program
	.command("features")
	.description("print optional feature install or removal commands")
	.option("--install <tools>", "comma-separated optional tools")
	.option("--remove <tools>", "comma-separated optional tools")
	.option("--context7-api-key <key>", "Context7 API key for ctx7 setup")
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
	.command("inspect")
	.description(
		"print OAL capability, manifest, diff, policy, and witness reports",
	)
	.argument(
		"[topic]",
		"capabilities, manifest, generated-diff, rtk-report, command-policy, or release-witness",
	)
	.action((topic: string | undefined) =>
		runInspectCommand(repoRoot, topic ? [topic] : []),
	);

program
	.command("opendex")
	.description("run the Rust OpenDex control-plane binary")
	.argument("[values...]", "arguments passed to opendex")
	.option("--dry-run", "print the planned OpenDex command without launching")
	.allowUnknownOption(true)
	.action((values: string[], options) =>
		runOpenDexCommand(repoRoot, [...values, ...argsFromOptions(options)]),
	);

program
	.command("provider-e2e")
	.description(
		"check real provider binaries and optionally run headless live prompts",
	)
	.option(
		"--provider <provider>",
		"all, codex, claude, opencode, or comma-separated set",
		"all",
	)
	.option("--live", "run live headless prompts in temp fixtures")
	.action((options) =>
		runProviderE2eCommand(repoRoot, argsFromOptions(options)),
	);

program
	.command("mcp")
	.description("run or configure OAL-owned MCP servers")
	.argument("<action>", "serve, install, or remove")
	.argument("<server>", "anthropic-docs, opencode-docs, or oal-inspect")
	.option("--provider <provider>", "opencode for config install/remove")
	.option("--scope <scope>", "project or global", "global")
	.option("--home <dir>", "home directory for global scope")
	.option("--target <dir>", "project target directory")
	.action((action: string, server: string, options) =>
		runMcpCommand(repoRoot, [action, server, ...argsFromOptions(options)]),
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
		)
		.option("--scope <scope>", "project or global")
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
			"--codex-orchestration <mode>",
			"Codex orchestration: opendex, multi_agent, or multi_agent_v2",
		)
		.option("--codex-agent-max-depth <n>", "Codex agents.max_depth")
		.option("--codex-agent-max-threads <n>", "Codex agents.max_threads")
		.option(
			"--codex-agent-job-max-runtime-seconds <n>",
			"Codex agents.job_max_runtime_seconds",
		)
		.option(
			"--codex-multi-agent-v2-max-concurrent-threads-per-session <n>",
			"Codex multi_agent_v2 max_concurrent_threads_per_session",
		)
		.option(
			"--codex-multi-agent-v2-min-wait-timeout-ms <n>",
			"Codex multi_agent_v2 min_wait_timeout_ms",
		)
		.option(
			"--codex-multi-agent-v2-hide-spawn-agent-metadata <boolean>",
			"Codex multi_agent_v2 hide_spawn_agent_metadata",
		)
		.option(
			"--codex-multi-agent-v2-usage-hint-enabled <boolean>",
			"Codex multi_agent_v2 usage_hint_enabled",
		)
		.option(
			"--codex-multi-agent-v2-usage-hint-text <text>",
			"Codex multi_agent_v2 usage_hint_text",
		)
		.option(
			"--codex-multi-agent-v2-root-usage-hint-text <text>",
			"Codex multi_agent_v2 root_agent_usage_hint_text",
		)
		.option(
			"--codex-multi-agent-v2-subagent-usage-hint-text <text>",
			"Codex multi_agent_v2 subagent_usage_hint_text",
		)
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
	pushValue(args, "--codex-orchestration", options["codexOrchestration"]);
	pushValue(args, "--codex-agent-max-depth", options["codexAgentMaxDepth"]);
	pushValue(args, "--codex-agent-max-threads", options["codexAgentMaxThreads"]);
	pushValue(
		args,
		"--codex-agent-job-max-runtime-seconds",
		options["codexAgentJobMaxRuntimeSeconds"],
	);
	pushValue(
		args,
		"--codex-multi-agent-v2-max-concurrent-threads-per-session",
		options["codexMultiAgentV2MaxConcurrentThreadsPerSession"],
	);
	pushValue(
		args,
		"--codex-multi-agent-v2-min-wait-timeout-ms",
		options["codexMultiAgentV2MinWaitTimeoutMs"],
	);
	pushValue(
		args,
		"--codex-multi-agent-v2-hide-spawn-agent-metadata",
		options["codexMultiAgentV2HideSpawnAgentMetadata"],
	);
	pushValue(
		args,
		"--codex-multi-agent-v2-usage-hint-enabled",
		options["codexMultiAgentV2UsageHintEnabled"],
	);
	pushValue(
		args,
		"--codex-multi-agent-v2-usage-hint-text",
		options["codexMultiAgentV2UsageHintText"],
	);
	pushValue(
		args,
		"--codex-multi-agent-v2-root-usage-hint-text",
		options["codexMultiAgentV2RootUsageHintText"],
	);
	pushValue(
		args,
		"--codex-multi-agent-v2-subagent-usage-hint-text",
		options["codexMultiAgentV2SubagentUsageHintText"],
	);
	pushValue(args, "--caveman-mode", options["cavemanMode"]);
	pushValue(args, "--path", options["path"]);
	pushValue(args, "--out", options["out"]);
	pushValue(args, "--cwd", options["cwd"]);
	pushValue(args, "--target", options["target"]);
	pushValue(args, "--profile", options["profile"]);
	pushValue(args, "--config", options["config"]);
	pushValue(args, "--bin-dir", options["binDir"]);
	pushValue(args, "--os", options["os"]);
	pushValue(args, "--pkg", options["pkg"]);
	pushValue(args, "--optional", options["optional"]);
	pushValue(args, "--context7-api-key", options["context7ApiKey"]);
	pushValue(args, "--install", options["install"]);
	pushValue(args, "--remove", options["remove"]);
	pushValue(args, "--from-file", options["fromFile"]);
	pushValue(args, "--project", options["project"]);
	pushValue(args, "--db", options["db"]);
	pushFlag(args, "--content", options["content"]);
	pushFlag(args, "--installed", options["installed"]);
	pushFlag(args, "--toolchain", options["toolchain"]);
	pushFlag(args, "--rtk", options["rtk"]);
	pushFlag(args, "--ctx7-cli", options["ctx7Cli"]);
	pushFlag(args, "--playwright-cli", options["playwrightCli"]);
	pushFlag(args, "--deepwiki-mcp", options["deepwikiMcp"]);
	pushFlag(args, "--anthropic-docs-mcp", options["anthropicDocsMcp"]);
	pushFlag(args, "--opencode-docs-mcp", options["opencodeDocsMcp"]);
	pushFlag(args, "--dry-run", options["dryRun"]);
	pushFlag(args, "--diff", options["diff"]);
	pushFlag(args, "--skip-bin", options["skipBin"]);
	pushFlag(args, "--verbose", options["verbose"]);
	pushFlag(args, "--quiet", options["quiet"]);
	pushFlag(args, "--remove", options["remove"]);
	pushFlag(args, "--json", options["json"]);
	pushFlag(args, "--homebrew-missing", options["homebrewMissing"]);
	pushFlag(args, "--allow-empty-history", options["allowEmptyHistory"]);
	pushFlag(args, "--live", options["live"]);
	pushFlag(args, "--activate", options["activate"]);
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
