import { promises as fs } from "node:fs";
import path from "node:path";
import { removeManagedBlock } from "./managed-files.mjs";
import {
	removeRtkSurfaces,
	rtkPolicyPathMap,
	rtkReferenceTargets,
} from "./rtk-surfaces.mjs";
import {
	commandExists,
	logInfo,
	logWarn,
	PATHS,
	pathExists,
	ROOT,
	readText,
	removeCodexPluginCaches,
	resolveWorkspacePaths,
	run,
	writeText,
} from "./shared.mjs";

function usage() {
	console.log(`openagentsbtw uninstaller

Usage: ./uninstall.sh [system toggles] [options]

System toggles (allow multiple):
  --claude
  --opencode
  --codex
  --copilot
  --all

Options:
  --opencode-scope project|global
  --copilot-scope global|project|both
  -h, --help`);
}

function parseArgs(argv) {
	const args = {
		removeClaude: false,
		removeOpenCode: false,
		removeCodex: false,
		removeCopilot: false,
		opencodeScope: "global",
		copilotScope: "global",
		help: false,
	};

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		switch (token) {
			case "--claude":
				args.removeClaude = true;
				break;
			case "--opencode":
				args.removeOpenCode = true;
				break;
			case "--codex":
				args.removeCodex = true;
				break;
			case "--copilot":
				args.removeCopilot = true;
				break;
			case "--all":
				args.removeClaude = true;
				args.removeOpenCode = true;
				args.removeCodex = true;
				args.removeCopilot = true;
				break;
			case "--opencode-scope":
				args.opencodeScope = argv[++index] ?? "";
				break;
			case "--copilot-scope":
				args.copilotScope = argv[++index] ?? "";
				break;
			case "-h":
			case "--help":
				args.help = true;
				break;
			default:
				throw new Error(`Unknown argument: ${token}`);
		}
	}

	if (!["global", "project"].includes(args.opencodeScope)) {
		throw new Error(
			`Unsupported OpenCode scope: ${args.opencodeScope} (expected global or project)`,
		);
	}
	if (!["global", "project", "both"].includes(args.copilotScope)) {
		throw new Error(
			`Unsupported Copilot scope: ${args.copilotScope} (expected global, project, or both)`,
		);
	}

	if (
		!args.removeClaude &&
		!args.removeOpenCode &&
		!args.removeCodex &&
		!args.removeCopilot
	) {
		args.removeClaude = true;
		args.removeOpenCode = true;
		args.removeCodex = true;
		args.removeCopilot = true;
	}

	return args;
}

async function readJson(target, fallback = {}) {
	try {
		return JSON.parse(await fs.readFile(target, "utf8"));
	} catch {
		return fallback;
	}
}

async function writeJson(target, payload) {
	await writeText(target, JSON.stringify(payload, null, 2));
}

async function removeClaude() {
	console.log("\n\x1b[0;32mRemoving Claude Code support\x1b[0m");
	const rtkPaths = rtkPolicyPathMap();
	await removeRtkSurfaces({
		policyTargets: [rtkPaths.claude],
		referenceTargets: rtkReferenceTargets({ claude: true }),
	});
	if (commandExists("claude")) {
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
	}

	await fs.rm(path.join(PATHS.claudeHome, "hooks", "pre-secrets.mjs"), {
		force: true,
	});
	await fs.rm(path.join(PATHS.claudeHome, "hooks", "rtk-rewrite.sh"), {
		force: true,
	});
	await fs.rm(path.join(PATHS.claudeHome, "output-styles", "cca.md"), {
		force: true,
	});
	await fs.rm(path.join(PATHS.claudeHome, "statusline-command.sh"), {
		force: true,
	});
	await fs.rm(
		path.join(PATHS.claudeHome, "plugins", "marketplaces", "openagentsbtw"),
		{
			recursive: true,
			force: true,
		},
	);

	const settingsFile = path.join(PATHS.claudeHome, "settings.json");
	if (await pathExists(settingsFile)) {
		const payload = await readJson(settingsFile, {});
		if (payload.enabledPlugins && typeof payload.enabledPlugins === "object") {
			delete payload.enabledPlugins["openagentsbtw@openagentsbtw"];
			if (Object.keys(payload.enabledPlugins).length === 0) {
				delete payload.enabledPlugins;
			}
		}
		if (
			payload.extraKnownMarketplaces &&
			typeof payload.extraKnownMarketplaces === "object"
		) {
			delete payload.extraKnownMarketplaces.openagentsbtw;
			if (Object.keys(payload.extraKnownMarketplaces).length === 0) {
				delete payload.extraKnownMarketplaces;
			}
		}
		await writeJson(settingsFile, payload);
		logInfo(`Cleaned Claude marketplace settings in ${settingsFile}`);
	}

	logInfo(`Removed Claude plugin files from ${PATHS.claudeHome}`);
}

