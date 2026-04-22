import { spawn, spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	DEFAULT_CAVEMAN_MODE,
	resolveCavemanMode,
} from "../../source/caveman.mjs";
import {
	getClaudePlan,
	resolveClaudePlan,
	resolveCodexPlan,
	resolveCopilotPlan,
} from "../../source/subscriptions.mjs";
import {
	mergeClaudeSettings,
	renderClaudeSettingsTemplate,
} from "./claude-settings.mjs";
import {
	installCodexPluginPayload,
	validateCodexPluginPayload,
} from "./codex-plugin-install.mjs";

import {
	CODEX_WRAPPER_NAMES,
	renderCodexWrapperCmd,
	renderCodexWrapperPs1,
	renderCodexWrapperShim,
} from "./codex-wrapper-shims.mjs";
import {
	mergeCodexConfig,
	mergeCodexHooks,
	mergeTaggedMarkdown,
	updateCodexAgents,
	updateCodexMarketplace,
} from "./managed-files.mjs";

import {
	installSelectionToRtkReferences,
	rtkPolicyPathMap,
	selectedRtkPolicyTargets,
	writeRtkPolicyFiles,
	writeRtkReferences,
} from "./rtk-surfaces.mjs";

import {
	commandExists,
	ctx7RunnerCommand,
	ctx7RunnerLine,
	fail,
	loadConfigEnv,
	logInfo,
	logWarn,
	PATHS,
	pathExists,
	promptText,
	promptToggle,
	ROOT,
	readText,
	removeChildrenWithMarker,
	removeClaudePluginCache,
	removeCopilotPluginCaches,
	replaceManagedTree,
	resolveWorkspacePaths,
	run,
	syncManagedTree,
	writeConfigEnv,
	writeText,
} from "./shared.mjs";

function renderCtx7Ps1() {
	const [runner, runnerArgs] = ctx7RunnerCommand();
	if (!runner) {
		return [
			"Set-StrictMode -Version Latest",
			"$ErrorActionPreference = 'Stop'",
			'Write-Error "Error: no JS package runner found for ctx7 (need bun, pnpm, yarn, or npm)."',
		].join("\n");
	}
	const joinedArgs = runnerArgs.map((arg) => `'${arg}'`).join(", ");
	return [
		"Set-StrictMode -Version Latest",
		"$ErrorActionPreference = 'Stop'",
		`$configEnv = "${PATHS.configEnvFile.replaceAll("\\", "\\\\")}"`,
		"if (Test-Path $configEnv) {",
		"  foreach ($line in Get-Content $configEnv) {",
		"    if ($line -match '^(#|\\s*$)') { continue }",
		"    $parts = $line -split '=', 2",
		"    if ($parts.Length -eq 2) {",
		"      [Environment]::SetEnvironmentVariable($parts[0], $parts[1])",
		"    }",
		"  }",
		"}",
		`$runner = '${runner}'`,
		`$runnerArgs = @(${joinedArgs}) + $args`,
		"& $runner @runnerArgs",
		"exit $LASTEXITCODE",
	].join("\n");
}

function renderCtx7Cmd() {
	return [
		"@echo off",
		`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ctx7.ps1" %*`,
	].join("\r\n");
}

async function installCodexWrapperShims() {
	if (process.platform === "win32") {
		for (const name of CODEX_WRAPPER_NAMES) {
			await writeText(
				path.join(PATHS.managedBinDir, `${name}.ps1`),
				renderCodexWrapperPs1(name),
				true,
			);
			await writeText(
				path.join(PATHS.managedBinDir, `${name}.cmd`),
				renderCodexWrapperCmd(name),
			);
		}
		logInfo(`Codex wrapper shims -> ${PATHS.managedBinDir}`);
		logWarn(
			`Ensure ${PATHS.managedBinDir} is on PATH for Codex wrapper discovery in PowerShell and cmd.exe`,
		);
		return;
	}
	for (const name of CODEX_WRAPPER_NAMES) {
		await writeText(
			path.join(PATHS.managedBinDir, name),
			renderCodexWrapperShim(name),
			true,
		);
	}
	logInfo(`Codex wrapper shims -> ${PATHS.managedBinDir}`);
}

function usage() {
	console.log(`openagentsbtw installer

Usage: ./install.sh [system toggles] [options]

System toggles (allow multiple):
  --claude                Install Claude Code support
  --opencode              Install OpenCode support
  --codex                 Install Codex support
  --copilot               Install GitHub Copilot support
  --cline                 Install Cline support when detected
  --cursor                Install Cursor support when detected
  --junie                 Install JetBrains Junie support when detected
  --antigravity           Install Antigravity support when detected
  --optional-ides         Auto-detect and install optional IDE support
  --no-optional-ides      Disable optional IDE auto-detection
  --all                   Install all supported systems

Options:
  --skip-rtk              Skip RTK install for Claude Code, Codex, OpenCode, and Copilot
  --claude-plan pro|max-5|max-20
                          Claude capability preset (default: max-5)
  --opencode-scope project|global
                          OpenCode install target (default: global)
  --opencode-default-model MODEL
                          Use one model id for all OpenCode agents
  --opencode-model ROLE=MODEL
                          Override a specific OpenCode role model
  --copilot-scope global|project|both
                          Copilot install target (default: global)
  --copilot-plan pro|pro-plus
                          Copilot capability preset (default: pro)
  --caveman-mode MODE     Set managed Caveman mode: off|lite|full|ultra|wenyan-lite|wenyan|wenyan-ultra
  --no-caveman            Alias for --caveman-mode off
  --codex-plan go|plus|pro-5|pro-20
                          Codex capability preset (default: pro-5)
  --codex-set-top-profile Force setting top-level Codex profile in the managed Codex config
  --no-codex-set-top-profile
                          Do not set top-level Codex profile in the managed Codex config
  --deepwiki-mcp          Configure DeepWiki MCP where supported
  --ctx7-cli              Install Context7 CLI support
  --no-ctx7-cli           Do not install Context7 CLI support
  --playwright-cli        Install Playwright CLI (browser automation)
  --no-playwright-cli     Do not install Playwright CLI
  -h, --help              Show this help`);
}

