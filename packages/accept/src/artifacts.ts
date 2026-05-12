import type { Artifact } from "@openagentlayer/artifact";
import type { OalSource, Provider } from "@openagentlayer/source";

const PROVIDERS: Provider[] = ["codex", "claude", "opencode"];
const CORE_AGENTS = [
	"athena",
	"hermes",
	"hephaestus",
	"atalanta",
	"nemesis",
	"calliope",
	"odysseus",
] as const;
const REQUIRED_ROUTES = [
	"plan",
	"implement",
	"review",
	"test",
	"validate",
	"explore",
	"trace",
	"debug",
	"design",
	"document",
	"document-plain",
	"orchestrate",
	"audit",
] as const;
const AGENT_CONTRACT_TERMS = [
	"## Prompt contract",
	"Inspect only source needed",
	"smallest current-state change",
	"Validate only when",
	"STATUS BLOCKED",
	"Triggers:",
	"Route handoff signals:",
	"Tool contract:",
	"Skill access:",
	"Owned routes:",
	"Final output",
] as const;
const COMMAND_CONTRACT_TERMS = [
	"Owner:",
	"Permissions:",
	"Arguments:",
	"Required skills:",
	"## Prompt contract",
	"Success criteria:",
	"Ordered steps:",
	"Ambiguity behavior:",
	"Evidence contract:",
	"Standards contract:",
	"Structure contract:",
	"Markdown contract:",
	"Attribution contract:",
	"Behavior claims need current source",
	"Source Evidence Map",
	"Prefer direct source-backed code",
	"RTK:",
	"Answer the requested artifact",
] as const;
const SKILL_PROMPT_CONTRACT_TERMS = [
	"## Prompt contract",
	"Success criteria:",
	"Ordered steps:",
	"Ambiguity behavior:",
	"Evidence contract:",
	"Standards contract:",
	"Structure contract:",
	"Markdown contract:",
	"Attribution contract:",
] as const;
const HEX_COLOR_PATTERN = /#[0-9a-f]{6}/;
const CODEX_COLOR_PATTERN = /^color\s*=/m;
const FORBIDDEN_MODEL_TERMS = [
	'gpt-5.4"',
	"gpt-5.3-codex-spark",
	"claude-opus-4-7",
] as const;

export function assertGeneratedArtifactContracts(
	source: OalSource,
	artifacts: Artifact[],
): void {
	assertProviderCoverage(artifacts);
	assertCoreAgentArtifacts(artifacts);
	assertRouteArtifacts(artifacts);
	assertSkillArtifacts(source, artifacts);
	assertInstructionBlocks(artifacts);
	assertProvenanceMarkers(artifacts);
	assertNoForbiddenModels(artifacts);
}

function assertProviderCoverage(artifacts: Artifact[]): void {
	for (const provider of PROVIDERS) {
		const providerArtifacts = artifacts.filter(
			(artifact) => artifact.provider === provider,
		);
		if (providerArtifacts.length < 20)
			throw new Error(
				`${provider} rendered too few artifacts: ${providerArtifacts.length}`,
			);
	}
}

function assertCoreAgentArtifacts(artifacts: Artifact[]): void {
	for (const agent of CORE_AGENTS) {
		assertArtifact(`.codex/agents/${agent}.toml`, artifacts, [
			...AGENT_CONTRACT_TERMS,
		]);
		assertNoUnsupportedCodexAgentFields(
			`.codex/agents/${agent}.toml`,
			artifacts,
		);
		assertArtifact(`.claude/agents/${agent}.md`, artifacts, [
			...AGENT_CONTRACT_TERMS,
			'color: "#',
		]);
		assertArtifact(`.opencode/agents/${agent}.md`, artifacts, [
			...AGENT_CONTRACT_TERMS,
			'color: "#',
		]);
	}
	assertDistinctAgentColors(artifacts);
	assertNoUnsupportedCodexAgentFields(".codex/config.toml", artifacts);
}

function assertRouteArtifacts(artifacts: Artifact[]): void {
	for (const route of REQUIRED_ROUTES) {
		assertArtifact(
			`.claude/commands/${route}.md`,
			artifacts,
			COMMAND_CONTRACT_TERMS,
		);
		assertArtifact(
			`.opencode/commands/${route}.md`,
			artifacts,
			COMMAND_CONTRACT_TERMS,
		);
	}
	const codexInstructions = findArtifact("AGENTS.md", artifacts);
	for (const term of [
		"Source of truth:",
		"Change source:",
		"Context budget:",
		"Codex Base Instructions",
		".codex/openagentlayer/codex-base-instructions.md",
		"upstream `openai/codex` `default.md`",
	])
		if (!codexInstructions.content.includes(term))
			throw new Error(`Codex AGENTS.md missing reload contract \`${term}\``);
	for (const route of REQUIRED_ROUTES)
		if (!codexInstructions.content.includes(`- ${route}:`))
			throw new Error(`Codex AGENTS.md missing route \`${route}\``);
}

