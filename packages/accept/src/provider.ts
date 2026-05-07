import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	assertClaudeSettingsSchema,
	assertCodexTomlSchema,
	assertOpenCodeConfigSchema,
} from "./config-schema";

const CODEX_REQUIRED_FLAGS = [
	"steer = true",
	"apps = true",
	"tui_app_server = true",
	"memories = true",
	"sqlite = true",
	"plugins = true",
	"codex_hooks = true",
	"hooks = true",
	"goals = true",
	"responses_websockets = true",
	"responses_websockets_v2 = true",
	"unified_exec = false",
	"enable_fanout = false",
	"multi_agent = false",
	"multi_agent_v2 = false",
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
	assertCodexTomlSchema(config);
	for (const marker of CODEX_MARKERS)
		if (!config.includes(marker))
			throw new Error(`Codex config missing managed marker \`${marker}\``);
	await assertCodexInstructionBaseline(config, targetRoot);
	for (const flag of CODEX_REQUIRED_FLAGS)
		if (!config.includes(flag))
			throw new Error(`Codex config missing \`${flag}\``);
	if (config.includes("model_instructions_file"))
		throw new Error(
			"Codex config should not replace bundled base instructions.",
		);
	if (!config.includes('approvals_reviewer = "auto_review"'))
		throw new Error("Codex config missing auto approval reviewer");
	if (!config.includes("interrupt_message = true"))
		throw new Error("Codex config has invalid agents.interrupt_message");
	if (!config.includes("max_threads = 1"))
		throw new Error("Codex config missing agents.max_threads");
	if (!config.includes("job_max_runtime_seconds = 1800"))
		throw new Error("Codex config missing bounded agents job runtime");
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

async function assertCodexInstructionBaseline(
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
	const agents = await readFile(join(targetRoot, "AGENTS.md"), "utf8");
	for (const required of [
		"Codex baseline",
		"bundled base instructions",
		"generated files are disposable outputs",
		"Instruction reload surface:",
	])
		if (!agents.includes(required))
			throw new Error(`AGENTS.md missing Codex baseline text: \`${required}\``);
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