function parseArgs(argv) {
	const args = {
		installClaude: false,
		installOpenCode: false,
		installCodex: false,
		installCopilot: false,
		installCline: false,
		installCursor: false,
		installJunie: false,
		installAntigravity: false,
		optionalIdes: false,
		optionalIdesSet: false,
		skipRtk: false,
		claudePlan: "max-5",
		claudePlanSet: false,
		opencodeScope: "global",
		opencodeDefaultModel: "",
		opencodeModelOverrides: [],
		copilotScope: "global",
		copilotPlan: "pro",
		copilotPlanSet: false,
		cavemanMode: "",
		cavemanModeSet: false,
		codexPlan: "",
		codexPlanSet: false,
		deepwikiMcp: false,
		deepwikiMcpSet: false,
		codexSetTopProfile: "auto",
		playwrightCli: false,
		playwrightCliSet: false,
		ctx7Cli: false,
		ctx7CliSet: false,
		help: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		switch (token) {
			case "--claude":
				args.installClaude = true;
				break;
			case "--opencode":
				args.installOpenCode = true;
				break;
			case "--codex":
				args.installCodex = true;
				break;
			case "--copilot":
				args.installCopilot = true;
				break;
			case "--cline":
				args.installCline = true;
				break;
			case "--cursor":
				args.installCursor = true;
				break;
			case "--junie":
				args.installJunie = true;
				break;
			case "--antigravity":
				args.installAntigravity = true;
				break;
			case "--optional-ides":
				args.optionalIdes = true;
				args.optionalIdesSet = true;
				break;
			case "--no-optional-ides":
				args.optionalIdes = false;
				args.optionalIdesSet = true;
				break;
			case "--all":
				args.installClaude = true;
				args.installOpenCode = true;
				args.installCodex = true;
				args.installCopilot = true;
				if (!args.optionalIdesSet) {
					args.optionalIdes = true;
				}
				break;
			case "--skip-rtk":
				args.skipRtk = true;
				break;
			case "--claude-plan":
				args.claudePlan = argv[++index] ?? "";
				args.claudePlanSet = true;
				break;
			case "--opencode-scope":
				args.opencodeScope = argv[++index] ?? "";
				break;
			case "--opencode-default-model":
				args.opencodeDefaultModel = argv[++index] ?? "";
				break;
			case "--opencode-model":
				args.opencodeModelOverrides.push(argv[++index] ?? "");
				break;
			case "--copilot-scope":
				args.copilotScope = argv[++index] ?? "";
				break;
			case "--copilot-plan":
				args.copilotPlan = argv[++index] ?? "";
				args.copilotPlanSet = true;
				break;
			case "--caveman-mode":
				args.cavemanMode = argv[++index] ?? "";
				args.cavemanModeSet = true;
				break;
			case "--no-caveman":
				args.cavemanMode = "off";
				args.cavemanModeSet = true;
				break;
			case "--codex-plan":
				args.codexPlan = argv[++index] ?? "";
				args.codexPlanSet = true;
				break;
			case "--codex-set-top-profile":
				args.codexSetTopProfile = "true";
				break;
			case "--no-codex-set-top-profile":
				args.codexSetTopProfile = "false";
				break;
			case "--deepwiki-mcp":
				args.deepwikiMcp = true;
				args.deepwikiMcpSet = true;
				break;
			case "--ctx7-cli":
				args.ctx7Cli = true;
				args.ctx7CliSet = true;
				break;
			case "--no-ctx7-cli":
				args.ctx7Cli = false;
				args.ctx7CliSet = true;
				break;
			case "--playwright-cli":
				args.playwrightCli = true;
				args.playwrightCliSet = true;
				break;
			case "--no-playwright-cli":
				args.playwrightCli = false;
				args.playwrightCliSet = true;
				break;
			case "-h":
			case "--help":
				args.help = true;
				break;
			default:
				fail(`Unknown argument: ${token}`);
		}
	}

	return args;
}

function isCi() {
	return process.env.CI === "true";
}

function repoPath(...segments) {
	return path.join(ROOT, ...segments);
}

function installsAnySystem(args) {
	return Boolean(
		args.installClaude ||
			args.installOpenCode ||
			args.installCodex ||
			args.installCopilot ||
			args.installCline ||
			args.installCursor ||
			args.installJunie ||
			args.installAntigravity ||
			args.optionalIdes,
	);
}

async function ensureSelection(args) {
	if (
		args.installClaude ||
		args.installOpenCode ||
		args.installCodex ||
		args.installCopilot ||
		args.installCline ||
		args.installCursor ||
		args.installJunie ||
		args.installAntigravity ||
		args.optionalIdes
	) {
		return;
	}

	console.log("\x1b[0;32mSelect systems to install\x1b[0m");
	args.installClaude = await promptToggle(
		"Install Claude Code support?",
		true,
		isCi(),
	);
	args.installOpenCode = await promptToggle(
		"Install OpenCode support?",
		true,
		isCi(),
	);
	args.installCodex = await promptToggle(
		"Install Codex support?",
		true,
		isCi(),
	);
	args.installCopilot = await promptToggle(
		"Install GitHub Copilot support?",
		true,
		isCi(),
	);

	if (
		!args.installClaude &&
		!args.installOpenCode &&
		!args.installCodex &&
		!args.installCopilot &&
		!args.optionalIdes
	) {
		fail("No systems selected");
	}
}

async function promptOptionalSurfaces(args, existingEnv) {
	if (args.installClaude && !args.claudePlanSet) {
		args.claudePlan =
			resolveStoredClaudePlan(existingEnv.OABTW_CLAUDE_PLAN || "") ||
			args.claudePlan;
	}
	if (args.installClaude && !args.claudePlanSet && !isCi()) {
		args.claudePlan =
			resolveClaudePlan(
				(await promptText(
					"Claude plan preset [pro/max-5/max-20]:",
					false,
					args.claudePlan ||
						resolveStoredClaudePlan(existingEnv.OABTW_CLAUDE_PLAN || "") ||
						"max-5",
				)) ||
					args.claudePlan ||
					resolveStoredClaudePlan(existingEnv.OABTW_CLAUDE_PLAN || "") ||
					"max-5",
			) || "max-5";
	}
	if (args.installOpenCode && !args.opencodeDefaultModel && !isCi()) {
		args.opencodeDefaultModel = await promptText(
			"OpenCode default model for all agents (blank = auto-detect/fallback):",
		);
	}
	if (args.installCodex && !args.codexPlanSet && !args.codexPlan) {
		args.codexPlan = isCi()
			? existingEnv.OABTW_CODEX_PLAN || "pro-5"
			: resolveCodexPlan(
					(await promptText(
						"Codex plan preset [go/plus/pro-5/pro-20]:",
						false,
						args.codexPlan || existingEnv.OABTW_CODEX_PLAN || "pro-5",
					)) || "pro-5",
				) ||
				existingEnv.OABTW_CODEX_PLAN ||
				"pro-5";
	}
	if (args.installCodex && args.codexSetTopProfile === "auto") {
		args.codexSetTopProfile = "true";
	}
	if (args.installCopilot && !args.copilotPlanSet && !isCi()) {
		args.copilotPlan =
			resolveCopilotPlan(
				(await promptText(
					"Copilot plan preset [pro/pro-plus]:",
					false,
					args.copilotPlan || existingEnv.OABTW_COPILOT_PLAN || "pro",
				)) ||
					args.copilotPlan ||
					existingEnv.OABTW_COPILOT_PLAN ||
					"pro",
			) || "pro";
	}
	if (!args.cavemanModeSet && installsAnySystem(args)) {
		args.cavemanMode = isCi()
			? resolveCavemanMode(existingEnv.OABTW_CAVEMAN_MODE || "") ||
				DEFAULT_CAVEMAN_MODE
			: resolveCavemanMode(
					(await promptText(
						"Caveman mode [off/lite/full/ultra/wenyan-lite/wenyan/wenyan-ultra]:",
						false,
						args.cavemanMode ||
							existingEnv.OABTW_CAVEMAN_MODE ||
							DEFAULT_CAVEMAN_MODE,
					)) || DEFAULT_CAVEMAN_MODE,
				) ||
				resolveCavemanMode(existingEnv.OABTW_CAVEMAN_MODE || "") ||
				DEFAULT_CAVEMAN_MODE;
	}
	if (!args.ctx7CliSet && installsAnySystem(args)) {
		args.ctx7Cli = await promptToggle(
			"Install Context7 CLI support?",
			true,
			isCi(),
		);
	}
	if (!args.deepwikiMcpSet && installsAnySystem(args)) {
		args.deepwikiMcp = await promptToggle(
			"Configure DeepWiki MCP where supported?",
			false,
			isCi(),
		);
	}
	if (!args.playwrightCliSet && installsAnySystem(args)) {
		args.playwrightCli = await promptToggle(
			"Install Playwright CLI support (browser automation)?",
			false,
			isCi(),
		);
	}
	args.context7ApiKey = existingEnv.CONTEXT7_API_KEY || "";
}