async function removeOpenCode(scope) {
	console.log("\n\x1b[0;32mRemoving OpenCode support\x1b[0m");
	const workspacePaths = resolveWorkspacePaths();
	const rtkPaths = rtkPolicyPathMap();
	await removeRtkSurfaces({
		policyTargets: [rtkPaths.opencode],
		referenceTargets: rtkReferenceTargets({
			opencodeGlobal: scope === "global",
			opencodeProject: scope === "project",
			workspacePaths,
		}),
	});
	const target =
		scope === "global"
			? PATHS.opencodeConfigDir
			: workspacePaths.projectOpenCodeDir;

	for (const agent of [
		"odysseus",
		"athena",
		"hephaestus",
		"nemesis",
		"atalanta",
		"calliope",
		"hermes",
		"argus",
		"orion",
		"prometheus",
	]) {
		await fs.rm(path.join(target, "agents", `${agent}.md`), { force: true });
	}

	for (const command of [
		"openagents-review",
		"openagents-test",
		"openagents-implement",
		"openagents-document",
		"openagents-explore",
		"openagents-trace",
		"openagents-debug",
		"openagents-plan-feature",
		"openagents-plan-refactor",
		"openagents-audit",
		"openagents-orchestrate",
	]) {
		await fs.rm(path.join(target, "commands", `${command}.md`), {
			force: true,
		});
	}

	for (const ctx of [
		"overview",
		"tech-stack",
		"conventions",
		"structure",
		"agent-notes",
	]) {
		await fs.rm(path.join(target, "context", `${ctx}.md`), { force: true });
	}

	await fs.rm(path.join(target, "plugins", "openagentsbtw.ts"), {
		force: true,
	});

	const skillsRoot = path.join(ROOT, "opencode", "templates", "skills");
	if (await pathExists(skillsRoot)) {
		for (const entry of await fs.readdir(skillsRoot, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;
			await fs.rm(path.join(target, "skills", entry.name), {
				recursive: true,
				force: true,
			});
		}
	}

	logInfo(`Removed OpenCode files from ${target}`);
	logWarn(
		"OpenCode config keys in opencode.json/jsonc were not edited automatically",
	);
}

async function removeCopilot(scope) {
	console.log("\n\x1b[0;32mRemoving GitHub Copilot support\x1b[0m");
	const workspacePaths = resolveWorkspacePaths();
	const rtkPaths = rtkPolicyPathMap();
	await removeRtkSurfaces({
		policyTargets: [rtkPaths.copilot],
		referenceTargets: rtkReferenceTargets({
			copilotGlobal: scope === "global" || scope === "both",
			copilotProject: scope === "project" || scope === "both",
			workspacePaths,
		}),
	});
	const repoTemplateRoot = path.join(ROOT, "copilot", "templates", ".github");
	const userTemplateRoot = path.join(ROOT, "copilot", "templates", ".copilot");
	const skillsRoot = path.join(repoTemplateRoot, "skills");
	const skillDirs = (await pathExists(skillsRoot))
		? (await fs.readdir(skillsRoot, { withFileTypes: true }))
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name)
		: [
				"decide",
				"deslop",
				"document",
				"design-polish",
				"errors",
				"debug",
				"explore",
				"handoff",
				"openagentsbtw",
				"perf",
				"review",
				"security",
				"git-workflow",
				"style",
				"test",
				"trace",
			];

	if (scope === "global" || scope === "both") {
		for (const agent of [
			"athena",
			"hephaestus",
			"nemesis",
			"atalanta",
			"calliope",
			"hermes",
			"odysseus",
		]) {
			await fs.rm(path.join(PATHS.copilotHome, "agents", `${agent}.md`), {
				force: true,
			});
			await fs.rm(path.join(PATHS.copilotHome, "agents", `${agent}.agent.md`), {
				force: true,
			});
		}
		for (const skill of skillDirs) {
			await fs.rm(path.join(PATHS.copilotHome, "skills", skill), {
				recursive: true,
				force: true,
			});
		}
		await fs.rm(path.join(PATHS.copilotHome, "hooks", "openagentsbtw.json"), {
			force: true,
		});
		await fs.rm(path.join(PATHS.copilotHome, "hooks", "route-contracts.json"), {
			force: true,
		});
		await fs.rm(
			path.join(PATHS.copilotHome, "hooks", "scripts", "openagentsbtw"),
			{
				recursive: true,
				force: true,
			},
		);
		const userInstructionsRoot = path.join(userTemplateRoot, "instructions");
		if (await pathExists(userInstructionsRoot)) {
			for (const entry of await fs.readdir(userInstructionsRoot, {
				withFileTypes: true,
			})) {
				if (!entry.isFile()) continue;
				await fs.rm(path.join(PATHS.copilotHome, "instructions", entry.name), {
					force: true,
				});
			}
		}
		const globalInstructionsTarget = path.join(
			PATHS.copilotHome,
			"copilot-instructions.md",
		);
		if (await pathExists(globalInstructionsTarget)) {
			const next = removeManagedBlock(
				await readText(globalInstructionsTarget, ""),
				"<!-- >>> openagentsbtw copilot >>> -->",
				"<!-- <<< openagentsbtw copilot <<< -->",
			);
			await writeText(globalInstructionsTarget, next);
		}
		logInfo(
			`Removed Copilot global agents, skills, hooks, and instructions from ${PATHS.copilotHome}`,
		);
	}

	if (scope === "project" || scope === "both") {
		const workspacePaths = resolveWorkspacePaths();
		const ghRoot = workspacePaths.projectGithubDir;
		for (const agent of [
			"athena",
			"hephaestus",
			"nemesis",
			"atalanta",
			"calliope",
			"hermes",
			"odysseus",
		]) {
			await fs.rm(path.join(ghRoot, "agents", `${agent}.md`), { force: true });
			await fs.rm(path.join(ghRoot, "agents", `${agent}.agent.md`), {
				force: true,
			});
		}
		for (const skill of skillDirs) {
			await fs.rm(path.join(ghRoot, "skills", skill), {
				recursive: true,
				force: true,
			});
		}
		const promptsRoot = path.join(repoTemplateRoot, "prompts");
		if (await pathExists(promptsRoot)) {
			for (const entry of await fs.readdir(promptsRoot, {
				withFileTypes: true,
			})) {
				if (!entry.isFile()) continue;
				await fs.rm(path.join(ghRoot, "prompts", entry.name), { force: true });
			}
		}
		await fs.rm(path.join(ghRoot, "hooks", "openagentsbtw.json"), {
			force: true,
		});
		await fs.rm(path.join(ghRoot, "hooks", "openagesbtw.json"), {
			force: true,
		});
		await fs.rm(path.join(ghRoot, "hooks", "route-contracts.json"), {
			force: true,
		});
		await fs.rm(path.join(ghRoot, "hooks", "scripts", "openagentsbtw"), {
			recursive: true,
			force: true,
		});
		const repoInstructionsRoot = path.join(repoTemplateRoot, "instructions");
		if (await pathExists(repoInstructionsRoot)) {
			for (const entry of await fs.readdir(repoInstructionsRoot, {
				withFileTypes: true,
			})) {
				if (!entry.isFile()) continue;
				await fs.rm(path.join(ghRoot, "instructions", entry.name), {
					force: true,
				});
			}
		}

		const instructionsTarget = path.join(ghRoot, "copilot-instructions.md");
		if (await pathExists(instructionsTarget)) {
			const next = removeManagedBlock(
				await readText(instructionsTarget, ""),
				"<!-- >>> openagentsbtw copilot >>> -->",
				"<!-- <<< openagentsbtw copilot <<< -->",
			);
			await writeText(instructionsTarget, next);
		}
		logInfo("Removed Copilot repo assets from .github/");
	}
}

