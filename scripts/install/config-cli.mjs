import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	DEFAULT_CAVEMAN_MODE,
	resolveCavemanMode,
} from "../../source/caveman.mjs";
import {
	DEFAULT_CLAUDE_PLAN,
	DEFAULT_CODEX_PLAN,
	DEFAULT_COPILOT_PLAN,
	getClaudePlan,
	resolveClaudePlan,
	resolveCodexPlan,
	resolveCopilotPlan,
} from "../../source/subscriptions.mjs";
import {
	mergeCodexConfig,
	toggleCodexDeepwiki,
	updateCodexAgents,
} from "./managed-files.mjs";

import {
	removeRtkSurfaces,
	rtkPolicyPathMap,
	rtkReferenceTargets,
	writeRtkPolicyFiles,
	writeRtkReferences,
} from "./rtk-surfaces.mjs";

import {
	commandExists,
	ctx7RunnerCommand,
	ctx7RunnerLine,
	loadConfigEnv,
	logInfo,
	PATHS,
	pathExists,
	promptText,
	ROOT,
	resolveWorkspacePaths,
	run,
	writeConfigEnv,
	writeText,
} from "./shared.mjs";

const DEEPWIKI_URL = "https://mcp.deepwiki.com/mcp";

function renderCtx7Ps1() {
	const [runner, runnerArgs] = ctx7RunnerCommand();
	if (!runner) {
		return [
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

function usage() {
	console.log(`openagentsbtw config

Usage: ./config.sh [options]

  --ctx7                 Install/update the managed ctx7 wrapper
  --no-ctx7              Remove the managed ctx7 wrapper
  --ctx7-api-key [KEY]   Set or update CONTEXT7_API_KEY (prompt if omitted)
  --deepwiki             Enable managed DeepWiki config on installed surfaces
  --no-deepwiki          Disable managed DeepWiki config on installed surfaces
  --claude-plan PLAN     Set Claude plan: pro|max-5|max-20
  --codex-plan PLAN      Set Codex plan: go|plus|pro-5|pro-20
  --copilot-plan PLAN    Set Copilot plan: pro|pro-plus
  --caveman-mode MODE   Set Caveman mode: off|lite|full|ultra|wenyan-lite|wenyan|wenyan-ultra
  --no-caveman          Alias for --caveman-mode off
  --rtk                  Install RTK if needed and write the managed global RTK.md
  --no-rtk               Remove the managed global RTK.md
  --yes                  Accept default prompts without asking
  -h, --help             Show this help`);
}

async function installCtx7Wrapper() {
	if (process.platform === "win32") {
		await writeText(PATHS.ctx7Ps1Wrapper, renderCtx7Ps1(), true);
		await writeText(PATHS.ctx7CmdWrapper, renderCtx7Cmd());
		logInfo(`Installed managed ctx7 wrappers in ${PATHS.managedBinDir}`);
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
	logInfo(`Installed managed ctx7 wrapper at ${PATHS.ctx7Wrapper}`);
}

async function removeCtx7Wrapper() {
	await fs.rm(PATHS.ctx7Wrapper, { force: true });
	await fs.rm(PATHS.ctx7Ps1Wrapper, { force: true });
	await fs.rm(PATHS.ctx7CmdWrapper, { force: true });
	logInfo("Removed managed ctx7 wrapper");
}

async function ensureRtkBinary() {
	if (commandExists("rtk")) {
		logInfo("RTK already installed");
		return;
	}
	if (process.platform === "win32") {
		logInfo(
			"RTK not found on Windows; skipping binary bootstrap and leaving configure-only mode",
		);
		return;
	}
	if (commandExists("brew")) {
		await run("brew", ["install", "rtk-ai/tap/rtk"]);
		return;
	}
	await run("sh", [
		"-lc",
		"curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh",
	]);
}

async function installedRtkPolicyTargets() {
	const map = rtkPolicyPathMap();
	const targets = [map.canonical];
	for (const [tool, target] of Object.entries(map)) {
		if (tool === "canonical") continue;
		if (await pathExists(path.dirname(target))) {
			targets.push(target);
		}
	}
	return [...new Set(targets)];
}

async function installedRtkReferenceTargets() {
	const workspacePaths = resolveWorkspacePaths();
	const targets = [];
	if (await pathExists(PATHS.claudeHome)) {
		targets.push(...rtkReferenceTargets({ claude: true }));
	}
	if (await pathExists(PATHS.codexHome)) {
		targets.push(...rtkReferenceTargets({ codex: true }));
	}
	if (await pathExists(PATHS.copilotHome)) {
		targets.push(...rtkReferenceTargets({ copilotGlobal: true }));
	}
	if (await pathExists(workspacePaths.projectGithubDir)) {
		targets.push(
			...rtkReferenceTargets({ copilotProject: true, workspacePaths }),
		);
	}
	if (await pathExists(PATHS.opencodeConfigDir)) {
		targets.push(...rtkReferenceTargets({ opencodeGlobal: true }));
	}
	if (await pathExists(workspacePaths.projectOpenCodeDir)) {
		targets.push(
			...rtkReferenceTargets({ opencodeProject: true, workspacePaths }),
		);
	}
	return targets;
}

async function writeManagedRtkSurfaces() {
	const policyTargets = await installedRtkPolicyTargets();
	await writeRtkPolicyFiles(policyTargets);
	await writeRtkReferences(await installedRtkReferenceTargets());
	for (const target of policyTargets) {
		logInfo(`Installed managed RTK policy at ${target}`);
	}
}

async function removeManagedRtkSurfaces() {
	const map = rtkPolicyPathMap();
	const workspacePaths = resolveWorkspacePaths();
	await removeRtkSurfaces({
		policyTargets: Object.values(map),
		referenceTargets: rtkReferenceTargets({
			claude: true,
			codex: true,
			copilotGlobal: true,
			copilotProject: true,
			opencodeGlobal: true,
			opencodeProject: true,
			workspacePaths,
		}),
	});
	logInfo("Removed managed RTK policies and instruction references");
}

function parseJsonc(text) {
	const cleaned = text
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, (match, offset, fullText) => {
			const preceding = fullText.slice(0, offset);
			const quoteCount = (preceding.match(/"/g) || []).length;
			if (quoteCount % 2 === 1) {
				return match;
			}
			return "";
		});
	return JSON.parse(cleaned);
}

async function updateJsonFile(target, mutate, { create = false } = {}) {
	if (!create && !(await pathExists(target))) {
		return false;
	}
	const existing = await readJsonFile(target, create ? "{}" : "");
	const next = mutate(existing);
	await writeText(target, JSON.stringify(next, null, 2));
	return true;
}

async function readJsonFile(target, fallback = "{}") {
	try {
		return JSON.parse(await fs.readFile(target, "utf8"));
	} catch {
		return JSON.parse(fallback);
	}
}

async function updateJsoncFile(target, mutate) {
	if (!(await pathExists(target))) {
		return false;
	}
	const source = await fs.readFile(target, "utf8");
	const existing = parseJsonc(source);
	const next = mutate(existing);
	await writeText(target, JSON.stringify(next, null, 2));
	return true;
}

function resolveCopilotUserMcpPath() {
	return PATHS.vscodeUserMcp;
}

function enableDeepwikiServer(payload) {
	const next = payload && typeof payload === "object" ? { ...payload } : {};
	next.servers ??= {};
	next.servers.deepwiki = { type: "http", url: DEEPWIKI_URL };
	return next;
}

function disableDeepwikiServer(payload) {
	const next = payload && typeof payload === "object" ? { ...payload } : {};
	if (next.servers && typeof next.servers === "object") {
		next.servers = { ...next.servers };
		delete next.servers.deepwiki;
		if (Object.keys(next.servers).length === 0) {
			delete next.servers;
		}
	}
	return next;
}

function enableOpenCodeDeepwiki(payload) {
	const next = payload && typeof payload === "object" ? { ...payload } : {};
	const currentMcp =
		next.mcp && typeof next.mcp === "object" ? { ...next.mcp } : {};
	currentMcp.deepwiki = {
		type: "remote",
		url: DEEPWIKI_URL,
		enabled: true,
	};
	next.mcp = currentMcp;
	return next;
}

function disableOpenCodeDeepwiki(payload) {
	const next = payload && typeof payload === "object" ? { ...payload } : {};
	if (next.mcp && typeof next.mcp === "object") {
		next.mcp = { ...next.mcp };
		delete next.mcp.deepwiki;
		if (Object.keys(next.mcp).length === 0) {
			delete next.mcp;
		}
	}
	return next;
}

async function toggleClaudeDeepwiki(enabled) {
	const target = path.join(PATHS.claudeHome, "settings.json");
	const changed = await updateJsonFile(target, (payload) => {
		const next = payload && typeof payload === "object" ? { ...payload } : {};
		next.mcpServers =
			next.mcpServers && typeof next.mcpServers === "object"
				? { ...next.mcpServers }
				: {};
		if (enabled) {
			next.mcpServers.deepwiki = {
				type: "http",
				url: DEEPWIKI_URL,
				enabled: true,
			};
		} else {
			delete next.mcpServers.deepwiki;
			if (Object.keys(next.mcpServers).length === 0) {
				delete next.mcpServers;
			}
		}
		return next;
	});
	if (changed) {
		logInfo(`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${target}`);
	}
}

async function toggleOpenCodeDeepwiki(enabled) {
	for (const target of [
		`${process.cwd()}/opencode.jsonc`,
		`${process.cwd()}/opencode.json`,
		path.join(PATHS.opencodeConfigDir, "opencode.jsonc"),
		path.join(PATHS.opencodeConfigDir, "opencode.json"),
	]) {
		const changed = target.endsWith(".jsonc")
			? await updateJsoncFile(
					target,
					enabled ? enableOpenCodeDeepwiki : disableOpenCodeDeepwiki,
				)
			: await updateJsonFile(
					target,
					enabled ? enableOpenCodeDeepwiki : disableOpenCodeDeepwiki,
				);
		if (changed) {
			logInfo(`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${target}`);
		}
	}
}

async function toggleCopilotDeepwiki(enabled) {
	const projectInstalled =
		(await pathExists(`${process.cwd()}/.github/agents`)) ||
		(await pathExists(`${process.cwd()}/.github/hooks/openagentsbtw.json`));
	if (projectInstalled) {
		const target = `${process.cwd()}/.vscode/mcp.json`;
		await updateJsonFile(
			target,
			enabled ? enableDeepwikiServer : disableDeepwikiServer,
			{ create: enabled },
		);
		logInfo(`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${target}`);
	}

	const resolvedCopilotHome = PATHS.copilotHome;
	const userMcpPath = resolveCopilotUserMcpPath();
	if (
		userMcpPath &&
		((await pathExists(resolvedCopilotHome)) || (await pathExists(userMcpPath)))
	) {
		await updateJsonFile(
			userMcpPath,
			enabled ? enableDeepwikiServer : disableDeepwikiServer,
			{ create: enabled },
		);
		logInfo(`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${userMcpPath}`);
	}
}

async function toggleDeepwikiEverywhere(enabled) {
	await toggleCodexDeepwiki({ target: PATHS.codexConfig, enabled });
	logInfo(
		`${enabled ? "Enabled" : "Disabled"} DeepWiki in ${PATHS.codexConfig}`,
	);
	await toggleClaudeDeepwiki(enabled);
	await toggleOpenCodeDeepwiki(enabled);
	await toggleCopilotDeepwiki(enabled);
}

async function applyClaudePlan(planName) {
	const plan = getClaudePlan(planName);
	const target = path.join(PATHS.claudeHome, "settings.json");
	const changed = await updateJsonFile(target, (payload) => {
		const next = payload && typeof payload === "object" ? { ...payload } : {};
		next.env = next.env && typeof next.env === "object" ? { ...next.env } : {};
		next.env.ANTHROPIC_DEFAULT_OPUS_MODEL = plan.models.opusModel;
		next.env.ANTHROPIC_DEFAULT_SONNET_MODEL = plan.models.sonnetModel;
		next.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = plan.models.haikuModel;
		next.model = plan.models.ccaModel;
		return next;
	});
	if (changed) {
		logInfo(`Applied Claude plan ${plan.id} in ${target}`);
	}
}

async function applyCodexPlan(planName) {
	if (!(await pathExists(PATHS.codexConfig))) {
		logInfo(`Skipping Codex plan update (${PATHS.codexConfig} not found)`);
		return;
	}
	await mergeCodexConfig({
		target: PATHS.codexConfig,
		profileAction: "true",
		profileName: "openagentsbtw",
		planName,
		deepwiki: /(^|\n)\[mcp_servers\.deepwiki\]/.test(
			await fs.readFile(PATHS.codexConfig, "utf8").catch(() => ""),
		),
	});
	const agentsDir = path.join(PATHS.codexHome, "agents");
	if (await pathExists(agentsDir)) {
		await updateCodexAgents({ agentsDir, tier: planName });
	}
	logInfo(`Applied Codex plan ${planName} in ${PATHS.codexConfig}`);
}

async function applyOpenCodeCopilotPlan(planName) {
	if (!commandExists("bun")) {
		logInfo("Skipping OpenCode Copilot plan update (bun not installed)");
		return;
	}
	const workspaceRoot = process.cwd();
	const projectInstall = `${workspaceRoot}/.opencode`;
	const globalInstall = PATHS.opencodeConfigDir;
	const opencodeCli = path.join(ROOT, "opencode", "src", "cli.ts");
	const hasProjectInstall = await pathExists(projectInstall);
	const hasGlobalInstall = await pathExists(globalInstall);
	if (!hasProjectInstall && !hasGlobalInstall) {
		return;
	}
	const buildDir = await fs.mkdtemp(
		path.join(os.tmpdir(), "openagentsbtw-config-"),
	);
	try {
		await run(
			"node",
			[path.join(ROOT, "scripts", "build.mjs"), "--out", buildDir],
			{
				cwd: ROOT,
			},
		);
		const opencodeTemplatesDir = path.join(buildDir, "opencode", "templates");

		if (hasProjectInstall) {
			await run(
				"bun",
				[
					"run",
					opencodeCli,
					"--scope",
					"project",
					"--provider",
					"copilot",
					"--plugins",
					"inject-preamble,openagentsbtw-core,conventions,safety-guard",
				],
				{
					cwd: workspaceRoot,
					env: {
						...process.env,
						OABTW_COPILOT_PLAN: planName,
						OABTW_OPENCODE_TEMPLATES_DIR: opencodeTemplatesDir,
					},
				},
			);
			logInfo(`Applied Copilot plan ${planName} to project OpenCode install`);
		}

		if (hasGlobalInstall) {
			await run(
				"bun",
				[
					"run",
					opencodeCli,
					"--scope",
					"global",
					"--provider",
					"copilot",
					"--plugins",
					"inject-preamble,openagentsbtw-core,conventions,safety-guard",
				],
				{
					cwd: workspaceRoot,
					env: {
						...process.env,
						OABTW_COPILOT_PLAN: planName,
						OABTW_OPENCODE_TEMPLATES_DIR: opencodeTemplatesDir,
					},
				},
			);
			logInfo(`Applied Copilot plan ${planName} to global OpenCode install`);
		}
	} finally {
		await fs.rm(buildDir, { recursive: true, force: true });
	}
}

function parseArgs(argv) {
	return {
		ctx7: argv.includes("--ctx7"),
		noCtx7: argv.includes("--no-ctx7"),
		deepwiki: argv.includes("--deepwiki"),
		noDeepwiki: argv.includes("--no-deepwiki"),
		rtk: argv.includes("--rtk"),
		noRtk: argv.includes("--no-rtk"),
		yes: argv.includes("--yes"),
		help: argv.includes("-h") || argv.includes("--help"),
		ctx7ApiKeyIndex: argv.indexOf("--ctx7-api-key"),
		claudePlanIndex: argv.indexOf("--claude-plan"),
		codexPlanIndex: argv.indexOf("--codex-plan"),
		copilotPlanIndex: argv.indexOf("--copilot-plan"),
		cavemanModeIndex: argv.indexOf("--caveman-mode"),
		noCaveman: argv.includes("--no-caveman"),
		argv,
	};
}

function resolveStoredClaudePlan(value = "") {
	return resolveClaudePlan(value) || "";
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}

	const existingEnv = await loadConfigEnv();
	let context7ApiKey = existingEnv.CONTEXT7_API_KEY || "";
	let claudePlan =
		resolveStoredClaudePlan(existingEnv.OABTW_CLAUDE_PLAN || "") ||
		DEFAULT_CLAUDE_PLAN;
	let codexPlan =
		resolveCodexPlan(existingEnv.OABTW_CODEX_PLAN || "") || DEFAULT_CODEX_PLAN;
	let copilotPlan =
		resolveCopilotPlan(existingEnv.OABTW_COPILOT_PLAN || "") ||
		DEFAULT_COPILOT_PLAN;
	let cavemanMode =
		resolveCavemanMode(existingEnv.OABTW_CAVEMAN_MODE || "") ||
		DEFAULT_CAVEMAN_MODE;

	if (args.ctx7ApiKeyIndex !== -1) {
		const explicit = args.argv[args.ctx7ApiKeyIndex + 1];
		context7ApiKey =
			explicit && !explicit.startsWith("--")
				? explicit
				: await promptText("Context7 API key:", args.yes, "");
	}

	if (args.claudePlanIndex !== -1) {
		const rawValue = args.argv[args.claudePlanIndex + 1] ?? "";
		claudePlan = resolveClaudePlan(rawValue);
		if (!claudePlan) {
			throw new Error(
				`Unsupported Claude plan: ${rawValue} (expected pro, max-5, or max-20)`,
			);
		}
		await applyClaudePlan(claudePlan);
	}

	if (args.codexPlanIndex !== -1) {
		const rawValue = args.argv[args.codexPlanIndex + 1] ?? "";
		codexPlan = resolveCodexPlan(rawValue);
		if (!codexPlan) {
			throw new Error(
				`Unsupported Codex plan: ${rawValue} (expected go, plus, pro-5, or pro-20)`,
			);
		}
		await applyCodexPlan(codexPlan);
	}

	if (args.copilotPlanIndex !== -1) {
		const rawValue = args.argv[args.copilotPlanIndex + 1] ?? "";
		copilotPlan = resolveCopilotPlan(rawValue);
		if (!copilotPlan) {
			throw new Error(
				`Unsupported Copilot plan: ${rawValue} (expected pro or pro-plus)`,
			);
		}
		await applyOpenCodeCopilotPlan(copilotPlan);
		logInfo(`Stored Copilot plan ${copilotPlan} for future installs`);
	}
	if (args.cavemanModeIndex !== -1 || args.noCaveman) {
		const rawValue = args.noCaveman
			? "off"
			: (args.argv[args.cavemanModeIndex + 1] ?? "");
		cavemanMode = resolveCavemanMode(rawValue);
		if (!cavemanMode) {
			throw new Error(
				`Unsupported Caveman mode: ${rawValue} (expected off, lite, full, ultra, wenyan-lite, wenyan, or wenyan-ultra)`,
			);
		}
		logInfo(`Stored Caveman mode ${cavemanMode} for future sessions`);
	}

	await writeConfigEnv({
		CONTEXT7_API_KEY: context7ApiKey,
		OABTW_CLAUDE_PLAN: claudePlan,
		OABTW_CODEX_PLAN: codexPlan,
		OABTW_COPILOT_PLAN: copilotPlan,
		OABTW_CAVEMAN_MODE: cavemanMode,
	});
	logInfo(`Updated ${PATHS.configEnvFile}`);

	if (args.ctx7) {
		await installCtx7Wrapper();
	}
	if (args.noCtx7) {
		await removeCtx7Wrapper();
	}
	if (args.deepwiki) {
		await toggleDeepwikiEverywhere(true);
	}
	if (args.noDeepwiki) {
		await toggleDeepwikiEverywhere(false);
	}
	if (args.rtk) {
		await ensureRtkBinary();
		await writeManagedRtkSurfaces();
	}
	if (args.noRtk) {
		await removeManagedRtkSurfaces();
	}

	if (
		!args.ctx7 &&
		!args.noCtx7 &&
		!args.deepwiki &&
		!args.noDeepwiki &&
		!args.rtk &&
		!args.noRtk &&
		args.ctx7ApiKeyIndex === -1 &&
		args.claudePlanIndex === -1 &&
		args.codexPlanIndex === -1 &&
		args.copilotPlanIndex === -1 &&
		args.cavemanModeIndex === -1 &&
		!args.noCaveman
	) {
		usage();
		return;
	}
}

await main().catch((error) => {
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
});