function validateArgs(args) {
	args.claudePlan = resolveClaudePlan(args.claudePlan);
	if (!args.claudePlan) {
		fail(
			`Unsupported Claude plan: ${args.claudePlan} (expected pro, max-5, or max-20)`,
		);
	}
	if (!["global", "project"].includes(args.opencodeScope)) {
		fail(
			`Unsupported OpenCode scope: ${args.opencodeScope} (expected global or project)`,
		);
	}
	args.codexPlan = resolveCodexPlan(args.codexPlan || "pro-5");
	if (args.installCodex && !args.codexPlan) {
		fail(
			`Unsupported Codex plan: ${args.codexPlan} (expected go, plus, pro-5, or pro-20)`,
		);
	}
	args.copilotPlan = resolveCopilotPlan(args.copilotPlan);
	if (!args.copilotPlan) {
		fail(
			`Unsupported Copilot plan: ${args.copilotPlan} (expected pro or pro-plus)`,
		);
	}
	args.cavemanMode = resolveCavemanMode(
		args.cavemanMode || (installsAnySystem(args) ? DEFAULT_CAVEMAN_MODE : ""),
	);
	if (installsAnySystem(args) && !args.cavemanMode) {
		fail(
			`Unsupported Caveman mode: ${args.cavemanMode} (expected off, lite, full, ultra, wenyan-lite, wenyan, or wenyan-ultra)`,
		);
	}
	if (!["global", "project", "both"].includes(args.copilotScope)) {
		fail(
			`Unsupported Copilot scope: ${args.copilotScope} (expected global, project, or both)`,
		);
	}
}

async function ensureNode() {
	if (!commandExists("node")) {
		fail(
			"node not found. Claude and Codex hook scripts require Node.js >= 24.14.1.",
		);
	}
	const version = process.versions.node.split(".").map(Number);
	const [major = 0, minor = 0, patch = 0] = version;
	if (
		major < 24 ||
		(major === 24 && minor < 14) ||
		(major === 24 && minor === 14 && patch < 1)
	) {
		fail(`Node.js v${process.versions.node} is too old. Requires >= 24.14.1.`);
	}
	logInfo(`Node.js v${process.versions.node}`);
}

async function ensureBun() {
	if (commandExists("bun")) {
		const result = await runVersion("bun", ["--version"]);
		logInfo(`bun ${result}`);
		return;
	}
	if (isCi()) {
		fail("bun not found and CI mode is enabled. Install bun first.");
	}
	if (process.platform === "win32") {
		fail(
			"bun not found. Install bun manually on Windows before enabling OpenCode support.",
		);
	}
	logWarn(
		"bun not found; attempting to install bun (required for OpenCode support and preferred for JS tooling)",
	);
	await run("sh", ["-lc", "curl -fsSL https://bun.sh/install | bash"]);
	process.env.PATH = `${path.join(os.homedir(), ".bun", "bin")}:${process.env.PATH ?? ""}`;
}

async function runVersion(command, args) {
	const output = await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.on("exit", (code) => {
			if (code === 0) resolve(stdout.trim());
			else reject(new Error(`${command} ${args.join(" ")} failed`));
		});
		child.on("error", reject);
	});
	return output;
}

async function ensureClaudeVersion() {
	if (isCi()) {
		logInfo("CI mode - skipping claude CLI version check");
		return;
	}
	if (!commandExists("claude")) {
		fail("claude CLI not found. Install Claude Code first.");
	}
	const versionRaw = await runVersion("claude", ["--version"]);
	const match = versionRaw.match(/(\d+)\.(\d+)\.(\d+)/);
	if (!match) {
		logWarn("Could not parse claude version, proceeding anyway");
		return;
	}
	const major = Number(match[1]);
	const minor = Number(match[2]);
	const patch = Number(match[3]);
	if (
		!(major > 2 || (major === 2 && (minor > 1 || (minor === 1 && patch >= 76))))
	) {
		fail(`Claude Code v${match[0]} is too old. Requires >= 2.1.76`);
	}
	logInfo(`Claude Code v${match[0]}`);
}

async function buildArtifacts() {
	const buildDir = await fs.mkdtemp(
		path.join(os.tmpdir(), "openagentsbtw-build-"),
	);
	await run("node", [repoPath("scripts", "build.mjs"), "--out", buildDir], {
		cwd: ROOT,
	});
	logInfo(`Generated install artifacts -> ${buildDir}`);
	return {
		buildDir,
		claudeDir: path.join(buildDir, "claude"),
		codexDir: path.join(buildDir, "codex"),
		copilotDir: path.join(buildDir, "copilot"),
		opencodeTemplatesDir: path.join(buildDir, "opencode", "templates"),
		optionalIdeDir: path.join(buildDir, "optional-ides"),
		binDir: path.join(buildDir, "bin"),
	};
}

function configureClaudeModels(planName) {
	return getClaudePlan(planName).models;
}

async function installCtx7WrapperAndEnv(apiKey) {
	await writeConfigEnv({ CONTEXT7_API_KEY: apiKey });
	if (process.platform === "win32") {
		await writeText(PATHS.ctx7Ps1Wrapper, renderCtx7Ps1(), true);
		await writeText(PATHS.ctx7CmdWrapper, renderCtx7Cmd());
		logInfo(`ctx7 wrappers -> ${PATHS.managedBinDir}`);
		logWarn(
			`Ensure ${PATHS.managedBinDir} is on PATH for ctx7/cmd discovery in PowerShell and cmd.exe`,
		);
		return;
	}
	await writeText(
		PATHS.ctx7Wrapper,
		`#!/bin/bash
set -euo pipefail

if [[ -f "${PATHS.configEnvFile}" ]]; then
  # shellcheck disable=SC1090
  source "${PATHS.configEnvFile}"
  export CONTEXT7_API_KEY="\${CONTEXT7_API_KEY:-}"
fi

${ctx7RunnerLine()}
`,
		true,
	);
	logInfo(`ctx7 wrapper -> ${PATHS.ctx7Wrapper}`);
}

async function maybeInstallCtx7(args) {
	if (!args.ctx7Cli) return;
	console.log("\n\x1b[0;32mctx7\x1b[0m");
	if (isCi()) {
		logInfo("CI mode - skipping ctx7 setup");
		return;
	}
	if (!args.context7ApiKey) {
		const wantsKey = await promptToggle(
			"Provide Context7 API key for higher rate limits?",
			false,
			false,
		);
		if (wantsKey) {
			args.context7ApiKey = await promptText("Context7 API key:");
		}
	}
	await installCtx7WrapperAndEnv(args.context7ApiKey);
	try {
		await runJsPackage("ctx7@latest", ["--help"]);
		logInfo(
			`ctx7 CLI available via ${process.platform === "win32" ? PATHS.ctx7CmdWrapper : PATHS.ctx7Wrapper}`,
		);
	} catch {
		logWarn(
			"ctx7 package runner check failed; the managed wrapper will still pick an available JS runner at runtime",
		);
	}
}

