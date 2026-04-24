import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadAgents } from "../../source/catalog/loaders.mjs";
import { getCodexPlan } from "../../source/subscriptions.mjs";
import { writeCodexMarketplace } from "./codex-plugin-install.mjs";
import { pathExists, readText, writeText } from "./shared.mjs";

export function mergeTaggedBlock(text, block, start, end) {
	if (text.includes(start) && text.includes(end)) {
		const [before, rest] = text.split(start, 2);
		const [, after] = rest.split(end, 2);
		return [before.trimEnd(), block.trimEnd(), after.trimStart()]
			.filter(Boolean)
			.join("\n\n");
	}
	return [text.trimEnd(), block.trimEnd()].filter(Boolean).join("\n\n");
}

export async function mergeTaggedMarkdown({ target, template, start, end }) {
	const body = (await readText(template)).trimEnd();
	const existing = await readText(target, "");
	await writeText(
		target,
		mergeTaggedBlock(existing, `${start}\n${body}\n${end}`, start, end),
	);
}

function buildCodexAgentProfiles(planName) {
	const plan = getCodexPlan(planName);
	return {
		athena: plan.agentAssignments.athena,
		hephaestus: plan.agentAssignments.hephaestus,
		nemesis: plan.agentAssignments.nemesis,
		odysseus: plan.agentAssignments.odysseus,
		hermes: plan.agentAssignments.hermes,
		atalanta: plan.agentAssignments.atalanta,
		calliope: plan.agentAssignments.calliope,
	};
}

const CODEX_AGENT_ORDER = [
	"athena",
	"hephaestus",
	"nemesis",
	"atalanta",
	"calliope",
	"hermes",
	"odysseus",
];

const FEATURE_KEY_MAP = {
	codexHooks: "codex_hooks",
	multiAgentV2: "multi_agent_v2",
	collaborationModes: "collaboration_modes",
	defaultModeRequestUserInput: "default_mode_request_user_input",
	fastMode: "fast_mode",
	memories: "memories",
	shellTool: "shell_tool",
	shellSnapshot: "shell_snapshot",
	skillMcpDependencyInstall: "skill_mcp_dependency_install",
	unifiedExec: "unified_exec",
	preventIdleSleep: "prevent_idle_sleep",
};

const TOP_LEVEL_FEATURES = {
	codexHooks: true,
	multiAgentV2: true,
	collaborationModes: true,
	defaultModeRequestUserInput: true,
	fastMode: false,
	memories: true,
	shellTool: true,
	shellSnapshot: true,
	skillMcpDependencyInstall: true,
	unifiedExec: true,
};

