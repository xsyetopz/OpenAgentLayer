import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	assertClaudeSettingsSchema,
	assertCodexTomlSchema,
	assertOpenCodeConfigSchema,
} from "./config-schema";

const CODEX_REQUIRED_FLAGS = [
	"steer = true",
	"apps = false",
	"tui_app_server = true",
	"memories = true",
	"sqlite = true",
	"plugins = true",
	"hooks = true",
	"goals = true",
	"responses_websockets = true",
	"responses_websockets_v2 = true",
	"unified_exec = false",
	"enable_fanout = false",
	"multi_agent = false",
	"multi_agent_v2 = { enabled = true",
	"shell_snapshot = false",
	"collaboration_modes = false",
	"codex_git_commit = false",
	"fast_mode = false",
	"undo = false",
	"js_repl = false",
] as const;
const CODEX_MARKERS = [
	"# >>> oal codex >>>",
	"# Source: config:codex",
	"# Regenerate: oal render",
	"# <<< oal codex <<<",
] as const;
const CODEX_SCHEMA_COMMENT =
	"#:schema https://developers.openai.com/codex/config-schema.json";
const OPENCODE_MODEL_FALLBACKS = [
	"opencode/nemotron-3-super-free",
	"opencode/minimax-m2.5-free",
	"opencode/hy3-preview-free",
	"opencode/big-pickle",
	"opencode/gpt-5-nano",
] as const;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/;

export async function assertProviderConfigContracts(
	targetRoot: string,
): Promise<void> {
	await assertCodexConfig(targetRoot);
	await assertClaudeSettings(targetRoot);
	await assertOpenCodeConfig(targetRoot);
	await assertRuntimeArtifacts(targetRoot);
}

async function assertCodexConfig(targetRoot: string): Promise<void> {
	const config = await readFile(join(targetRoot, ".codex/config.toml"), "utf8");
	const requirements = await readFile(
		join(targetRoot, ".codex/requirements.toml"),
		"utf8",
	);
	assertCodexTomlSchema(config);
	if (!config.includes(CODEX_SCHEMA_COMMENT))
		throw new Error("Codex config missing schema comment");
	for (const marker of CODEX_MARKERS)
		if (!config.includes(marker))
			throw new Error(`Codex config missing managed marker \`${marker}\``);
	await assertCodexBaseInstructions(config, targetRoot);
	for (const flag of CODEX_REQUIRED_FLAGS)
		if (!config.includes(flag))
			throw new Error(`Codex config missing \`${flag}\``);
	if (
		!config.includes(
			'model_instructions_file = "./openagentlayer/codex-base-instructions.md"',
		)
	)
		throw new Error("Codex config missing patched base instructions file");
	if (!config.includes('approvals_reviewer = "auto_review"'))
		throw new Error("Codex config missing auto approval reviewer");
	if (!config.includes("interrupt_message = true"))
		throw new Error("Codex config has invalid agents.interrupt_message");
	for (const required of [
		"[features]",
		"hooks = true",
		"[hooks]",
		"managed_dir",
		"[[hooks.PreToolUse]]",
		"OAL_HOOK_PROVIDER=codex",
		"OAL_HOOK_EVENT=PreToolUse",
		"__OAL_CODEX_MANAGED_HOOK_DIR__/enforce-rtk-commands.mjs",
	])
		if (!requirements.includes(required))
			throw new Error(`Codex requirements missing \`${required}\``);
	if (requirements.includes("codex_hooks"))
		throw new Error("Codex requirements emitted legacy codex_hooks feature");
	if (!config.includes("max_concurrent_threads_per_session = 4"))
		throw new Error(
			"Codex config missing multi_agent_v2.max_concurrent_threads_per_session",
		);
	if (!config.includes("job_max_runtime_seconds = 600"))
		throw new Error("Codex config missing bounded agents job runtime");
	for (const required of [
		"root_agent_usage_hint_text",
		"subagent_usage_hint_text",
		"GPT-5.3-Codex implementation agents",
		"instead of doing all edits in the GPT-5.5 parent",
	])
		if (!config.includes(required))
			throw new Error(
				`Codex config missing multi-agent cost hint \`${required}\``,
			);
	if (config.includes('interrupt_message = "'))
		throw new Error("Codex config emitted string agents.interrupt_message");
	for (const forbidden of [
		'approval_policy = "on-failure"',
		["guardian", "subagent"].join("_"),
	])
		if (config.includes(forbidden))
			throw new Error(
				`Codex config emitted forbidden key or value ${forbidden}`,
			);
}