async function maybeInstallPlaywright(args) {
	if (!args.playwrightCli) return;
	console.log("\n\x1b[0;32mPlaywright CLI\x1b[0m");
	if (isCi()) {
		logInfo("CI mode - skipping Playwright CLI install");
		return;
	}
	if (commandExists("playwright-cli")) {
		logInfo("playwright-cli already installed");
	} else if (commandExists("bun")) {
		await run("bun", ["add", "-g", "@playwright/cli@latest"]);
	} else if (commandExists("pnpm")) {
		await run("pnpm", ["add", "-g", "@playwright/cli@latest"]);
	} else if (commandExists("yarn")) {
		await run("yarn", ["global", "add", "@playwright/cli@latest"]);
	} else if (commandExists("npm")) {
		await run("npm", ["install", "-g", "@playwright/cli@latest"]);
	}

	const installSkills =
		(args.installOpenCode && args.opencodeScope === "project") ||
		(args.installCopilot &&
			(args.copilotScope === "project" || args.copilotScope === "both"));
	if (!installSkills) {
		logInfo(
			"Skipping playwright-cli skills install (no project-scope install selected)",
		);
		return;
	}
	try {
		const workspacePaths = resolveWorkspacePaths();
		if (commandExists("playwright-cli")) {
			await run("playwright-cli", ["install", "--skills"], {
				cwd: workspacePaths.workspaceRoot,
			});
		} else {
			await runJsPackage("@playwright/cli@latest", ["install", "--skills"], {
				cwd: workspacePaths.workspaceRoot,
			});
		}
		logInfo("playwright-cli skills installed into this repo");
	} catch {
		logWarn(
			"playwright-cli skills install failed; try manually: playwright-cli install --skills",
		);
	}
}

async function runJsPackage(pkg, args, options = {}) {
	const runner = resolveRunner();
	switch (runner) {
		case "bunx":
			await run("bunx", ["-y", pkg, ...args], options);
			return;
		case "bunx-fallback":
			await run("bun", ["x", "-y", pkg, ...args], options);
			return;
		case "pnpm":
			await run("pnpm", ["dlx", pkg, ...args], options);
			return;
		case "yarn":
			if (commandExists("npx")) {
				await run(
					"sh",
					[
						"-lc",
						`if yarn dlx --help >/dev/null 2>&1; then yarn dlx ${pkg} ${args.join(" ")}; else npx -y ${pkg} ${args.join(" ")}; fi`,
					],
					options,
				);
				return;
			}
			await run("yarn", ["dlx", pkg, ...args], options);
			return;
		case "npx":
		case "npm-npx":
			await run("npx", ["-y", pkg, ...args], options);
			return;
		default:
			fail("No JS package runner found (bun/pnpm/yarn/npm).");
	}
}

function resolveRunner() {
	if (commandExists("bunx")) return "bunx";
	if (commandExists("bun")) return "bunx-fallback";
	if (commandExists("pnpm")) return "pnpm";
	if (commandExists("yarn")) return "yarn";
	if (commandExists("npx")) return "npx";
	if (commandExists("npm")) return "npm-npx";
	return "none";
}

async function maybeInstallRtk(args) {
	if (args.skipRtk) return;
	if (
		!(
			args.installClaude ||
			args.installOpenCode ||
			args.installCodex ||
			args.installCopilot ||
			args.installCline ||
			args.installCursor ||
			args.installJunie ||
			args.installAntigravity ||
			args.optionalIdes
		)
	)
		return;

	console.log("\n\x1b[0;32mRTK\x1b[0m");
	if (isCi()) {
		logInfo("CI mode - skipping RTK install");
		return;
	}
	const enabled = await promptToggle(
		args.installClaude &&
			args.installOpenCode &&
			args.installCodex &&
			args.installCopilot
			? "Install RTK for all selected platforms?"
			: "Install RTK support?",
		true,
		false,
	);
	if (!enabled) {
		logWarn("Skipping RTK install");
		return;
	}
	if (!commandExists("rtk")) {
		if (process.platform === "win32") {
			logWarn(
				"RTK not found on Windows; skipping binary bootstrap and leaving configure-only mode",
			);
		} else if (commandExists("brew")) {
			await run("brew", ["install", "rtk-ai/tap/rtk"]);
		} else {
			await run("sh", [
				"-lc",
				"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh",
			]);
		}
	} else {
		logInfo("RTK already installed");
	}
	const workspacePaths = resolveWorkspacePaths();
	const policyTargets = selectedRtkPolicyTargets(args);
	await writeRtkPolicyFiles(policyTargets);
	await writeRtkReferences(
		installSelectionToRtkReferences(args, workspacePaths),
	);
	for (const target of policyTargets) {
		logInfo(`RTK policy -> ${target}`);
	}
}

async function installClaude(args, artifacts) {
	if (!args.installClaude) return;
	console.log("\n\x1b[0;32mClaude Code\x1b[0m");
	await ensureClaudeVersion();
	await ensureNode();
	const models = configureClaudeModels(args.claudePlan);
	const settingsFile = path.join(PATHS.claudeHome, "settings.json");
	await fs.mkdir(path.dirname(settingsFile), { recursive: true });
	if (!(await pathExists(settingsFile))) {
		await writeText(settingsFile, "{}\n");
		logInfo("Created settings.json");
	} else {
		await fs.copyFile(settingsFile, `${settingsFile}.backup`);
		logInfo("Backed up existing settings.json");
	}
	const template = path.join(
		artifacts.claudeDir,
		"templates",
		"settings-global.json",
	);
	const templateText = await readText(template);
	const existingSettings = JSON.parse(await readText(settingsFile, "{}"));
	const nextSettings = mergeClaudeSettings({
		template: renderClaudeSettingsTemplate(templateText, {
			homeDir: os.homedir(),
			models,
		}),
		existing: existingSettings,
		model: models.ccaModel,
		deepwiki: args.deepwikiMcp,
	});
	await writeText(settingsFile, JSON.stringify(nextSettings, null, 2));
	logInfo("Registered openagentsbtw marketplace");
	logInfo(`Claude settings merged in ${settingsFile}`);
	if (args.deepwikiMcp) {
		logInfo(`DeepWiki MCP -> ${settingsFile}`);
	}
	await fs.mkdir(path.join(PATHS.claudeHome, "hooks"), {
		recursive: true,
	});
	await fs.mkdir(path.join(PATHS.claudeHome, "output-styles"), {
		recursive: true,
	});
	for (const hook of ["pre-secrets.mjs"]) {
		const source = path.join(artifacts.claudeDir, "hooks", "user", hook);
		if (await pathExists(source)) {
			await fs.copyFile(source, path.join(PATHS.claudeHome, "hooks", hook));
			await fs.chmod(path.join(PATHS.claudeHome, "hooks", hook), 0o755);
		}
	}
	for (const [source, dest] of [
		[
			path.join(artifacts.claudeDir, "output-styles", "cca.md"),
			path.join(PATHS.claudeHome, "output-styles", "cca.md"),
		],
		[
			path.join(artifacts.claudeDir, "statusline", "statusline-command.sh"),
			path.join(PATHS.claudeHome, "statusline-command.sh"),
		],
	]) {
		if (await pathExists(source)) {
			await fs.copyFile(source, dest);
			await fs.chmod(dest, 0o755);
		}
	}
	const streamGuard = path.join(os.homedir(), ".streamguardrc.json");
	if (!(await pathExists(streamGuard))) {
		await fs.copyFile(repoPath(".streamguardrc.json.example"), streamGuard);
	}
	if (!isCi()) {
		await run(
			"claude",
			["plugin", "uninstall", "openagentsbtw@openagentsbtw"],
			{
				cwd: ROOT,
			},
		).catch(() => {});
		await run("claude", ["plugin", "uninstall", "openagentsbtw"], {
			cwd: ROOT,
		}).catch(() => {});
		const marketplaceDir = path.join(
			PATHS.claudeHome,
			"plugins",
			"marketplaces",
			"openagentsbtw",
		);
		await removeClaudePluginCache();
		await replaceManagedTree(artifacts.claudeDir, marketplaceDir);
		await run("claude", ["plugin", "install", "openagentsbtw"], {
			cwd: ROOT,
		}).catch(() =>
			logWarn(
				"Claude plugin install failed - run manually: make install-claude-plugin",
			),
		);
		logInfo("Claude plugin cache refreshed");
	}
}