function renderTomlArray(values) {
	return `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
}

function renderFeatureBlock(tableName, features) {
	return [
		`[${tableName}]`,
		...Object.entries(features).map(([key, value]) => {
			const tomlKey = FEATURE_KEY_MAP[key];
			if (!tomlKey) {
				throw new Error(`Unsupported Codex feature key: ${key}`);
			}
			return `${tomlKey} = ${value}`;
		}),
	].join("\n");
}

async function loadCodexAgentMetadata() {
	const catalogAgents = await loadAgents();
	const byName = new Map(catalogAgents.map((agent) => [agent.name, agent]));
	return CODEX_AGENT_ORDER.map((name) => byName.get(name)).filter(Boolean);
}

function renderAgentBlock(agent) {
	const nicknameCandidates = agent.codex.nicknameCandidates ?? [
		agent.claude.displayName,
		agent.name,
	];
	return [
		`[agents.${agent.name}]`,
		`description = ${JSON.stringify(agent.codex.description)}`,
		`config_file = ${JSON.stringify(`agents/${agent.name}.toml`)}`,
		`nickname_candidates = ${renderTomlArray(nicknameCandidates)}`,
	].join("\n");
}

function renderCodexProfile(name, config, { extraLines = [] } = {}) {
	const profileLines = [
		`[profiles.${name}]`,
		`model = "${config.model}"`,
		`model_reasoning_effort = "${config.modelReasoning}"`,
		`plan_mode_reasoning_effort = "${config.planReasoning}"`,
		`model_verbosity = "${config.verbosity}"`,
		'personality = "pragmatic"',
		'model_instructions_file = "~/.codex/AGENTS.md"',
		`approval_policy = "${config.approval}"`,
		config.approvalsReviewer
			? `approvals_reviewer = "${config.approvalsReviewer}"`
			: "",
		`sandbox_mode = "${config.sandbox}"`,
	].filter(Boolean);
	if (config.backgroundTerminalMaxTimeout) {
		profileLines.push(
			`background_terminal_max_timeout = ${config.backgroundTerminalMaxTimeout}`,
		);
	}
	profileLines.push(
		...extraLines,
		"",
		renderFeatureBlock(`profiles.${name}.features`, config.features),
	);
	return profileLines.join("\n");
}

function renderCodexCompactPrompt() {
	return `You are compacting an openagentsbtw Codex session so work can continue after context pressure.

Preserve only execution-critical state. Follow objective task requirements and repo facts, not the user's emotional tone.

Required sections:
1. Objective
   State the concrete task still being worked on.
2. Verified Repo State
   Keep only facts grounded in files, commands, tests, or tool output.
3. Work Completed
   Note real code edits, commands run, and verified outcomes.
4. Current Constraints
   Note active route contract, blockers, approvals, missing tools, or environment limits.
5. Next Actions
   List the exact next implementation or validation steps.
6. BLOCKED
   If blocked, include the exact missing dependency or contradiction. Otherwise write "none".

Do not include:
- tutorial framing
- motivational or emotional language
- placeholder plans
- TODO/FIXME wishlists
- speculative architecture not grounded in the task
- educational explanations for the user

Be terse, operational, and continuation-ready.`;
}

function codexExportBudgets(planName) {
	switch (planName) {
		case "plus":
			return {
				projectDocMaxBytes: 12000,
				toolOutputTokenLimit: 800,
			};
		case "pro-20":
			return {
				projectDocMaxBytes: 24000,
				toolOutputTokenLimit: 4000,
			};
		default:
			return {
				projectDocMaxBytes: 16000,
				toolOutputTokenLimit: 2000,
			};
	}
}

function renderCodexAdvancedExamples() {
	return `# Optional: lock default filesystem/network access behind a named permissions profile.
#
# default_permissions = "openagentsbtw-default"
#
# [permissions.openagentsbtw-default.filesystem]
# ":project_roots"."." = "write"
# "/tmp" = "write"
#
# [permissions.openagentsbtw-default.network]
# enabled = true
# mode = "limited"
# domains."developers.openai.com" = "allow"
#
# Optional: switch from interactive approvals to granular approval routing.
#
# approval_policy = { granular = { sandbox_approval = true, rules = true, mcp_elicitations = false, request_permissions = true, skill_approval = true } }
#
# Optional: tighten app defaults unless explicitly enabled per connector/tool.
#
# [apps._default]
# enabled = true
# destructive_enabled = false
# open_world_enabled = false
#
# Optional: replace simple search mode with object-form web search tool config.
#
# [tools]
# web_search = { context_size = "medium", allowed_domains = ["developers.openai.com"] }`;
}

