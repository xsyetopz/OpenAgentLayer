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
	"Success criteria:",
	"Ordered steps:",
	"Ambiguity behavior:",
	"Evidence contract:",
	"Standards contract:",
	"Structure contract:",
	"Markdown contract:",
	"Attribution contract:",
	"Source-backed behaviour is mandatory",
	"Source Evidence Map",
	"A confident guess is failure",
	"Simplicity discipline",
	"RTK efficiency:",
	"Response boundaries:",
	"Triggers:",
	"Do not use for:",
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
	"Source-backed behaviour is mandatory",
	"Source Evidence Map",
	"A confident guess is failure",
	"Simplicity discipline",
	"RTK efficiency:",
	"Response boundaries:",
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
		assertArtifact(
			`.codex/agents/${agent}.toml`,
			artifacts,
			AGENT_CONTRACT_TERMS,
		);
		assertArtifact(
			`.claude/agents/${agent}.md`,
			artifacts,
			AGENT_CONTRACT_TERMS,
		);
		assertArtifact(
			`.opencode/agents/${agent}.md`,
			artifacts,
			AGENT_CONTRACT_TERMS,
		);
	}
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
	for (const route of REQUIRED_ROUTES)
		if (!codexInstructions.content.includes(`- ${route}:`))
			throw new Error(`Codex AGENTS.md missing route ${route}.`);
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
						`Skill support file ${skill.id}/${supportFile.path} was not hydrated.`,
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
		throw new Error("AGENTS.md must be managed as a marked block artifact.");
	const claude = findArtifact("CLAUDE.md", artifacts);
	if (claude.mode !== "block")
		throw new Error("CLAUDE.md must be managed as a marked block artifact.");
}

function assertProvenanceMarkers(artifacts: Artifact[]): void {
	assertArtifact(".codex/config.toml", artifacts, [
		"# >>> oal codex >>>",
		"# Source: config:codex",
		"# Regenerate: oal render",
		"# <<< oal codex <<<",
	]);
	assertArtifact("opencode.jsonc", artifacts, [
		"// >>> oal opencode >>>",
		"// Source: config:opencode",
		"// Regenerate: oal render",
		"// <<< oal opencode <<<",
	]);
	const hook = findArtifact(
		".codex/openagentlayer/hooks/block-destructive-commands.mjs",
		artifacts,
	);
	if (!hook.content.startsWith("#!/usr/bin/env node"))
		throw new Error("Codex hook shebang was not preserved.");
}

function assertArtifact(
	path: string,
	artifacts: Artifact[],
	terms: readonly string[],
): void {
	const artifact = findArtifact(path, artifacts);
	for (const term of terms)
		if (!artifact.content.includes(term))
			throw new Error(`${path} missing contract term ${term}`);
}

function findArtifact(path: string, artifacts: Artifact[]): Artifact {
	const artifact = artifacts.find((candidate) => candidate.path === path);
	if (!artifact) throw new Error(`Missing generated artifact ${path}`);
	return artifact;
}