async function installOpenCode(args, artifacts) {
	if (!args.installOpenCode) return;
	console.log("\n\x1b[0;32mOpenCode\x1b[0m");
	await ensureBun();
	const workspacePaths = resolveWorkspacePaths();
	const commandArgs = [
		"run",
		repoPath("opencode", "src", "cli.ts"),
		"--scope",
		args.opencodeScope,
		"--plugins",
		"inject-preamble,openagentsbtw-core,conventions,safety-guard",
	];
	if (args.opencodeDefaultModel) {
		commandArgs.push("--default-model", args.opencodeDefaultModel);
		logInfo(`OpenCode default model: ${args.opencodeDefaultModel}`);
	} else {
		logInfo("OpenCode models: auto-detect/fallback");
	}
	for (const override of args.opencodeModelOverrides) {
		commandArgs.push("--model", override);
		logInfo(`OpenCode override: ${override}`);
	}
	await run("bun", commandArgs, {
		cwd: args.opencodeScope === "project" ? workspacePaths.workspaceRoot : ROOT,
		env: {
			OABTW_OPENCODE_TEMPLATES_DIR: artifacts.opencodeTemplatesDir,
			OABTW_OPENCODE_DEEPWIKI: args.deepwikiMcp ? "true" : "false",
			OABTW_COPILOT_PLAN: args.copilotPlan,
		},
	});
	logInfo("OpenCode support installed");
}

async function writeCopilotDeepwiki(target) {
	const existing = await readText(target, "{}");
	let payload = {};
	try {
		payload = JSON.parse(existing);
	} catch {}
	payload.servers ??= {};
	payload.servers.deepwiki = {
		type: "http",
		url: "https://mcp.deepwiki.com/mcp",
	};
	await writeText(target, JSON.stringify(payload, null, 2));
}

function runVersionCheck(command, args) {
	try {
		const result = spawnSync(command, args, {
			encoding: "utf8",
			timeout: 3000,
		});
		if (result.status === 0) {
			return { ok: true, output: result.stdout.trim() || result.stderr.trim() };
		}
		return { ok: false, output: result.stderr.trim() || result.stdout.trim() };
	} catch (error) {
		return { ok: false, output: String(error.message || error) };
	}
}

async function logCopilotRuntimeDiagnostics() {
	const copilotBinary = commandExists("copilot");
	const ghBinary = commandExists("gh");
	const copilotCheck = copilotBinary
		? runVersionCheck("copilot", ["--version"])
		: { ok: false, output: "" };
	if (!copilotBinary) {
		logWarn(
			"Copilot CLI is not on PATH; native CLI continuation features will be unavailable until it is installed",
		);
	} else if (!copilotCheck.ok) {
		logWarn(
			`Copilot CLI is installed but not healthy in this environment: ${copilotCheck.output || "version check failed"}`,
		);
	}

	if (!ghBinary) {
		logWarn(
			"GitHub CLI is not on PATH; gh copilot fallback entrypoints are unavailable",
		);
	} else {
		const ghCheck = runVersionCheck("gh", ["copilot", "--help"]);
		if (!ghCheck.ok) {
			logWarn(
				`gh copilot is present but not healthy in this environment: ${ghCheck.output || "help check failed"}`,
			);
		}
	}

	const vscodeExtensionsDir =
		process.platform === "darwin"
			? path.join(PATHS.homeDir, ".vscode", "extensions")
			: process.platform === "linux"
				? path.join(PATHS.homeDir, ".vscode", "extensions")
				: path.join(PATHS.appDataDir, "Code", "extensions");
	if (await pathExists(vscodeExtensionsDir)) {
		const entries = await fs.readdir(vscodeExtensionsDir).catch(() => []);
		const copilotChatInstalled = entries.some((entry) =>
			entry.startsWith("github.copilot-chat-"),
		);
		if (!copilotChatInstalled) {
			logWarn(
				"VS Code Copilot Chat extension was not detected; editor-side instructions/hooks may not be active until it is installed",
			);
		}
	}
}

async function installCopilot(args, artifacts) {
	if (!args.installCopilot) return;
	console.log("\n\x1b[0;32mGitHub Copilot\x1b[0m");
	await ensureNode();
	const repoTemplateRoot = path.join(
		artifacts.copilotDir,
		"templates",
		".github",
	);
	const userTemplateRoot = path.join(
		artifacts.copilotDir,
		"templates",
		".copilot",
	);
	await logCopilotRuntimeDiagnostics();
	await removeCopilotPluginCaches();
	if (args.copilotScope === "global" || args.copilotScope === "both") {
		const home = PATHS.copilotHome;
		await fs.mkdir(path.join(home, "agents"), { recursive: true });
		await fs.mkdir(path.join(home, "skills"), { recursive: true });
		await fs.mkdir(path.join(home, "hooks", "scripts"), { recursive: true });
		await fs.mkdir(path.join(home, "instructions"), { recursive: true });
		if (await pathExists(path.join(userTemplateRoot, "agents"))) {
			await removeChildrenWithMarker(path.join(home, "agents"));
			await syncManagedTree(
				path.join(userTemplateRoot, "agents"),
				path.join(home, "agents"),
			);
		}
		if (await pathExists(path.join(userTemplateRoot, "skills"))) {
			await removeChildrenWithMarker(path.join(home, "skills"));
			await syncManagedTree(
				path.join(userTemplateRoot, "skills"),
				path.join(home, "skills"),
			);
		}
		await fs.copyFile(
			path.join(userTemplateRoot, "hooks", "openagentsbtw.json"),
			path.join(home, "hooks", "openagentsbtw.json"),
		);
		await fs.copyFile(
			path.join(userTemplateRoot, "hooks", "route-contracts.json"),
			path.join(home, "hooks", "route-contracts.json"),
		);
		await replaceManagedTree(
			path.join(artifacts.copilotDir, "hooks", "scripts", "openagentsbtw"),
			path.join(home, "hooks", "scripts", "openagentsbtw"),
		);
		await removeChildrenWithMarker(path.join(home, "instructions"));
		await syncManagedTree(
			path.join(userTemplateRoot, "instructions"),
			path.join(home, "instructions"),
		);
		await mergeTaggedMarkdown({
			target: path.join(home, "copilot-instructions.md"),
			template: path.join(userTemplateRoot, "copilot-instructions.md"),
			start: "<!-- >>> openagentsbtw copilot >>> -->",
			end: "<!-- <<< openagentsbtw copilot <<< -->",
		});
		logInfo(
			`Copilot user agents, skills, hooks, and instructions -> ${PATHS.copilotHome}`,
		);
		if (args.deepwikiMcp) {
			const vscodeUserMcp = PATHS.vscodeUserMcp;
			if (vscodeUserMcp) {
				await writeCopilotDeepwiki(vscodeUserMcp);
				logInfo(`DeepWiki MCP -> ${vscodeUserMcp}`);
			}
		}
	}
	if (args.copilotScope === "project" || args.copilotScope === "both") {
		const workspacePaths = resolveWorkspacePaths();
		const githubRoot = workspacePaths.projectGithubDir;
		await fs.mkdir(path.join(githubRoot, "hooks", "scripts"), {
			recursive: true,
		});
		await fs.mkdir(path.join(githubRoot, "instructions"), {
			recursive: true,
		});
		await removeChildrenWithMarker(path.join(githubRoot, "agents"));
		await syncManagedTree(
			path.join(repoTemplateRoot, "agents"),
			path.join(githubRoot, "agents"),
		);
		await removeChildrenWithMarker(path.join(githubRoot, "skills"));
		await syncManagedTree(
			path.join(repoTemplateRoot, "skills"),
			path.join(githubRoot, "skills"),
		);
		await removeChildrenWithMarker(path.join(githubRoot, "prompts"));
		await syncManagedTree(
			path.join(repoTemplateRoot, "prompts"),
			path.join(githubRoot, "prompts"),
		);
		await removeChildrenWithMarker(path.join(githubRoot, "instructions"));
		await syncManagedTree(
			path.join(repoTemplateRoot, "instructions"),
			path.join(githubRoot, "instructions"),
		);
		await fs.copyFile(
			path.join(repoTemplateRoot, "hooks", "openagentsbtw.json"),
			path.join(githubRoot, "hooks", "openagentsbtw.json"),
		);
		await fs.copyFile(
			path.join(repoTemplateRoot, "hooks", "route-contracts.json"),
			path.join(githubRoot, "hooks", "route-contracts.json"),
		);
		await replaceManagedTree(
			path.join(artifacts.copilotDir, "hooks", "scripts", "openagentsbtw"),
			path.join(githubRoot, "hooks", "scripts", "openagentsbtw"),
		);
		await mergeTaggedMarkdown({
			target: path.join(githubRoot, "copilot-instructions.md"),
			template: path.join(repoTemplateRoot, "copilot-instructions.md"),
			start: "<!-- >>> openagentsbtw copilot >>> -->",
			end: "<!-- <<< openagentsbtw copilot <<< -->",
		});
		if (args.deepwikiMcp) {
			await writeCopilotDeepwiki(workspacePaths.projectVscodeMcp);
			logInfo(`DeepWiki MCP -> ${workspacePaths.projectVscodeMcp}`);
		}
		logInfo("Copilot repo assets -> .github/");
	}
}