async function removeCodex() {
	console.log("\n\x1b[0;32mRemoving Codex support\x1b[0m");
	const rtkPaths = rtkPolicyPathMap();
	await removeRtkSurfaces({
		policyTargets: [rtkPaths.codex],
		referenceTargets: rtkReferenceTargets({ codex: true }),
	});
	await fs.rm(path.join(PATHS.codexHome, "plugins", "openagentsbtw"), {
		recursive: true,
		force: true,
	});
	await removeCodexPluginCaches(PATHS.codexHome);
	await fs.rm(path.join(PATHS.codexHome, "openagentsbtw"), {
		recursive: true,
		force: true,
	});
	for (const wrapper of [
		"openagentsbtw-codex",
		"oabtw-codex",
		"openagentsbtw-codex-peer",
		"oabtw-codex-peer",
	]) {
		await fs.rm(path.join(PATHS.managedBinDir, wrapper), { force: true });
		await fs.rm(path.join(PATHS.managedBinDir, `${wrapper}.ps1`), {
			force: true,
		});
		await fs.rm(path.join(PATHS.managedBinDir, `${wrapper}.cmd`), {
			force: true,
		});
	}

	for (const agent of [
		"athena",
		"hephaestus",
		"nemesis",
		"atalanta",
		"calliope",
		"hermes",
		"odysseus",
	]) {
		const agentFile = path.join(PATHS.codexHome, "agents", `${agent}.toml`);
		if (!(await pathExists(agentFile))) continue;
		const text = await readText(agentFile, "");
		if (text.includes("openagentsbtw managed file")) {
			await fs.rm(agentFile, { force: true });
		}
	}

	const hooksTarget = path.join(PATHS.codexHome, "hooks.json");
	if (await pathExists(hooksTarget)) {
		const payload = await readJson(hooksTarget, {});
		payload.hooks ??= {};
		for (const [event, groups] of Object.entries(payload.hooks)) {
			const filtered = Array.isArray(groups)
				? groups.filter((group) => {
						const hooks = Array.isArray(group?.hooks) ? group.hooks : [];
						return !hooks.some(
							(hook) =>
								hook &&
								typeof hook === "object" &&
								typeof hook.command === "string" &&
								hook.command.includes(".codex/openagentsbtw/hooks/scripts/"),
						);
					})
				: [];
			if (filtered.length > 0) {
				payload.hooks[event] = filtered;
			} else {
				delete payload.hooks[event];
			}
		}
		await writeJson(hooksTarget, payload);
	}

	const marketplaceTarget = path.join(
		PATHS.agentsHome,
		"plugins",
		"marketplace.json",
	);
	if (await pathExists(marketplaceTarget)) {
		const payload = await readJson(marketplaceTarget, {});
		const plugins = Array.isArray(payload.plugins) ? payload.plugins : [];
		payload.plugins = plugins.filter(
			(entry) =>
				!(entry && typeof entry === "object" && entry.name === "openagentsbtw"),
		);
		await writeJson(marketplaceTarget, payload);
	}

	for (const target of [
		path.join(PATHS.codexHome, "AGENTS.md"),
		path.join(PATHS.codexHome, "config.toml"),
	]) {
		if (!(await pathExists(target))) continue;
		const next = target.endsWith("AGENTS.md")
			? removeManagedBlock(
					await readText(target, ""),
					"<!-- >>> openagentsbtw codex >>> -->",
					"<!-- <<< openagentsbtw codex <<< -->",
				)
			: removeManagedBlock(
					await readText(target, ""),
					"# >>> openagentsbtw codex >>>",
					"# <<< openagentsbtw codex <<<",
				);
		await writeText(target, next);
	}

	logInfo("Removed Codex plugin, agents, hooks, and managed profile blocks");
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		usage();
		return;
	}

	if (args.removeClaude) await removeClaude();
	if (args.removeOpenCode) await removeOpenCode(args.opencodeScope);
	if (args.removeCopilot) await removeCopilot(args.copilotScope);
	if (args.removeCodex) await removeCodex();

	console.log("\n\x1b[0;32mopenagentsbtw uninstall complete\x1b[0m");
}

await main().catch((error) => {
	console.error(`Error: ${error.message}`);
	process.exitCode = 1;
});
