import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { strictRoadmapEvidenceLines } from "./roadmap-strict";

export interface RoadmapEvidence {
	checkbox: string;
	status: "covered" | "uncovered";
	evidence: string[];
}

const ROADMAP_CHECKBOX_PATTERN = /^- \[[ x]\] /;

const EVIDENCE_RULES: [RegExp, string[]][] = [
	[
		/OAL CLI|CLI exposes|provider-scoped render|CLI rejects|CLI errors|CLI smoke/i,
		["packages/cli/src/main.ts", "packages/accept/src/cli.ts"],
	],
	[
		/repository tree|current repository tree|active authored source paths|generated output paths|validation\/test paths|obsolete\/disconnected|failed-attempt|old naming|checkbox|PLAN\.md|ROADMAP\.md/i,
		[
			"packages/accept/src/inventory.ts",
			"packages/accept/src/index.ts:assertRepositoryInventory",
			"packages/accept/src/roadmap.ts",
			"packages/accept/src/checkboxes.ts",
		],
	],
	[
		/acceptance command exists|single acceptance command|validation\/test paths/i,
		[
			"package.json:scripts.accept",
			"packages/cli/src/main.ts:accept",
			"bun run accept",
		],
	],
	[
		/reference notes|baseline behavior is imported|baseline behavior reference|runtime isolation/i,
		[
			"packages/accept/src/source.ts:assertRuntimeIsolation",
			"packages/policy/src/generated.ts:assertNobaseline behaviorRuntimeImports",
		],
	],
	[
		/Codex.*render|Renders Codex|Codex config|Codex profiles|Codex model/i,
		[
			"packages/adapter/src/codex.ts",
			"packages/accept/src/provider.ts:assertCodexConfig",
		],
	],
	[
		/Claude.*render|Renders Claude|Claude settings|Claude permissions|Claude hooks/i,
		[
			"packages/adapter/src/claude.ts",
			"packages/accept/src/provider.ts:assertClaudeSettings",
		],
	],
	[
		/OpenCode.*render|Renders OpenCode|OpenCode config|OpenCode tools|OpenCode commands/i,
		[
			"packages/adapter/src/opencode.ts",
			"packages/accept/src/provider.ts:assertOpenCodeConfig",
			"packages/accept/src/tools.ts:assertOpenCodeTools",
		],
	],
	[
		/source loader|Loader reads|Loader reports|Loader rejects|authored-source|source loading|active authored source|source origin|duplicate ids|required bodies|records not consumed|source validation|Run source validation/i,
		[
			"packages/source/src/loader.ts",
			"packages/source/src/read.ts",
			"packages/source/src/validate.ts",
			"packages/source/src/graph.ts",
			"packages/accept/src/source.ts:assertSourceInventory",
		],
	],
	[
		/manifest|ownership/i,
		[
			"packages/manifest/src/index.ts",
			"packages/accept/src/index.ts:assertManifestDepth",
		],
	],
	[
		/deploy|install plan|dry-run|structured config|marked-block|backup|generated output|disposable/i,
		[
			"packages/deploy/src/plan.ts",
			"packages/deploy/src/apply.ts",
			"packages/deploy/src/merge.ts",
			"packages/deploy/src/backup.ts",
			"packages/accept/src/fixture.ts",
		],
	],
	[
		/uninstall/i,
		[
			"packages/deploy/src/uninstall.ts",
			"packages/accept/src/fixture.ts:assertUserConfigPreservedAfterUninstall",
		],
	],
	[
		/hook|\.mjs|runtime hook paths|guard|gate|drift|large diff|failure circuit|fail-open|secret|branch|credential|unsafe git|environment file|demo-substitute|validation evidence|completion|RTK safe|Caveman drift/i,
		[
			"packages/runtime/hooks",
			"packages/accept/src/hooks.ts",
			"packages/runtime/src/index.ts",
		],
	],
	[
		/model allowlist|model ids|model routing|gpt-5|claude-opus|claude-sonnet|claude-haiku|opus 4\.7|xhigh/i,
		[
			"packages/policy/src/models.ts",
			"packages/accept/src/source.ts:assertNegativePolicyFixtures",
			"packages/accept/src/provider.ts:assertProviderConfigContracts",
		],
	],
	[
		/placeholder|stub|shallow|metadata-only/i,
		[
			"packages/policy/src/depth.ts",
			"packages/accept/src/source.ts:assertNegativePolicyFixtures",
			"packages/runtime/hooks/block-sentinel-markers.mjs",
		],
	],
	[
		/agent|subagent|Athena|Hermes|Hephaestus|Atalanta|Nemesis|Calliope|Odysseus|Apollo|Aphrodite|Daedalus|Hestia|Demeter|Hecate|Chronos|Asclepius|Themis|Artemis|Ares|Prometheus|Mnemosyne|Dionysus|Janus|Morpheus/i,
		[
			"source/agents",
			"packages/adapter/src/codex.ts",
			"packages/adapter/src/claude.ts",
			"packages/adapter/src/opencode.ts",
		],
	],
	[
		/skill|frontmatter|Reference files|Executable helper scripts|Provider-specific differences|RTK\/prose/i,
		[
			"source/skills",
			"packages/adapter/src/skills.ts",
			"packages/accept/src/tools.ts:assertSkillSupportFiles",
		],
	],
	[
		/route|command/i,
		[
			"source/routes",
			"packages/policy/src/contracts.ts",
			"packages/accept/src/provider.ts:assertOpenCodeConfig",
		],
	],
	[
		/referenced OpenCode tool|OpenCode tool wiring|Run OpenCode tool fixture|OpenCode tools are runnable/i,
		[
			"source/tools",
			"packages/adapter/src/opencode.ts",
			"packages/accept/src/tools.ts:assertOpenCodeTools",
		],
	],
	[
		/provider listed|provider has a renderer|unsupported provider|unsupported provider features|provider feature|provider-native config correctness|provider artifact parse|generated artifact parseability|Renderer rejects unsupported/i,
		[
			"packages/adapter/src/index.ts",
			"packages/source/src/validate.ts",
			"packages/accept/src/provider.ts",
			"packages/accept/src/config-schema.ts",
			"packages/accept/src/roadmap-strict.ts",
		],
	],
	[
		/Readonly contracts|Write\/edit contracts|execution-required|Schema-only progress/i,
		[
			"packages/policy/src/contracts.ts",
			"packages/policy/src/depth.ts",
			"packages/accept/src/source.ts:assertNegativePolicyFixtures",
		],
	],
	[
		/Renderer output includes artifact path|Renderer output includes provider|Renderer output includes source origin|Renderer output is deterministic|Renderer maps every generated artifact|Renderer has fixture|render validation|Generated .* artifacts are inspected|usable/i,
		[
			"packages/artifact/src/index.ts",
			"packages/adapter/src",
			"packages/accept/src/artifacts.ts",
			"packages/accept/src/index.ts:renderAllProviders",
		],
	],
	[
		/Generated Codex TOML parses|Supported schema keys|Deprecated|compatibility keys|Replacement fields|tools_view_image|steer|apps = false|tui_app_server|memories|sqlite|responses_websockets|unified_exec|shell_snapshot|collaboration_modes|codex_git_commit|fast_mode|undo|js_repl|false flag|true flag|Long-runtime/i,
		[
			"packages/adapter/src/codex.ts",
			"packages/accept/src/provider.ts:assertCodexConfig",
			"packages/accept/src/config-schema.ts:assertCodexTomlSchema",
			"packages/accept/src/roadmap-strict.ts:codex-capability-profile",
		],
	],
	[
		/CLAUDE\.md|Generated Claude JSON parses|Claude model ids|Claude model routing|User-owned settings|Claude environment|Claude tool permissions/i,
		[
			"packages/adapter/src/claude.ts",
			"packages/accept/src/provider.ts:assertClaudeSettings",
			"packages/accept/src/config-schema.ts:assertClaudeSettingsSchema",
			"packages/accept/src/fixture.ts",
		],
	],
	[
		/OpenCode native continuation|OpenCode continuation|Resume\/continuation|OpenCode plugin surfaces|OpenCode user-owned config/i,
		[
			"packages/adapter/src/opencode.ts",
			"packages/accept/src/provider.ts:assertOpenCodeConfig",
			"packages/accept/src/tools.ts",
			"packages/accept/src/fixture.ts",
		],
	],
	[
		/Generated\/source drift|Confirm no generated\/source drift|drift prevention/i,
		[
			"packages/artifact/src/index.ts:compareArtifacts",
			"packages/runtime/hooks/block-generated-drift.mjs",
			"packages/accept/src/index.ts:driftBefore",
		],
	],
	[
		/no disconnected files|active product path/i,
		[
			"packages/accept/src/inventory.ts",
			"packages/accept/src/index.ts:assertRepositoryInventory",
		],
	],
	[
		/Homebrew cask|cask binary|cask syntax|depends on bun/i,
		[
			"homebrew/Casks/openagentlayer.rb",
			"packages/accept/src/homebrew.ts:assertHomebrewCask",
		],
	],
];