const OPTIONAL_IDES = [
	{
		id: "cline",
		label: "Cline",
		flag: "installCline",
		markers: () => [
			PATHS.clineHome,
			PATHS.clineRulesDir,
			path.join(PATHS.homeDir, ".vscode", "extensions"),
			path.join(PATHS.homeDir, ".cursor", "extensions"),
		],
		matchExtension: /cline|claude-dev/i,
	},
	{
		id: "cursor",
		label: "Cursor",
		flag: "installCursor",
		markers: () => [
			PATHS.cursorConfigDir,
			path.join(PATHS.homeDir, ".cursor"),
			...(process.platform === "darwin" ? ["/Applications/Cursor.app"] : []),
		],
	},
	{
		id: "junie",
		label: "JetBrains Junie",
		flag: "installJunie",
		markers: () => [
			PATHS.jetbrainsConfigDir,
			path.join(PATHS.homeDir, ".junie"),
		],
		matchExtension: /junie/i,
	},
	{
		id: "antigravity",
		label: "Antigravity",
		flag: "installAntigravity",
		markers: () => [
			PATHS.antigravityConfigDir,
			PATHS.geminiHome,
			...(process.platform === "darwin"
				? ["/Applications/Antigravity.app"]
				: []),
		],
	},
];

function testPresentIdes() {
	return new Set(
		String(process.env.OABTW_TEST_PRESENT_IDES || "")
			.split(",")
			.map((value) => value.trim().toLowerCase())
			.filter(Boolean),
	);
}

async function optionalIdeInstalled(definition) {
	const forced = testPresentIdes();
	if (forced.has(definition.id)) return true;
	for (const marker of definition.markers()) {
		if (!(await pathExists(marker))) continue;
		if (!definition.matchExtension) return true;
		try {
			const entries = await fs.readdir(marker);
			if (entries.some((entry) => definition.matchExtension.test(entry))) {
				return true;
			}
		} catch {
			return true;
		}
	}
	return false;
}

async function installOptionalIde(definition, artifacts, workspacePaths, args) {
	const source = path.join(artifacts.optionalIdeDir, definition.id);
	switch (definition.id) {
		case "cline":
			await syncManagedTree(
				path.join(source, ".clinerules"),
				workspacePaths.projectClineRulesDir,
			);
			await syncManagedTree(
				path.join(source, ".cline"),
				workspacePaths.projectClineDir,
			);
			break;
		case "cursor":
			await syncManagedTree(
				path.join(source, "rules"),
				workspacePaths.projectCursorRulesDir,
			);
			break;
		case "junie":
			await syncManagedTree(source, workspacePaths.projectJunieDir);
			if (!args.deepwikiMcp) {
				await fs.rm(path.join(workspacePaths.projectJunieDir, "mcp"), {
					recursive: true,
					force: true,
				});
			}
			break;
		case "antigravity":
			await mergeTaggedMarkdown({
				target: path.join(workspacePaths.workspaceRoot, "AGENTS.md"),
				template: path.join(source, "AGENTS.md"),
				start: "<!-- >>> openagentsbtw antigravity >>> -->",
				end: "<!-- <<< openagentsbtw antigravity <<< -->",
			});
			await mergeTaggedMarkdown({
				target: path.join(workspacePaths.workspaceRoot, "GEMINI.md"),
				template: path.join(source, "GEMINI.md"),
				start: "<!-- >>> openagentsbtw antigravity >>> -->",
				end: "<!-- <<< openagentsbtw antigravity <<< -->",
			});
			break;
		default:
			fail(`Unsupported optional IDE: ${definition.id}`);
	}
	logInfo(`${definition.label} support installed`);
}

async function installOptionalIdes(args, artifacts) {
	const workspacePaths = resolveWorkspacePaths();
	const targets = OPTIONAL_IDES.filter(
		(definition) => args.optionalIdes || args[definition.flag],
	);
	if (targets.length === 0) return;
	console.log("\n\x1b[0;32mOptional IDEs\x1b[0m");
	for (const definition of targets) {
		if (await optionalIdeInstalled(definition)) {
			await installOptionalIde(definition, artifacts, workspacePaths, args);
			continue;
		}
		logWarn(`${definition.label} not detected; skipping install`);
	}
}