async function renderCodexConfig({
	planName,
	mode,
	deepwiki = false,
	includePluginEntry = true,
	includeTopLevelProfile = false,
}) {
	const plan = getCodexPlan(planName);
	const budgets = codexExportBudgets(planName);
	const compactPrompt = renderCodexCompactPrompt();
	const agentBlocks = (await loadCodexAgentMetadata()).map(renderAgentBlock);
	const pluginEntry = includePluginEntry
		? '\n[plugins."openagentsbtw@openagentsbtw-local"]\nenabled = true\n'
		: "";
	const deepwikiBlock = deepwiki
		? '\n[mcp_servers.deepwiki]\nurl = "https://mcp.deepwiki.com/mcp"\nenabled = true\n'
		: "";
	const sampleHeader =
		mode === "sample"
			? [
					"#:schema https://developers.openai.com/codex/config-schema.json",
					"# openagentsbtw managed file. Generated from source/ via scripts/generate.mjs",
				].join("\n")
			: "";
	const commentedDeepwikiBlock =
		mode === "sample"
			? '# Optional: enable only to use the DeepWiki exploration route.\n#\n# [mcp_servers.deepwiki]\n# url = "https://mcp.deepwiki.com/mcp"\n# enabled = true'
			: "";
	return [
		sampleHeader,
		includeTopLevelProfile ? 'profile = "openagentsbtw"' : "",
		'sqlite_home = "~/.codex/openagentsbtw/sqlite"',
		`project_doc_max_bytes = ${budgets.projectDocMaxBytes}`,
		"hide_agent_reasoning = true",
		'model_reasoning_effort = "medium"',
		'plan_mode_reasoning_effort = "high"',
		'model_reasoning_summary = "none"',
		`tool_output_token_limit = ${budgets.toolOutputTokenLimit}`,
		'model_instructions_file = "~/.codex/AGENTS.md"',
		'review_model = "gpt-5.3-codex"',
		'approvals_reviewer = "auto_review"',
		"allow_login_shell = true",
		'web_search = "cached"',
		'project_doc_fallback_filenames = ["CLAUDE.md"]',
		"",
		"[tools]",
		"view_image = true",
		"",
		renderFeatureBlock("features", TOP_LEVEL_FEATURES),
		"",
		"[history]",
		'persistence = "save-all"',
		"max_bytes = 134217728",
		"",
		"[memories]",
		"generate_memories = true",
		"use_memories = true",
		"disable_on_external_context = true",
		"min_rollout_idle_hours = 12",
		"",
		'compact_prompt = """',
		compactPrompt,
		'"""',
		"",
		`agents.max_threads = ${plan.swarm.maxThreads}`,
		`agents.max_depth = ${plan.swarm.maxDepth}`,
		`agents.job_max_runtime_seconds = ${plan.swarm.jobMaxRuntimeSeconds}`,
		"",
		...agentBlocks.flatMap((block) => [block, ""]),
		renderCodexProfile("openagentsbtw", plan.profiles.main),
		"",
		renderCodexProfile("openagentsbtw-implement", plan.profiles.implementation),
		"",
		renderCodexProfile("openagentsbtw-review", plan.profiles.review),
		"",
		renderCodexProfile("openagentsbtw-utility", plan.profiles.utility, {
			extraLines: ['web_search = "live"'],
		}),
		"",
		renderCodexProfile(
			"openagentsbtw-approval-auto",
			plan.profiles.approvalAuto,
		),
		"",
		renderCodexProfile("openagentsbtw-runtime-long", plan.profiles.runtimeLong),
		deepwikiBlock,
		pluginEntry,
		commentedDeepwikiBlock,
		mode === "sample" ? renderCodexAdvancedExamples() : "",
	]
		.filter(Boolean)
		.join("\n");
}

export async function renderSampleCodexConfig(planName = "pro-5") {
	return renderCodexConfig({
		planName,
		mode: "sample",
		includeTopLevelProfile: true,
	});
}

export async function updateCodexAgents({ agentsDir, tier }) {
	const profiles = buildCodexAgentProfiles(tier);
	for (const [agent, [model, reasoning]] of Object.entries(profiles)) {
		const filepath = path.join(agentsDir, `${agent}.toml`);
		if (!(await pathExists(filepath))) continue;
		let text = await readText(filepath);
		text = text.replace(/^model = ".*"$/m, `model = "${model}"`);
		text = text.replace(
			/^model_reasoning_effort = ".*"$/m,
			`model_reasoning_effort = "${reasoning}"`,
		);
		await writeText(filepath, text);
	}
}

export async function updateCodexMarketplace({
	target,
	pluginPath = "./.codex/plugins/openagentsbtw",
}) {
	await writeCodexMarketplace({ target, pluginPath });
}

export async function mergeCodexHooks({ source, target }) {
	const template = JSON.parse(await readText(source));
	let current = {};
	if (await pathExists(target)) {
		try {
			current = JSON.parse(await readText(target));
		} catch {}
	}
	current.hooks ??= {};
	for (const [event, groups] of Object.entries(current.hooks)) {
		current.hooks[event] = groups.filter((group) => {
			const hooks = Array.isArray(group?.hooks) ? group.hooks : [];
			return !hooks.some(
				(hook) =>
					hook &&
					typeof hook === "object" &&
					typeof hook.command === "string" &&
					hook.command.includes(".codex/openagentsbtw/hooks/scripts/"),
			);
		});
	}
	for (const [event, groups] of Object.entries(template.hooks || {})) {
		current.hooks[event] ??= [];
		current.hooks[event].push(...groups);
	}
	await writeText(target, JSON.stringify(current, null, 2));
}

