import type { Artifact } from "@openagentlayer/artifact";
import type { OalSource } from "@openagentlayer/source";

export interface StrictRoadmapCheck {
	id: string;
	description: string;
	evidence: string[];
	verify(context: StrictRoadmapContext): void;
}

export interface StrictRoadmapContext {
	source: OalSource;
	artifacts: Artifact[];
}

const REQUIRED_CODEX_FLAGS = [
	"steer = true",
	"apps = false",
	"tui_app_server = true",
	"memories = true",
	"sqlite = true",
	"plugins = true",
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
const EXPANDED_AGENTS = [
	"apollo",
	"aphrodite",
	"daedalus",
	"hestia",
	"demeter",
	"hecate",
	"chronos",
	"asclepius",
	"themis",
	"artemis",
	"ares",
	"prometheus",
	"mnemosyne",
	"dionysus",
	"janus",
	"morpheus",
] as const;

export const STRICT_ROADMAP_CHECKS: StrictRoadmapCheck[] = [
	{
		id: "codex-capability-profile",
		description:
			"Codex capability flags, controlled exclusions, replacement values, and model routes are rendered",
		evidence: [
			"packages/adapter/src/codex.ts",
			"packages/accept/src/provider.ts",
		],
		verify: ({ artifacts }) => {
			const config = artifact(".codex/config.toml", artifacts).content;
			requireIncludes(
				config,
				"#:schema https://developers.openai.com/codex/config-schema.json",
				"Codex config",
			);
			for (const flag of REQUIRED_CODEX_FLAGS)
				requireIncludes(config, flag, "Codex config");
			for (const model of ["gpt-5.5", "gpt-5.4-mini", "gpt-5.3-codex"])
				requireIncludes(config, model, "Codex config");
			rejectIncludes(config, "zsh_path", "Codex config");
			requireIncludes(
				config,
				'approvals_reviewer = "auto_review"',
				"Codex config",
			);
			requireIncludes(
				config,
				'model_instructions_file = "./openagentlayer/codex-base-instructions.md"',
				"Codex config",
			);
			requireIncludes(config, "max_depth = 1", "Codex config");
			requireIncludes(
				config,
				"max_concurrent_threads_per_session = 4",
				"Codex config",
			);
			requireIncludes(config, "job_max_runtime_seconds = 600", "Codex config");
			for (const forbidden of [
				`${["gpt", "5", "3", "codex"].join("-")}-spark`,
				'approval_policy = "on-failure"',
				["guardian", "subagent"].join("_"),
			])
				rejectIncludes(config, forbidden, "Codex config");
			const requirements = artifact(
				".codex/requirements.toml",
				artifacts,
			).content;
			requireIncludes(requirements, "[features]", "Codex requirements");
			requireIncludes(requirements, "hooks = true", "Codex requirements");
			requireIncludes(requirements, "[hooks]", "Codex requirements");
			requireIncludes(
				requirements,
				'managed_dir = "__OAL_CODEX_MANAGED_HOOK_DIR__"',
				"Codex requirements",
			);
			requireIncludes(
				requirements,
				"__OAL_CODEX_MANAGED_HOOK_DIR__/enforce-rtk-commands.mjs",
				"Codex requirements",
			);
			requireIncludes(
				requirements,
				"OAL_HOOK_PROVIDER=codex",
				"Codex requirements",
			);
			requireIncludes(
				requirements,
				"OAL_HOOK_EVENT=PreToolUse",
				"Codex requirements",
			);
			rejectIncludes(requirements, "codex_hooks", "Codex requirements");
			const baseInstructions = artifact(
				".codex/openagentlayer/codex-base-instructions.md",
				artifacts,
			).content;
			requireIncludes(
				baseInstructions,
				"Do not run tests, type checks, builds, simulator launches, browser automation, or full validation suites after every implementation step by default.",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"## OAL and RTK project surfaces",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"rtk proxy -- <command>",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"## OAL parent-session quota guard",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"oal codex-usage --project <path>",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"session-complete\nhandoff",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"COMPLETE-complete",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"## Code review and audits",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"Keep review output findings-only\nand bounded",
				"Codex base instructions",
			);
			requireIncludes(
				baseInstructions,
				"Unknown or potentially large command output must be bounded before it reaches context.",
				"Codex base instructions",
			);
		},
	},
	{
		id: "provider-native-configs",
		description:
			"Provider-native config surfaces exist and contain provider-specific native keys",
		evidence: [
			"packages/adapter/src/codex.ts",
			"packages/adapter/src/claude.ts",
			"packages/adapter/src/opencode.ts",
		],
		verify: ({ artifacts }) => {
			requireIncludes(
				artifact(".claude/settings.json", artifacts).content,
				"permissions",
				"Claude settings",
			);
			requireIncludes(
				artifact(".claude/settings.json", artifacts).content,
				"hooks",
				"Claude settings",
			);
			const opencode = artifact("opencode.jsonc", artifacts).content;
			for (const key of [
				"permission",
				"plugin",
				"command",
				"agent",
				"default_agent",
			])
				requireIncludes(opencode, key, "OpenCode config");
		},
	},
	{
		id: "runtime-hook-family",
		description:
			"Runtime hook family is represented by source records and generated executable scripts",
		evidence: [
			"source/hooks",
			"packages/runtime/hooks",
			"packages/accept/src/hooks.ts",
		],
		verify: ({ source, artifacts }) => {
			for (const hook of source.hooks) {
				for (const path of hook.providers.map((provider) =>
					hookPath(provider, hook.script),
				))
					requireArtifact(path, artifacts);
			}
		},
	},
	{
		id: "expanded-agent-rendering",
		description:
			"Expanded agents are not decorative; they are source records rendered for each provider",
		evidence: ["source/agents", "packages/accept/src/artifacts.ts"],
		verify: ({ source, artifacts }) => {
			for (const agent of EXPANDED_AGENTS) {
				if (!source.agents.some((record) => record.id === agent))
					throw new Error(`Missing expanded source agent \`${agent}\``);
				for (const path of [
					`.codex/agents/${agent}.toml`,
					`.claude/agents/${agent}.md`,
					`.opencode/agents/${agent}.md`,
				])
					requireArtifact(path, artifacts);
			}
		},
	},
	{
		id: "deploy-ownership-surfaces",
		description:
			"Rendered artifacts include full-file, config, block, executable hook, and skill support ownership modes",
		evidence: [
			"packages/manifest/src/index.ts",
			"packages/deploy/src",
			"packages/accept/src/fixture.ts",
		],
		verify: ({ artifacts }) => {
			if (
				!artifacts.some(
					(entry) => entry.mode === "block" && entry.path === "AGENTS.md",
				)
			)
				throw new Error("Missing marked-block AGENTS.md artifact");
			if (
				!artifacts.some(
					(entry) =>
						entry.mode === "config" && entry.path === ".codex/config.toml",
				)
			)
				throw new Error("Missing structured Codex config artifact");
			if (
				!artifacts.some(
					(entry) => entry.executable && entry.path.endsWith(".mjs"),
				)
			)
				throw new Error("Missing executable hook artifact");
			if (
				!artifacts.some(
					(entry) =>
						entry.path.includes("/references/") ||
						entry.path.includes("/scripts/"),
				)
			)
				throw new Error("Missing skill support artifact");
		},
	},
];

export function assertStrictRoadmapChecks(context: StrictRoadmapContext): void {
	for (const check of STRICT_ROADMAP_CHECKS) check.verify(context);
}

export function strictRoadmapEvidenceLines(): string[] {
	return STRICT_ROADMAP_CHECKS.map(
		(check) => `- STRICT ${check.id}: ${check.evidence.join("; ")}`,
	);
}

function artifact(path: string, artifacts: Artifact[]): Artifact {
	const found = artifacts.find((entry) => entry.path === path);
	if (!found) throw new Error(`Missing artifact \`${path}\``);
	return found;
}

function requireArtifact(path: string, artifacts: Artifact[]): void {
	artifact(path, artifacts);
}

function hookPath(provider: string, script: string): string {
	if (provider === "codex") return `.codex/openagentlayer/hooks/${script}`;
	if (provider === "claude") return `.claude/hooks/scripts/${script}`;
	return `.opencode/openagentlayer/hooks/${script}`;
}

function requireIncludes(content: string, term: string, label: string): void {
	if (!content.includes(term))
		throw new Error(`\`${label}\` missing \`${term}\``);
}

function rejectIncludes(content: string, term: string, label: string): void {
	if (content.includes(term))
		throw new Error(`\`${label}\` contains forbidden \`${term}\``);
}