async function installCodex(args, artifacts) {
	if (!args.installCodex) return;
	console.log("\n\x1b[0;32mCodex\x1b[0m");
	await ensureNode();
	const codexHome = PATHS.codexHome;
	const agentsHome = PATHS.agentsHome;
	const pluginTarget = path.join(codexHome, "plugins", "openagentsbtw");
	const hooksRoot = path.join(codexHome, "openagentsbtw", "hooks");
	const binRoot = path.join(codexHome, "openagentsbtw", "bin");
	const hooksTarget = path.join(codexHome, "hooks.json");
	const marketplaceTarget = path.join(
		agentsHome,
		"plugins",
		"marketplace.json",
	);
	const configTarget = path.join(codexHome, "config.toml");
	const agentsMdTarget = path.join(codexHome, "AGENTS.md");

	const pluginSource = path.join(artifacts.codexDir, "plugin", "openagentsbtw");
	const pluginInstall = await installCodexPluginPayload({
		source: pluginSource,
		pluginTarget,
		codexHome,
	});
	await fs.rm(path.join(codexHome, "agents"), { recursive: true, force: true });
	await fs.rm(path.join(hooksRoot, "scripts"), {
		recursive: true,
		force: true,
	});
	await fs.mkdir(path.join(codexHome, "agents"), { recursive: true });
	await fs.mkdir(path.join(hooksRoot, "scripts"), { recursive: true });
	await fs.mkdir(binRoot, { recursive: true });
	await fs.mkdir(path.dirname(marketplaceTarget), { recursive: true });

	await replaceManagedTree(
		path.join(artifacts.codexDir, "agents"),
		path.join(codexHome, "agents"),
	);
	await updateCodexAgents({
		agentsDir: path.join(codexHome, "agents"),
		tier: args.codexPlan,
	});
	await replaceManagedTree(
		path.join(artifacts.codexDir, "hooks", "scripts"),
		path.join(hooksRoot, "scripts"),
	);
	for (const wrapper of [
		"openagentsbtw-codex",
		"oabtw-codex",
		"openagentsbtw-codex-peer",
		"oabtw-codex-peer",
	]) {
		await fs.copyFile(
			path.join(artifacts.binDir, wrapper),
			path.join(binRoot, wrapper),
		);
		await fs.chmod(path.join(binRoot, wrapper), 0o755);
	}
	await installCodexWrapperShims();
	await updateCodexMarketplace({
		target: marketplaceTarget,
		pluginPath: pluginTarget,
	});
	await mergeCodexHooks({
		source: path.join(artifacts.codexDir, "hooks", "hooks.json"),
		target: hooksTarget,
	});
	await mergeTaggedMarkdown({
		target: agentsMdTarget,
		template: path.join(artifacts.codexDir, "templates", "AGENTS.md"),
		start: "<!-- >>> openagentsbtw codex >>> -->",
		end: "<!-- <<< openagentsbtw codex <<< -->",
	});
	const profileName = "openagentsbtw";
	const configExisting = await readText(configTarget, "");
	const existingProfile = /^[\s]*profile[\s]*=/m.test(configExisting);
	const willSetTopProfile =
		args.codexSetTopProfile === "true" ||
		(args.codexSetTopProfile === "auto" && !existingProfile);
	await mergeCodexConfig({
		target: configTarget,
		profileAction: args.codexSetTopProfile,
		profileName,
		planName: args.codexPlan,
		deepwiki: args.deepwikiMcp,
	});
	if (willSetTopProfile) {
		logInfo(`Codex default profile set to ${profileName}`);
	} else {
		logWarn(
			`Existing Codex default profile preserved; use --profile ${profileName} to activate this system.`,
		);
	}
	logInfo(`Codex profile merged into ${configTarget}`);
	logInfo(`Codex plugin source -> ${pluginInstall.pluginTarget}`);
	logInfo(`Codex plugin cache -> ${pluginInstall.cacheTarget}`);
}

