import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	assertClaudeSettingsSchema,
	assertCodexTomlSchema,
	assertOpenCodeConfigSchema,
} from "./config-schema";

const CODEX_REQUIRED_FLAGS = [
	"shell_zsh_fork = true # zsh shell execution",
	"steer = true # mid-turn steering",
	"apps = false # app config not wired",
	"tui_app_server = true # richer TUI surface",
	"memories = true # session continuity",
	"sqlite = true # local state persistence",
	"plugins = true # plugin skill payloads",
	"codex_hooks = true # runtime hooks",
	"goals = true # goal state tracking",
	"responses_websockets = true # faster streaming transport",
	"responses_websockets_v2 = true # newer streaming transport",
	"unified_exec = false # long-runtime profile only",
	"multi_agent = false # owned delegation routes",
	"multi_agent_v2 = false # owned delegation routes",
	"shell_snapshot = false # snapshot surface not wired",
	"collaboration_modes = false # route contracts own mode",
	"codex_git_commit = false # user-authored commits",
	"fast_mode = false # profile routing over blanket speed mode",
	"voice_transcription = false # voice input not wired",
	"undo = false # rollback owns recovery",
	"js_repl = false # tool surface not wired",
] as const;
const CODEX_MARKERS = [
	"# >>> oal codex >>>",
	"# Source: config:codex",
	"# Regenerate: oal render",
	"# <<< oal codex <<<",
] as const;
const FORBIDDEN_CODEX_FEATURE_COMMENT_TERMS = [
	"OAL",
	"OpenAgentLayer",
	"because",
	"for ",
	"guarded execution path",
] as const;
const OPENCODE_MODEL_FALLBACKS = [
	"opencode/nemotron-3-super-free",
	"opencode/minimax-m2.5-free",
	"opencode/hy3-preview-free",
	"opencode/big-pickle",
] as const;

export async function assertProviderConfigContracts(
	targetRoot: string,
): Promise<void> {
	await assertCodexConfig(targetRoot);
	await assertClaudeSettings(targetRoot);
	await assertOpenCodeConfig(targetRoot);
}

async function assertCodexConfig(targetRoot: string): Promise<void> {
	const config = await readFile(join(targetRoot, ".codex/config.toml"), "utf8");
	assertCodexTomlSchema(config);
	for (const marker of CODEX_MARKERS)
		if (!config.includes(marker))
			throw new Error(`Codex config missing managed marker ${marker}`);
	for (const flag of CODEX_REQUIRED_FLAGS)
		if (!config.includes(flag)) throw new Error(`Codex config missing ${flag}`);
	assertCodexFeatureComments(config);
	for (const forbidden of [
		'approval_policy = "on-failure"',
		["guardian", "subagent"].join("_"),
		["gpt", "5", "2"].join("-"),
	])
		if (config.includes(forbidden))
			throw new Error(
				`Codex config emitted forbidden key or value ${forbidden}`,
			);
}

function assertCodexFeatureComments(config: string): void {
	for (const line of config.split("\n")) {
		if (!(line.includes(" = ") && line.includes("#"))) continue;
		const [assignment, comment] = line.split("#", 2);
		if (!assignment.includes("=")) continue;
		const reason = comment?.trim() ?? "";
		if (reason.length === 0)
			throw new Error(`Codex feature line missing reason: ${line}`);
		for (const term of FORBIDDEN_CODEX_FEATURE_COMMENT_TERMS)
			if (reason.includes(term))
				throw new Error(
					`Codex feature comment contains forbidden term ${term}`,
				);
	}
}

async function assertClaudeSettings(targetRoot: string): Promise<void> {
	const settings = JSON.parse(
		await readFile(join(targetRoot, ".claude/settings.json"), "utf8"),
	) as { permissions?: unknown; hooks?: unknown; model?: string };
	assertClaudeSettingsSchema(settings);
	if (settings.model !== "claude-sonnet-4-6")
		throw new Error(
			"Claude settings model route is not allowed baseline model.",
		);
	if (!(settings.permissions && settings.hooks))
		throw new Error("Claude settings missing permissions or hooks.");
}

async function assertOpenCodeConfig(targetRoot: string): Promise<void> {
	const config = JSON.parse(
		stripJsonComments(
			await readFile(join(targetRoot, "opencode.jsonc"), "utf8"),
		),
	) as {
		permission?: unknown;
		plugin?: unknown;
		command?: Record<string, unknown>;
		agent?: Record<string, unknown>;
		default_agent?: string;
		model?: string;
		small_model?: string;
		model_fallbacks?: string[];
	};
	assertOpenCodeConfigSchema(config);
	if (!(config.permission && config.plugin && config.command && config.agent))
		throw new Error(
			"OpenCode config missing native permission/plugin/command/agent surfaces.",
		);
	if (config.default_agent !== "hephaestus")
		throw new Error("OpenCode default agent is not a primary OAL agent.");
	if (config.model !== OPENCODE_MODEL_FALLBACKS[0])
		throw new Error("OpenCode model fallback default is not first free model.");
	if (config.small_model !== OPENCODE_MODEL_FALLBACKS[1])
		throw new Error("OpenCode small model fallback is not second free model.");
	if (
		JSON.stringify(config.model_fallbacks) !==
		JSON.stringify(OPENCODE_MODEL_FALLBACKS)
	)
		throw new Error("OpenCode model fallbacks do not match OAL defaults.");
	for (const command of [
		"plan",
		"implement",
		"review",
		"test",
		"validate",
		"explore",
		"trace",
		"debug",
		"document",
		"orchestrate",
		"audit",
	])
		if (!config.command[command])
			throw new Error(`OpenCode config missing command ${command}`);
}

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}