function assertSkillArtifacts(source: OalSource, artifacts: Artifact[]): void {
	for (const skill of source.skills) {
		for (const provider of skill.providers) {
			const path =
				provider === "codex"
					? `.codex/openagentlayer/skills/${skill.id}/SKILL.md`
					: provider === "claude"
						? `.claude/skills/${skill.id}/SKILL.md`
						: `.opencode/skills/${skill.id}/SKILL.md`;
			assertArtifact(
				path,
				artifacts,
				skill.upstream?.verbatim
					? [skill.body.slice(0, 60), skill.body.slice(-60).trim()]
					: [
							`name: ${skill.id}`,
							skill.title,
							skill.description,
							skill.body.slice(0, 60),
							"## Bundled support files",
							...SKILL_PROMPT_CONTRACT_TERMS,
						],
			);
		}
		for (const supportFile of skill.supportFiles ?? []) {
			for (const provider of skill.providers) {
				const root =
					provider === "codex"
						? ".codex/openagentlayer/skills"
						: provider === "claude"
							? ".claude/skills"
							: ".opencode/skills";
				const content = supportFile.content;
				if (!content)
					throw new Error(
						`Skill support file \`${skill.id}/${supportFile.path}\` was not hydrated.`,
					);
				assertArtifact(`${root}/${skill.id}/${supportFile.path}`, artifacts, [
					content.slice(0, 20),
				]);
			}
		}
	}
}

function assertInstructionBlocks(artifacts: Artifact[]): void {
	const agents = findArtifact("AGENTS.md", artifacts);
	if (agents.mode !== "block")
		throw new Error("AGENTS.md must be managed as a marked block artifact");
	const claude = findArtifact("CLAUDE.md", artifacts);
	if (claude.mode !== "block")
		throw new Error("CLAUDE.md must be managed as a marked block artifact");
}

function assertProvenanceMarkers(artifacts: Artifact[]): void {
	assertArtifact(".codex/config.toml", artifacts, [
		"#:schema https://developers.openai.com/codex/config-schema.json",
		"# >>> oal codex >>>",
		"# Source: config:codex",
		"# Regenerate: oal render",
		"# <<< oal codex <<<",
	]);
	const codexConfig = findArtifact(".codex/config.toml", artifacts);
	if (
		!codexConfig.content.startsWith(
			"#:schema https://developers.openai.com/codex/config-schema.json",
		)
	)
		throw new Error("Codex config schema comment must be first line");
	assertArtifact(".codex/requirements.toml", artifacts, [
		"# >>> oal codex >>>",
		"# Source: requirements:codex",
		"hooks = true",
		"[hooks]",
		'managed_dir = "__OAL_CODEX_MANAGED_HOOK_DIR__"',
		"[[hooks.PreToolUse]]",
		"OAL_HOOK_PROVIDER=codex",
		"OAL_HOOK_EVENT=PreToolUse",
		"__OAL_CODEX_MANAGED_HOOK_DIR__/enforce-rtk-commands.mjs",
		"# <<< oal codex <<<",
	]);
	assertArtifact(
		".codex/openagentlayer/codex-base-instructions.md",
		artifacts,
		[
			"Do not run tests, type checks, builds, simulator launches, browser automation, or full validation suites after every implementation step by default.",
			"OAL and RTK project surfaces",
			"rtk proxy -- <command>",
			"Code review and audits",
			"Unknown or potentially large command output must be bounded before it reaches context.",
		],
	);
	assertArtifact("opencode.jsonc", artifacts, [
		"// >>> oal opencode >>>",
		"// Source: config:opencode",
		"// Regenerate: oal render",
		"// <<< oal opencode <<<",
	]);
	assertArtifact(".opencode/plugins/openagentlayer.ts", artifacts, [
		'import type { Plugin } from "@opencode-ai/plugin"',
		"export const OpenAgentLayerPlugin",
	]);
	const hook = findArtifact(
		".codex/openagentlayer/hooks/block-destructive-commands.mjs",
		artifacts,
	);
	if (!hook.content.startsWith("#!/usr/bin/env node"))
		throw new Error("Codex hook shebang was not preserved");
	if (artifacts.some((artifact) => artifact.path.includes("/shim/")))
		throw new Error(
			"Codex default render should not emit PATH shim artifacts.",
		);
	const privileged = findArtifact(
		".codex/openagentlayer/runtime/privileged-exec.mjs",
		artifacts,
	);
	if (
		!(privileged.executable && privileged.content.includes("ALLOWED_COMMANDS"))
	)
		throw new Error("Privileged executable artifact is not executable");
}

function assertArtifact(
	path: string,
	artifacts: Artifact[],
	terms: readonly string[],
): void {
	const artifact = findArtifact(path, artifacts);
	for (const term of terms)
		if (!artifact.content.includes(term))
			throw new Error(`\`${path}\` missing contract term \`${term}\``);
}

function findArtifact(path: string, artifacts: Artifact[]): Artifact {
	const artifact = artifacts.find((candidate) => candidate.path === path);
	if (!artifact) throw new Error(`Missing generated artifact \`${path}\``);
	return artifact;
}

function assertDistinctAgentColors(artifacts: Artifact[]): void {
	const colors = new Map<string, string>();
	for (const agent of CORE_AGENTS) {
		const artifact = findArtifact(`.claude/agents/${agent}.md`, artifacts);
		const color = artifact.content.match(HEX_COLOR_PATTERN)?.[0];
		if (!color) throw new Error(`Agent \`${agent}\` missing hex color`);
		const owner = colors.get(color);
		if (owner)
			throw new Error(
				`Agents \`${owner}\` and \`${agent}\` share color \`${color}\`.`,
			);
		colors.set(color, agent);
	}
}

function assertNoUnsupportedCodexAgentFields(
	path: string,
	artifacts: Artifact[],
): void {
	const artifact = findArtifact(path, artifacts);
	if (CODEX_COLOR_PATTERN.test(artifact.content))
		throw new Error(`\`${path}\` emitted unsupported Codex color field`);
}

function assertNoForbiddenModels(artifacts: Artifact[]): void {
	for (const artifact of artifacts)
		for (const model of FORBIDDEN_MODEL_TERMS)
			if (artifact.content.includes(model))
				throw new Error(
					`\`${artifact.path}\` contains forbidden model \`${model}\`.`,
				);
}