async function validateInstall(args) {
	let errors = 0;
	const required = async (filepath, label = filepath) => {
		if (await pathExists(filepath)) {
			logInfo(`${label} installed`);
			return;
		}
		errors += 1;
		logWarn(`${label} missing: ${filepath}`);
	};
	const requiredText = async (filepath, pattern, label = filepath) => {
		const text = await readText(filepath, "");
		if (pattern.test(text)) {
			logInfo(`${label} configured`);
			return;
		}
		errors += 1;
		logWarn(`${label} not configured in ${filepath}`);
	};

	if (args.installClaude) {
		await required(
			path.join(PATHS.claudeHome, "settings.json"),
			"Claude settings",
		);
		await required(
			path.join(PATHS.claudeHome, "hooks", "pre-secrets.mjs"),
			"Claude pre-secrets hook",
		);
		if (!args.skipRtk) {
			await required(
				path.join(PATHS.claudeHome, "hooks", "rtk-rewrite.sh"),
				"Claude RTK hook",
			);
		}
		await required(
			path.join(PATHS.claudeHome, "output-styles", "cca.md"),
			"Claude output style",
		);
		await requiredText(
			path.join(PATHS.claudeHome, "settings.json"),
			/openagentsbtw@openagentsbtw|openagentsbtw/,
			"Claude openagentsbtw plugin",
		);
		if (commandExists("jq")) {
			try {
				await run(
					"jq",
					["empty", path.join(PATHS.claudeHome, "settings.json")],
					{
						stdio: "ignore",
					},
				);
				logInfo(
					`${path.join(PATHS.claudeHome, "settings.json")} is valid JSON`,
				);
			} catch {
				errors += 1;
			}
		}
	}

	if (args.installOpenCode) {
		const workspacePaths = resolveWorkspacePaths();
		const target =
			args.opencodeScope === "global"
				? PATHS.opencodeConfigDir
				: workspacePaths.projectOpenCodeDir;
		await required(
			path.join(target, "plugins", "openagentsbtw.ts"),
			"OpenCode plugin",
		);
		await required(
			path.join(target, "instructions", "openagentsbtw.md"),
			"OpenCode instructions",
		);
		await required(
			path.join(target, "skills", "caveman", "SKILL.md"),
			"OpenCode Caveman skill",
		);
		await required(
			path.join(target, "skills", "review", "SKILL.md"),
			"OpenCode review skill",
		);
		await requiredText(
			path.join(target, "plugins", "openagentsbtw.ts"),
			/rtk-rewrite|Caveman mode/,
			"OpenCode RTK/Caveman plugin logic",
		);
	}

	if (args.installCopilot) {
		const workspacePaths = resolveWorkspacePaths();
		const targets = [];
		if (args.copilotScope === "global" || args.copilotScope === "both") {
			targets.push(PATHS.copilotHome);
		}
		if (args.copilotScope === "project" || args.copilotScope === "both") {
			targets.push(workspacePaths.projectGithubDir);
		}
		for (const target of targets) {
			await required(
				path.join(target, "agents", "hephaestus.agent.md"),
				"Copilot hephaestus agent",
			);
			await required(
				path.join(target, "skills", "caveman", "SKILL.md"),
				"Copilot Caveman skill",
			);
			await required(
				path.join(target, "hooks", "openagentsbtw.json"),
				"Copilot hooks config",
			);
			await required(
				path.join(target, "hooks", "route-contracts.json"),
				"Copilot route contracts",
			);
		}
	}

	if (args.installCodex) {
		const codexPluginTarget = path.join(
			PATHS.codexHome,
			"plugins",
			"openagentsbtw",
		);
		await required(
			path.join(codexPluginTarget, ".codex-plugin", "plugin.json"),
			"Codex plugin source manifest",
		);
		await required(
			path.join(codexPluginTarget, "skills", "caveman", "SKILL.md"),
			"Codex source Caveman skill",
		);
		await required(
			path.join(codexPluginTarget, "skills", "review", "SKILL.md"),
			"Codex source review skill",
		);
		try {
			const cacheValidation = await validateCodexPluginPayload({
				pluginTarget: codexPluginTarget,
				codexHome: PATHS.codexHome,
			});
			if (cacheValidation.missing.length === 0) {
				logInfo(
					`Codex plugin cache installed at ${cacheValidation.cacheTarget}`,
				);
			} else {
				errors += cacheValidation.missing.length;
				for (const missing of cacheValidation.missing) {
					logWarn(`Codex plugin cache missing: ${missing}`);
				}
			}
		} catch (error) {
			errors += 1;
			logWarn(`Codex plugin payload invalid: ${error.message}`);
		}
		await required(
			path.join(PATHS.codexHome, "agents", "athena.toml"),
			"Codex athena agent",
		);
		await required(
			path.join(PATHS.codexHome, "hooks.json"),
			"Codex hooks config",
		);
		await required(
			path.join(PATHS.codexWrapperBinDir, "oabtw-codex"),
			"Codex fallback wrapper",
		);
		await required(
			path.join(
				PATHS.managedBinDir,
				process.platform === "win32" ? "oabtw-codex.cmd" : "oabtw-codex",
			),
			"Codex PATH shim",
		);
		if (args.codexSetTopProfile !== "false") {
			await requiredText(
				PATHS.codexConfig,
				/^profile\s*=\s*"openagentsbtw"/m,
				"Codex default profile",
			);
		}
		await requiredText(
			PATHS.codexConfig,
			/\[plugins\."openagentsbtw@openagentsbtw-local"\]\s*\nenabled\s*=\s*true/m,
			"Codex plugin enablement",
		);
		const marketplaceFile = path.join(
			PATHS.agentsHome,
			"plugins",
			"marketplace.json",
		);
		await requiredText(
			marketplaceFile,
			/"name"\s*:\s*"openagentsbtw"[\s\S]*"path"\s*:/,
			"Codex marketplace entry",
		);
		try {
			const marketplace = JSON.parse(await readText(marketplaceFile, "{}"));
			const entry = (
				Array.isArray(marketplace.plugins) ? marketplace.plugins : []
			).find((plugin) => plugin?.name === "openagentsbtw");
			const marketplacePath = entry?.source?.path || "";
			if (
				marketplacePath === codexPluginTarget &&
				(await pathExists(marketplacePath))
			) {
				logInfo("Codex marketplace path resolves");
			} else {
				errors += 1;
				logWarn(
					`Codex marketplace path invalid: ${marketplacePath || "missing"}`,
				);
			}
		} catch (error) {
			errors += 1;
			logWarn(`Codex marketplace invalid: ${error.message}`);
		}
	}

	for (const definition of OPTIONAL_IDES.filter(
		(entry) => args.optionalIdes || args[entry.flag],
	)) {
		if (!(await optionalIdeInstalled(definition))) continue;
		const workspacePaths = resolveWorkspacePaths();
		switch (definition.id) {
			case "cline":
				await required(
					path.join(workspacePaths.projectClineRulesDir, "openagentsbtw.md"),
					"Cline rules",
				);
				await required(
					path.join(
						workspacePaths.projectClineDir,
						"skills",
						"openagentsbtw",
						"SKILL.md",
					),
					"Cline skill",
				);
				break;
			case "cursor":
				await required(
					path.join(workspacePaths.projectCursorRulesDir, "openagentsbtw.mdc"),
					"Cursor rule",
				);
				break;
			case "junie":
				await required(
					path.join(workspacePaths.projectJunieDir, "AGENTS.md"),
					"Junie AGENTS.md",
				);
				break;
			case "antigravity":
				await requiredText(
					path.join(workspacePaths.workspaceRoot, "AGENTS.md"),
					/openagentsbtw Antigravity Instructions/,
					"Antigravity AGENTS.md",
				);
				break;
		}
	}

	if (
		!args.skipRtk &&
		(args.installClaude ||
			args.installOpenCode ||
			args.installCodex ||
			args.installCopilot) &&
		!isCi()
	) {
		if (commandExists("rtk")) {
			const workspacePaths = resolveWorkspacePaths();
			const rtkPaths = rtkPolicyPathMap();
			for (const target of selectedRtkPolicyTargets(args)) {
				await required(target, "managed RTK policy");
			}
			if (args.installClaude) {
				await requiredText(
					path.join(PATHS.claudeHome, "CLAUDE.md"),
					/@RTK\.md/,
					"Claude RTK instruction reference",
				);
			}
			if (args.installCodex) {
				await requiredText(
					path.join(PATHS.codexHome, "AGENTS.md"),
					/RTK\.md|openagentsbtw rtk/,
					"Codex RTK instruction reference",
				);
			}
			if (args.installCopilot) {
				const targets = [];
				if (["global", "both"].includes(args.copilotScope)) {
					targets.push(path.join(PATHS.copilotHome, "copilot-instructions.md"));
				}
				if (["project", "both"].includes(args.copilotScope)) {
					targets.push(
						path.join(
							workspacePaths.projectGithubDir,
							"copilot-instructions.md",
						),
					);
				}
				for (const target of targets) {
					await requiredText(
						target,
						/RTK\.md|openagentsbtw rtk/,
						"Copilot RTK instruction reference",
					);
				}
			}
			if (args.installOpenCode) {
				const target =
					args.opencodeScope === "global"
						? path.join(
								PATHS.opencodeConfigDir,
								"instructions",
								"openagentsbtw.md",
							)
						: path.join(
								workspacePaths.projectOpenCodeDir,
								"instructions",
								"openagentsbtw.md",
							);
				await requiredText(
					target,
					/RTK\.md|openagentsbtw rtk/,
					"OpenCode RTK instruction reference",
				);
				await required(rtkPaths.opencode, "OpenCode RTK policy");
			}
		} else {
			logWarn("RTK binary not found; managed RTK policy validation skipped");
		}
	}

	await requiredText(
		PATHS.configEnvFile,
		/OABTW_CAVEMAN_MODE=/,
		"managed Caveman config",
	);
	return errors;
}

function reportSummary(args) {
	console.log("\n\x1b[0;32mopenagentsbtw install complete\x1b[0m\n");
	if (args.installClaude) {
		console.log(
			`  Claude:   openagentsbtw@openagentsbtw (plan ${args.claudePlan})`,
		);
	}
	if (args.installOpenCode) {
		console.log(`  OpenCode: ${args.opencodeScope} install`);
	}
	if (args.installCopilot) {
		console.log(
			`  Copilot:  ${args.copilotScope} install (${args.copilotPlan})`,
		);
	}
	if (args.installCodex) {
		console.log(
			`  Codex:    ${path.join(PATHS.codexHome, "plugins", "openagentsbtw")} + ${path.join(PATHS.codexHome, "agents")} (${args.codexPlan})`,
		);
	}
	const optional = OPTIONAL_IDES.filter(
		(definition) => args.optionalIdes || args[definition.flag],
	).map((definition) => definition.label);
	if (optional.length > 0) {
		console.log(`  Optional: ${optional.join(", ")} (detected installs only)`);
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}
	const existingEnv = await loadConfigEnv();
	await ensureSelection(args);
	await promptOptionalSurfaces(args, existingEnv);
	validateArgs(args);
	await writeConfigEnv({
		CONTEXT7_API_KEY: args.context7ApiKey || existingEnv.CONTEXT7_API_KEY || "",
		OABTW_CLAUDE_PLAN: args.claudePlan,
		OABTW_CODEX_PLAN: args.codexPlan || "pro-5",
		OABTW_COPILOT_PLAN: args.copilotPlan,
		OABTW_CAVEMAN_MODE: args.cavemanMode || DEFAULT_CAVEMAN_MODE,
	});
	console.log("\x1b[0;32mopenagentsbtw installer\x1b[0m");
	const artifacts = await buildArtifacts();
	try {
		await installClaude(args, artifacts);
		await installOpenCode(args, artifacts);
		await installCopilot(args, artifacts);
		await installOptionalIdes(args, artifacts);
		await maybeInstallCtx7(args);
		await maybeInstallPlaywright(args);
		await maybeInstallRtk(args);
		await installCodex(args, artifacts);
		const errors = await validateInstall(args);
		reportSummary(args);
		if (errors > 0) {
			throw new Error(`${errors} validation error(s). Check output above.`);
		}
	} finally {
		await fs.rm(artifacts.buildDir, { recursive: true, force: true });
	}
}

await main().catch((error) => {
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
});
function resolveStoredClaudePlan(value = "") {
	return resolveClaudePlan(value) || "";
}