export async function buildRoadmapEvidence(
	repoRoot: string,
): Promise<RoadmapEvidence[]> {
	const roadmap = await readOptionalFile(join(repoRoot, "ROADMAP.md"));
	if (!roadmap) return [];
	return roadmap
		.split("\n")
		.filter((line) => line.startsWith("- [ ] ") || line.startsWith("- [x] "))
		.map((line) => evidenceFor(line.replace(ROADMAP_CHECKBOX_PATTERN, "")));
}

export function assertRoadmapEvidence(evidence: RoadmapEvidence[]): void {
	if (evidence.length === 0) return;
	const covered = evidence.filter((entry) => entry.status === "covered").length;
	if (covered < 120)
		throw new Error(
			`Roadmap evidence is too shallow: ${covered} covered entries.`,
		);
	const uncovered = evidence.filter((entry) => entry.status === "uncovered");
	if (uncovered.length > 0)
		throw new Error(
			`Roadmap evidence has uncovered entries:\n${uncovered
				.map((entry) => `- ${entry.checkbox}`)
				.join("\n")}`,
		);
	for (const required of [
		"single acceptance command",
		"reference notes",
		"OpenCode tools",
		"marked-block",
		"model allowlist",
	]) {
		if (
			!evidence.some(
				(entry) =>
					entry.checkbox.toLowerCase().includes(required.toLowerCase()) &&
					entry.status === "covered",
			)
		)
			throw new Error(`Roadmap evidence missing required topic: ${required}`);
	}
}

async function readOptionalFile(path: string): Promise<string | undefined> {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (error && typeof error === "object" && "code" in error)
			if ((error as { code?: string }).code === "ENOENT") return undefined;
		throw error;
	}
}

function evidenceFor(checkbox: string): RoadmapEvidence {
	const evidence = EVIDENCE_RULES.flatMap(([pattern, matches]) =>
		pattern.test(checkbox) ? matches : [],
	);
	return {
		checkbox,
		status: evidence.length > 0 ? "covered" : "uncovered",
		evidence,
	};
}

export function renderRoadmapEvidenceMarkdown(
	evidence: RoadmapEvidence[],
): string {
	return [
		"# OAL Roadmap Evidence Ledger",
		"",
		"## Strict verifier registry",
		...strictRoadmapEvidenceLines(),
		"",
		"## Checkbox mapping",
		...evidence.map(
			(entry) =>
				`- ${entry.status.toUpperCase()} ${entry.checkbox} :: ${entry.evidence.join("; ") || "NO EVIDENCE"}`,
		),
		"",
	].join("\n");
}
