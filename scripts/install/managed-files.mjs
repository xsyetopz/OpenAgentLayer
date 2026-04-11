import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCodexPlan } from "../../source/subscriptions.mjs";
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
		athena: [plan.main.model, plan.main.reasoning],
		hephaestus: [plan.implement.model, plan.implement.reasoning],
		nemesis: [plan.main.model, plan.main.reasoning],
		odysseus: [plan.main.model, plan.main.reasoning],
		hermes: [plan.utility.model, plan.utility.reasoning],
		atalanta: [plan.utility.model, plan.utility.reasoning],
		calliope: [plan.utility.model, plan.utility.reasoning],
	};
}

function renderCodexProfile(name, config, extra = "") {
	return `[profiles.${name}]
model = "${config.model}"
model_reasoning_effort = "${config.reasoning}"
plan_mode_reasoning_effort = "${config.reasoning}"
model_verbosity = "${config.verbosity}"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"${extra}

[profiles.${name}.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false`;
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

function buildManagedCodexBody({
	planName,
	deepwiki,
	includeCommitAttribution,
	includePluginEntry,
}) {
	const plan = getCodexPlan(planName);
	const compactPrompt = renderCodexCompactPrompt();
	const pluginEntry = includePluginEntry
		? '\n[plugins."openagentsbtw@openagentsbtw-local"]\nenabled = true\n'
		: "";
	const deepwikiBlock = deepwiki
		? '\n[mcp_servers.deepwiki]\nurl = "https://mcp.deepwiki.com/mcp"\nenabled = true\n'
		: "";
	const aliasProfile = renderCodexProfile(
		`openagentsbtw-${plan.id}`,
		plan.main,
	);
	const mainProfile = renderCodexProfile("openagentsbtw", plan.main);
	const implementProfile = renderCodexProfile(
		"openagentsbtw-implement",
		plan.implement,
	);
	const utilityProfile = renderCodexProfile(
		"openagentsbtw-codex-mini",
		plan.utility,
	);
	const acceptEditsProfile = `[profiles.openagentsbtw-accept-edits]
model = "${plan.implement.model}"
model_reasoning_effort = "${plan.implement.reasoning}"
plan_mode_reasoning_effort = "${plan.implement.reasoning}"
model_verbosity = "${plan.implement.verbosity}"
personality = "none"
approval_policy = "never"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-accept-edits.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false`;
	const longrunProfile = `[profiles.openagentsbtw-longrun]
model = "${plan.implement.model}"
model_reasoning_effort = "${plan.implement.reasoning}"
plan_mode_reasoning_effort = "${plan.implement.reasoning}"
model_verbosity = "${plan.implement.verbosity}"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
background_terminal_max_timeout = 7200

[profiles.openagentsbtw-longrun.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false
unified_exec = true
prevent_idle_sleep = true`;
	return [
		includeCommitAttribution
			? 'commit_attribution = "Co-Authored-By: Codex <codex@users.noreply.github.com>"'
			: "",
		"",
		'sqlite_home = "~/.codex/openagentsbtw/sqlite"',
		"hide_agent_reasoning = true",
		'model_reasoning_summary = "none"',
		"tool_output_token_limit = 12000",
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
		aliasProfile,
		"",
		mainProfile,
		"",
		implementProfile,
		"",
		utilityProfile,
		"",
		acceptEditsProfile,
		"",
		longrunProfile,
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
		text = text.replace(/^model = ".*"$/m, `model = "${model}"`);
		text = text.replace(
			/^model_reasoning_effort = ".*"$/m,
			`model_reasoning_effort = "${reasoning}"`,
		);
		await writeText(filepath, text);
	}
}

export async function updateCodexMarketplace({ target }) {
	let payload = {};
	if (await pathExists(target)) {
		try {
			payload = JSON.parse(await readText(target));
		} catch {}
	}
	payload.name ??= "openagentsbtw-local";
	payload.interface ??= {};
	payload.interface.displayName ??= "openagentsbtw Local Marketplace";
	const plugins = Array.isArray(payload.plugins) ? payload.plugins : [];
	payload.plugins = [
		...plugins.filter(
			(entry) =>
				!(entry && typeof entry === "object" && entry.name === "openagentsbtw"),
		),
		{
			name: "openagentsbtw",
			source: { source: "local", path: "./.codex/plugins/openagentsbtw" },
			policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
			category: "Productivity",
		},
	];
	await writeText(target, JSON.stringify(payload, null, 2));
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
	const prefixText = prefixLines.join("\n");
	const managedBody = buildManagedCodexBody({
		planName: planName || profileName.replace(/^openagentsbtw-/, ""),
		deepwiki,
		includeCommitAttribution: !/^[\s]*commit_attribution[\s]*=/m.test(
			prefixText,
		),
		includePluginEntry:
			!/\[plugins\."openagentsbtw@openagentsbtw-local"\]/.test(text),
	});
	const finalManagedBody = /^[\s]*commit_attribution[\s]*=/m.test(prefixText)
		? managedBody.replace(
				/^commit_attribution = "Co-Authored-By: Codex <codex@users\.noreply\.github\.com>"\n\n?/,
				"",
			)
		: managedBody;

	await writeText(
		target,
		[
			prefixLines.join("\n").trim(),
			restLines.join("\n").trim(),
			`${start}\n${finalManagedBody}\n${end}`,
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
				profileName: arg("--profile-name") || "openagentsbtw-pro-5",
				planName: arg("--plan-name") || "pro-5",
				deepwiki: arg("--deepwiki") === "true",
			});
			break;
		case "toggle-codex-deepwiki":
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
