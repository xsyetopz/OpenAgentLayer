import { chmod, cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { glob } from "glob";
import { AGENT_META, ALL_AGENT_ROLES, SUBAGENT_ROLES } from "./agents.ts";
import { COMMAND_DEFINITIONS } from "./commands.ts";
import { buildContextFiles } from "./context.ts";
import { detectProviders } from "./detect.ts";
import {
	type AgentRole,
	type ModelAssignment,
	resolveModel,
} from "./models.ts";
import {
	buildMcpConfig,
	mergeInstructions,
	mergeMcpConfig,
	parseJsonc,
	pruneLegacyOpenAgentsMcpServers,
	resolveConfigPath,
	stringifyJsonc,
} from "./opencode-config.ts";
import {
	applyContentPlugins,
	type ContentPlugin,
	resolvePlugins,
} from "./plugins.ts";
import { renderAgentFile, renderCommandFile } from "./render.ts";
import {
	loadAgentSystemPrompt,
	loadTemplateFile,
	resolveTemplatesDir,
} from "./template.ts";
import type { AgentDefinition, InstallOptions, InstallScope } from "./types.ts";
import {
	validateAgentNames,
	validateCommandNames,
	validateNamespaceConflicts,
	validatePermissionKeys,
	validatePermissionValues,
} from "./validate.ts";

function resolveTargetDir(scope: InstallScope): string {
	if (scope === "global") {
		const home =
			process.platform === "win32"
				? (process.env["USERPROFILE"] ?? "")
				: (process.env["HOME"] ?? "");
		if (!home) {
			throw new Error("Cannot determine home directory for global install");
		}
		const configHome =
			process.platform === "win32"
				? (process.env["APPDATA"] ?? `${home}/AppData/Roaming`)
				: (process.env["XDG_CONFIG_HOME"] ?? `${home}/.config`);
		return `${configHome}/opencode`;
	}
	return `${process.cwd()}`;
}

async function ensureDir(path: string, dryRun: boolean): Promise<void> {
	if (dryRun) {
		return;
	}
	await mkdir(path, { recursive: true });
}

async function writeFile(
	path: string,
	content: string,
	dryRun: boolean,
): Promise<void> {
	if (dryRun) {
		console.log(`[dry-run] write ${path}`);
		return;
	}
	await Bun.write(path, content);
}

async function removeDir(path: string, dryRun: boolean): Promise<void> {
	if (dryRun) {
		console.log(`[dry-run] remove ${path}`);
		return;
	}
	await rm(path, { recursive: true, force: true });
}

async function copyDir(
	source: string,
	destination: string,
	dryRun: boolean,
): Promise<void> {
	if (dryRun) {
		console.log(`[dry-run] copy ${source} -> ${destination}`);
		return;
	}
	await cp(source, destination, { recursive: true });
}

function runValidation(
	agentNames: string[],
	commandNames: string[],
	permissionSets: Array<{ name: string; permission: Record<string, unknown> }>,
): void {
	const errors = [
		...validateAgentNames(agentNames),
		...validateCommandNames(commandNames),
		...validateNamespaceConflicts(agentNames, commandNames),
		...permissionSets.flatMap(({ name, permission }) => [
			...validatePermissionKeys(permission, name),
			...validatePermissionValues(permission, name),
		]),
	];
	if (errors.length > 0) {
		const messages = errors.map((e) => `  [${e.type}] ${e.message}`).join("\n");
		throw new Error(`Validation failed:\n${messages}`);
	}
}

const PLUGIN_FILENAMES = ["openagentsbtw.ts"] as const;
const HOOK_FILENAMES = ["pre-commit", "pre-push"] as const;

export interface AgentAssignment {
	role: string;
	model: string;
	tier: string;
}

export interface InstallCounts {
	agents: number;
	commands: number;
	skills: number;
	hooks: number;
	plugins: number;
	context: number;
	instructions: number;
}

export interface InstallReport {
	agentAssignments: AgentAssignment[];
	counts: InstallCounts;
}

interface InstallDirs {
	opencodeDir: string;
	agentsDir: string;
	commandsDir: string;
	skillsDir: string;
	contextDir: string;
	pluginsDir: string;
	instructionsDir: string;
}

function resolveDirs(scope: InstallOptions["scope"]): InstallDirs {
	const targetDir = resolveTargetDir(scope);
	const opencodeDir = scope === "global" ? targetDir : `${targetDir}/.opencode`;
	return {
		opencodeDir,
		agentsDir: `${opencodeDir}/agents`,
		commandsDir: `${opencodeDir}/commands`,
		skillsDir: `${opencodeDir}/skills`,
		contextDir: `${opencodeDir}/context`,
		pluginsDir: `${opencodeDir}/plugins`,
		instructionsDir: `${opencodeDir}/instructions`,
	};
}

async function writeAgents(
	assignments: Array<{ role: AgentRole; assignment: ModelAssignment }>,
	agentsDir: string,
	plugins: ContentPlugin[],
	dryRun: boolean,
): Promise<number> {
	await Promise.all(
		assignments.map(async ({ role, assignment }) => {
			const meta = AGENT_META[role];
			const systemPrompt = await loadAgentSystemPrompt(role);

			let agentDef: AgentDefinition = {
				name: meta.greekName,
				description: meta.description,
				mode: meta.mode,
				model: assignment.model,
				routeKind: meta.routeKind,
				color: meta.color,
				permission: meta.permission,
				systemPrompt,
				...(assignment.temperature !== undefined && {
					temperature: assignment.temperature,
				}),
				...(assignment.top_p !== undefined && { top_p: assignment.top_p }),
			};

			agentDef = applyContentPlugins(agentDef, plugins);

			const content = renderAgentFile(agentDef);
			await writeFile(`${agentsDir}/${meta.greekName}.md`, content, dryRun);
		}),
	);
	return assignments.length;
}

async function writeCommands(
	commandsDir: string,
	dryRun: boolean,
): Promise<number> {
	await Promise.all(
		COMMAND_DEFINITIONS.map(async (command) => {
			const content = renderCommandFile(command);
			await writeFile(`${commandsDir}/${command.name}.md`, content, dryRun);
		}),
	);
	return COMMAND_DEFINITIONS.length;
}

async function writeSkills(
	skillsDir: string,
	dryRun: boolean,
): Promise<number> {
	const skillPaths = await glob(
		join(resolveTemplatesDir(), "skills", "*", "SKILL.md"),
	);
	await Promise.all(
		skillPaths.map(async (skillPath) => {
			const skillDir = skillPath.slice(0, skillPath.lastIndexOf("/"));
			const skillName = skillDir.slice(skillDir.lastIndexOf("/") + 1);
			await copyDir(skillDir, `${skillsDir}/${skillName}`, dryRun);
		}),
	);
	return skillPaths.length;
}

async function writeContextFiles(
	contextDir: string,
	dryRun: boolean,
): Promise<number> {
	let count = 0;
	for (const ctxFile of buildContextFiles()) {
		const destPath = join(contextDir, ctxFile.filename);
		const exists = dryRun ? false : await Bun.file(destPath).exists();
		if (!exists) {
			await writeFile(destPath, ctxFile.content, dryRun);
			count++;
		}
	}
	return count;
}

async function writeInstructionFiles(
	instructionsDir: string,
	dryRun: boolean,
): Promise<number> {
	await ensureDir(instructionsDir, dryRun);
	await writeTemplateFiles(
		["openagentsbtw.md"],
		"instructions",
		instructionsDir,
		dryRun,
	);
	return 1;
}

async function writeHooks(
	scope: InstallScope,
	dryRun: boolean,
): Promise<number> {
	if (scope !== "project") {
		return 0;
	}

	const proc = Bun.spawnSync(["git", "rev-parse", "--git-dir"], {
		cwd: process.cwd(),
		stderr: "ignore",
	});
	if (proc.exitCode !== 0) {
		return 0;
	}

	const gitDir = proc.stdout.toString().trim();
	const hooksDir = gitDir.startsWith("/")
		? join(gitDir, "hooks")
		: join(process.cwd(), gitDir, "hooks");

	await ensureDir(hooksDir, dryRun);

	await Promise.all(
		HOOK_FILENAMES.map(async (filename) => {
			const content = await loadTemplateFile(join("hooks", filename));
			const destPath = join(hooksDir, filename);
			await writeFile(destPath, content, dryRun);
			if (!dryRun) {
				await chmod(destPath, 0o755);
			}
		}),
	);

	return HOOK_FILENAMES.length;
}

async function writeTemplateFiles(
	filenames: readonly string[],
	subdir: string,
	destDir: string,
	dryRun: boolean,
): Promise<number> {
	await Promise.all(
		filenames.map(async (filename) => {
			const content = await loadTemplateFile(join(subdir, filename));
			await writeFile(join(destDir, filename), content, dryRun);
		}),
	);
	return filenames.length;
}

async function writeOpenCodeJsonc(
	scope: InstallScope,
	instructionPaths: string[],
	dryRun: boolean,
): Promise<number> {
	const deepwikiEnabled = process.env["OABTW_OPENCODE_DEEPWIKI"] === "true";
	const configPath = await resolveConfigPath(scope);
	const exists = dryRun ? false : await Bun.file(configPath).exists();

	let config: Record<string, unknown>;

	if (exists) {
		const text = await Bun.file(configPath).text();
		try {
			config = parseJsonc(text);
			config = mergeMcpConfig(config, buildMcpConfig({ deepwikiEnabled }));
			config = pruneLegacyOpenAgentsMcpServers(config);
			config = mergeInstructions(config, instructionPaths);
		} catch {
			config = {
				$schema: "https://opencode.ai/config.json",
				mcp: buildMcpConfig({ deepwikiEnabled }),
				instructions: instructionPaths,
			};
		}
	} else {
		config = {
			$schema: "https://opencode.ai/config.json",
			mcp: buildMcpConfig({ deepwikiEnabled }),
			instructions: instructionPaths,
		};
	}

	await writeFile(configPath, stringifyJsonc(config), dryRun);
	return 1;
}

export async function install(options: InstallOptions): Promise<InstallReport> {
	const { scope, clean, dryRun, noOverrides } = options;
	const providers = options.providers ?? (await detectProviders());
	const modelOverrides = options.modelOverrides ?? {};

	const dirs = resolveDirs(scope);
	const {
		opencodeDir,
		agentsDir,
		commandsDir,
		skillsDir,
		contextDir,
		pluginsDir,
		instructionsDir,
	} = dirs;

	const agentRoles: AgentRole[] = noOverrides
		? SUBAGENT_ROLES
		: ALL_AGENT_ROLES;
	const assignments = agentRoles.map((role) => ({
		role,
		assignment: resolveModel(
			role,
			providers,
			modelOverrides,
			options.defaultModel,
			options.copilotPlan,
		),
	}));

	runValidation(
		agentRoles.map((r) => r as string),
		COMMAND_DEFINITIONS.map((c) => c.name),
		agentRoles.map((role) => ({
			name: `agent:${role}`,
			permission: AGENT_META[role].permission as Record<string, unknown>,
		})),
	);

	if (clean) {
		await removeDir(opencodeDir, dryRun);
	}

	await Promise.all([
		ensureDir(agentsDir, dryRun),
		ensureDir(commandsDir, dryRun),
		ensureDir(skillsDir, dryRun),
		ensureDir(contextDir, dryRun),
		ensureDir(pluginsDir, dryRun),
		ensureDir(instructionsDir, dryRun),
	]);

	const plugins = resolvePlugins(options.plugins ?? []);

	const [agents, commands, skills, context, pluginFiles, hooks, instructions] =
		await Promise.all([
			writeAgents(assignments, agentsDir, plugins, dryRun),
			writeCommands(commandsDir, dryRun),
			writeSkills(skillsDir, dryRun),
			writeContextFiles(contextDir, dryRun),
			writeTemplateFiles(PLUGIN_FILENAMES, "plugins", pluginsDir, dryRun),
			writeHooks(scope, dryRun),
			writeInstructionFiles(instructionsDir, dryRun),
		]);

	const instructionPaths =
		scope === "global"
			? ["instructions/openagentsbtw.md"]
			: [".opencode/instructions/openagentsbtw.md"];

	await writeOpenCodeJsonc(scope, instructionPaths, dryRun);

	return {
		agentAssignments: assignments.map(({ role, assignment }) => ({
			role,
			model: assignment.model,
			tier: assignment.tier,
		})),
		counts: {
			agents,
			commands,
			skills,
			hooks,
			plugins: pluginFiles,
			context,
			instructions,
		},
	};
}