async function assertCodexBaseInstructions(
	config: string,
	targetRoot: string,
): Promise<void> {
	for (const profile of [
		"openagentlayer",
		"openagentlayer-implement",
		"openagentlayer-utility",
	]) {
		const profileBlock = config.match(
			new RegExp(String.raw`\[profiles\.${profile}\]([\s\S]*?)(?=\n\[|$)`),
		)?.[1];
		if (profileBlock?.includes("zsh_path"))
			throw new Error(
				`Codex profile \`${profile}\` should use the normal shell`,
			);
	}
	const baseInstructions = await readFile(
		join(targetRoot, ".codex/openagentlayer/codex-base-instructions.md"),
		"utf8",
	);
	for (const required of [
		"Do not run tests, type checks, builds, simulator launches, browser automation, or full validation suites after every implementation step by default.",
		"## OAL and RTK project surfaces",
		"keep AGENTS.md-level context compact",
		"rtk proxy -- <command>",
		"## OAL parent-session quota guard",
		"oal codex-usage --project <path>",
		"session-complete\nhandoff",
		"COMPLETE-complete",
		"report only conclusive, actionable findings grounded in current code",
		"Keep review output findings-only\nand bounded",
		"Unknown or potentially large command output must be bounded before it reaches context.",
	])
		if (!baseInstructions.includes(required))
			throw new Error(
				`Patched Codex base instructions missing \`${required}\``,
			);
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
		throw new Error("Claude settings missing permissions or hooks");
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
	};
	assertOpenCodeConfigSchema(config);
	if (!(config.permission && config.plugin && config.command && config.agent))
		throw new Error(
			"OpenCode config missing native permission/plugin/command/agent surfaces.",
		);
	if (config.default_agent !== "hephaestus")
		throw new Error("OpenCode default agent is not a primary OAL agent");
	if (config.model !== OPENCODE_MODEL_FALLBACKS[0])
		throw new Error("OpenCode model fallback default is not first free model");
	if (config.small_model !== OPENCODE_MODEL_FALLBACKS[1])
		throw new Error("OpenCode small model fallback is not second free model");
	assertOpenCodeAgentColors(config.agent);
	for (const command of [
		"planning",
		"implementation",
		"review",
		"testing",
		"validate",
		"exploration",
		"tracing",
		"debugging",
		"documentation",
		"orchestrate",
		"audit",
	])
		if (!config.command[command])
			throw new Error(`OpenCode config missing command \`${command}\``);
}

function assertOpenCodeAgentColors(agentConfig: Record<string, unknown>): void {
	for (const [agentId, config] of Object.entries(agentConfig)) {
		if (!(config && typeof config === "object" && "color" in config))
			throw new Error(`OpenCode agent \`${agentId}\` missing color`);
		const color = (config as { color?: unknown }).color;
		if (!(typeof color === "string" && HEX_COLOR_PATTERN.test(color)))
			throw new Error(`OpenCode agent \`${agentId}\` has invalid color`);
	}
}

async function assertRuntimeArtifacts(targetRoot: string): Promise<void> {
	const plugin = await readFile(
		join(targetRoot, ".opencode/plugins/openagentlayer.ts"),
		"utf8",
	);
	if (
		!(
			plugin.includes('import type { Plugin } from "@opencode-ai/plugin"') &&
			plugin.includes("export const OpenAgentLayerPlugin")
		)
	)
		throw new Error("OpenCode plugin does not use native plugin typing");
	for (const runtimePath of [
		".codex/openagentlayer/runtime/privileged-exec.mjs",
		".claude/openagentlayer/runtime/privileged-exec.mjs",
		".opencode/openagentlayer/runtime/privileged-exec.mjs",
	]) {
		const content = await readFile(join(targetRoot, runtimePath), "utf8");
		if (
			!(
				content.includes("ALLOWED_COMMANDS") &&
				content.includes("xcodebuild") &&
				content.includes("dryRun")
			)
		)
			throw new Error(
				`Privileged exec runtime is incomplete: \`${runtimePath}\``,
			);
	}
}

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}