export function removeManagedBlock(text, start, end) {
	if (!text.includes(start) || !text.includes(end)) return text;
	const [before, rest] = text.split(start, 2);
	const [, after] = rest.split(end, 2);
	return [before.trimEnd(), after.trimStart()].filter(Boolean).join("\n\n");
}

export async function mergeCodexConfig({
	target,
	profileAction,
	profileName,
	planName,
	deepwiki,
}) {
	const start = "# >>> openagentsbtw codex >>>";
	const end = "# <<< openagentsbtw codex <<<";
	let text = await readText(target, "");

	text = removeManagedBlock(text, start, end);
	text = removeManagedBlock(
		text,
		"# >>> openagentsbtw mcp chrome-devtools >>>",
		"# <<< openagentsbtw mcp chrome-devtools <<<",
	);
	text = removeManagedBlock(
		text,
		"# >>> openagentsbtw mcp browsermcp >>>",
		"# <<< openagentsbtw mcp browsermcp <<<",
	);

	const hasExistingProfile = /^[\s]*profile[\s]*=/m.test(text);
	const setTopProfile =
		profileAction === "true" ||
		(profileAction === "auto" && !hasExistingProfile);

	if (setTopProfile) {
		text = text.replace(/^[\s]*profile[\s]*=.*\n?/gm, "");
	}

	const prefixLines = [];
	const restLines = [];
	let inPrefix = true;
	for (const line of text.split("\n")) {
		if (/^[\s]*\[/.test(line)) inPrefix = false;
		(inPrefix ? prefixLines : restLines).push(line);
	}
	if (setTopProfile) {
		while (prefixLines[0]?.trim() === "") prefixLines.shift();
		prefixLines.unshift(`profile = "${profileName}"`);
	}
	const managedBody = await renderCodexConfig({
		planName: planName || profileName.replace(/^openagentsbtw-/, ""),
		mode: "managed",
		deepwiki,
		includePluginEntry:
			!/\[plugins\."openagentsbtw@openagentsbtw-local"\]/.test(text),
	});

	await writeText(
		target,
		[
			prefixLines.join("\n").trim(),
			`${start}\n${managedBody}\n${end}`,
			restLines.join("\n").trim(),
		]
			.filter(Boolean)
			.join("\n\n"),
	);
}

export async function toggleCodexDeepwiki({ target, enabled }) {
	let text = await readText(target, "");
	text = removeManagedBlock(
		text,
		"# >>> openagentsbtw deepwiki >>>",
		"# <<< openagentsbtw deepwiki <<<",
	);
	if (enabled) {
		text = [
			text.trim(),
			'# >>> openagentsbtw deepwiki >>>\n[mcp_servers.deepwiki]\nurl = "https://mcp.deepwiki.com/mcp"\nenabled = true\n# <<< openagentsbtw deepwiki <<<',
		]
			.filter(Boolean)
			.join("\n\n");
	}
	await writeText(target, text);
}

async function main() {
	const command = process.argv[2];
	const arg = (flag) => {
		const index = process.argv.indexOf(flag);
		return index === -1 ? "" : (process.argv[index + 1] ?? "");
	};

	switch (command) {
		case "merge-tagged-markdown":
			await mergeTaggedMarkdown({
				target: arg("--target"),
				template: arg("--template"),
				start: arg("--start"),
				end: arg("--end"),
			});
			break;
		case "update-codex-agents":
			await updateCodexAgents({ agentsDir: arg("--dir"), tier: arg("--tier") });
			break;
		case "update-codex-marketplace":
			await updateCodexMarketplace({ target: arg("--target") });
			break;
		case "merge-codex-hooks":
			await mergeCodexHooks({
				source: arg("--source"),
				target: arg("--target"),
			});
			break;
		case "merge-codex-config":
			await mergeCodexConfig({
				target: arg("--target"),
				profileAction: arg("--profile-action") || "auto",
				profileName: arg("--profile-name") || "openagentsbtw",
				planName: arg("--plan-name") || "pro-5",
				deepwiki: arg("--deepwiki") === "true",
			});
			break;
		case "toggle-deepwiki":
			await toggleCodexDeepwiki({
				target: arg("--target"),
				enabled: arg("--enabled") === "true",
			});
			break;
		default:
			throw new Error(`Unknown command: ${command}`);
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await main();
}
