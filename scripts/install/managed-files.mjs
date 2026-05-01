import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCodexPlan } from "../../source/subscriptions.mjs";
import { writeCodexMarketplace } from "./codex-plugin-install.mjs";
import { pathExists, readText, writeText } from "./shared.mjs";

const MODEL_LINE_RE = /^model = ".*"$/m;
const MODEL_REASONING_LINE_RE = /^model_reasoning_effort = ".*"$/m;
const PROFILE_ASSIGNMENT_RE = /^[\s]*profile[\s]*=/m;
const PROFILE_ASSIGNMENT_LINES_RE = /^[\s]*profile[\s]*=.*\n?/gm;
const SECTION_HEADER_RE = /^[\s]*\[/;
const OPENAGENTSBTW_PREFIX_RE = /^openagentsbtw-/;
const OPENAGENTSBTW_PLUGIN_RE =
	/\[plugins\."openagentsbtw@openagentsbtw-local"\]/;

function resolveZshPath() {
	try {
		const result = spawnSync("which", ["zsh"], {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
		if (result.status === 0 && result.stdout) {
			return result.stdout.trim();
		}
	} catch {
		// fall through
	}
	return null;
}

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

function renderCodexProfile(name, config, extra = "") {
	const zshPath = resolveZshPath();
	const zshConfig = zshPath ? `\nzsh_path = "${zshPath}"` : "";
	return `[profiles.${name}]
model = "${config.model}"
model_reasoning_effort = "${config.modelReasoning}"
plan_mode_reasoning_effort = "${config.planReasoning}"
model_verbosity = "${config.verbosity}"
personality = "none"
model_instructions_file = "~/.codex/AGENTS.md"
approval_policy = "on-request"
sandbox_mode = "workspace-write"${zshConfig}${extra}

[profiles.${name}.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false
shell_zsh_fork = true
view_image = true
steer = true
apps = false
tui_app_server = true
memories = false
plugins = false
responses_websockets = true
responses_websockets_v2 = true
unified_exec = false
collaboration_modes = false
codex_git_commit = false
voice_transcription = false
undo = false
js_repl = false`;
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

function buildManagedCodexBody({ planName, deepwiki, includePluginEntry }) {
	const plan = getCodexPlan(planName);
	const compactPrompt = renderCodexCompactPrompt();
	const pluginEntry = includePluginEntry
		? '\n[plugins."openagentsbtw@openagentsbtw-local"]\nenabled = true\n'
		: "";
	const deepwikiBlock = deepwiki
		? '\n[mcp_servers.deepwiki]\nurl = "https://mcp.deepwiki.com/mcp"\nenabled = true\n'
		: "";
	const zshPath = resolveZshPath();
	const zshConfig = zshPath ? `\nzsh_path = "${zshPath}"` : "";
	const mainProfile = renderCodexProfile("openagentsbtw", plan.profiles.main);
	const implementProfile = renderCodexProfile(
		"openagentsbtw-implement",
		plan.profiles.implementation,
	);
	const utilityProfile = renderCodexProfile(
		"openagentsbtw-utility",
		plan.profiles.utility,
	);
	const approvalAutoProfile = `[profiles.openagentsbtw-approval-auto]
model = "${plan.profiles.approvalAuto.model}"
model_reasoning_effort = "${plan.profiles.approvalAuto.modelReasoning}"
plan_mode_reasoning_effort = "${plan.profiles.approvalAuto.planReasoning}"
model_verbosity = "${plan.profiles.approvalAuto.verbosity}"
personality = "none"
model_instructions_file = "~/.codex/AGENTS.md"
approval_policy = "never"
sandbox_mode = "workspace-write"${zshConfig}

[profiles.openagentsbtw-approval-auto.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false
shell_zsh_fork = true
view_image = true
steer = true
apps = false
tui_app_server = true
memories = false
plugins = false
responses_websockets = true
responses_websockets_v2 = true
unified_exec = false
collaboration_modes = false
codex_git_commit = false
voice_transcription = false
undo = false
js_repl = false`;
	const runtimeLongProfile = `[profiles.openagentsbtw-runtime-long]
model = "${plan.profiles.runtimeLong.model}"
model_reasoning_effort = "${plan.profiles.runtimeLong.modelReasoning}"
plan_mode_reasoning_effort = "${plan.profiles.runtimeLong.planReasoning}"
model_verbosity = "${plan.profiles.runtimeLong.verbosity}"
personality = "none"
model_instructions_file = "~/.codex/AGENTS.md"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
background_terminal_max_timeout = 7200${zshConfig}

[profiles.openagentsbtw-runtime-long.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false
shell_zsh_fork = true
view_image = true
steer = true
apps = false
tui_app_server = true
memories = false
plugins = false
responses_websockets = true
responses_websockets_v2 = true
unified_exec = true
collaboration_modes = false
codex_git_commit = false
voice_transcription = false
undo = false
js_repl = false
prevent_idle_sleep = true`;
	return [
		'sqlite_home = "~/.codex/openagentsbtw/sqlite"',
		"hide_agent_reasoning = true",
		'model_reasoning_summary = "none"',
		"tool_output_token_limit = 12000",
		'model_instructions_file = "~/.codex/AGENTS.md"',
		"",
		"[history]",
		'persistence = "save-all"',
		"max_bytes = 134217728",
		"",
		"[memories]",
		"generate_memories = true",
		"use_memories = true",
		"no_memories_if_mcp_or_web_search = true",
		"min_rollout_idle_hours = 12",
		"",
		'compact_prompt = """',
		compactPrompt,
		'"""',
		"",
		`agents.max_threads = ${plan.swarm.maxThreads}`,
		"agents.max_depth = 1",
		"",
		mainProfile,
		"",
		implementProfile,
		"",
		utilityProfile,
		"",
		approvalAutoProfile,
		"",
		runtimeLongProfile,
		deepwikiBlock,
		pluginEntry,
	]
		.filter(Boolean)
		.join("\n");
}

export async function updateCodexAgents({ agentsDir, tier }) {
	const profiles = buildCodexAgentProfiles(tier);
	for (const [agent, [model, reasoning]] of Object.entries(profiles)) {
		const filepath = path.join(agentsDir, `${agent}.toml`);
		if (!(await pathExists(filepath))) continue;
		let text = await readText(filepath);
		text = text.replace(MODEL_LINE_RE, `model = "${model}"`);
		text = text.replace(
			MODEL_REASONING_LINE_RE,
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
		} catch {
			//
		}
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
	if (!(text.includes(start) && text.includes(end))) return text;
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

	const hasExistingProfile = PROFILE_ASSIGNMENT_RE.test(text);
	const setTopProfile =
		profileAction === "true" ||
		(profileAction === "auto" && !hasExistingProfile);

	if (setTopProfile) {
		text = text.replace(PROFILE_ASSIGNMENT_LINES_RE, "");
	}

	const prefixLines = [];
	const restLines = [];
	let inPrefix = true;
	for (const line of text.split("\n")) {
		if (SECTION_HEADER_RE.test(line)) inPrefix = false;
		(inPrefix ? prefixLines : restLines).push(line);
	}
	if (setTopProfile) {
		while (prefixLines[0]?.trim() === "") prefixLines.shift();
		prefixLines.unshift(`profile = "${profileName}"`);
	}
	const managedBody = buildManagedCodexBody({
		planName: planName || profileName.replace(OPENAGENTSBTW_PREFIX_RE, ""),
		deepwiki,
		includePluginEntry: !OPENAGENTSBTW_PLUGIN_RE.test(text),
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
