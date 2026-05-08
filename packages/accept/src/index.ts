import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderAllProviders } from "@openagentlayer/adapter";
import { compareArtifacts } from "@openagentlayer/artifact";
import {
	applyDeploy,
	exists,
	planDeploy,
	uninstall,
} from "@openagentlayer/deploy";
import { createManifest } from "@openagentlayer/manifest";
import {
	assertPolicyPass,
	validateGeneratedText,
	validateSourceGraph,
} from "@openagentlayer/policy";
import { assertRuntimeHooksExecutable } from "@openagentlayer/runtime";
import { loadSource, type Provider } from "@openagentlayer/source";
import { assertGeneratedArtifactContracts } from "./artifacts";
import { assertCheckboxDiscipline } from "./checkboxes";
import { assertCiCdWorkflow } from "./ci";
import { assertCliContracts } from "./cli";
import { assertCodebaseShape } from "./codebase-shape";
import {
	assertBackupsCreated,
	assertMarkedBlocksInstalled,
	assertRenderedConfigs,
	assertUserBlocksPreservedAfterUninstall,
	assertUserConfigPreservedAfterUninstall,
	seedUserFiles,
} from "./fixture";
import { assertHomebrewCask } from "./homebrew";
import { assertHooks } from "./hooks";
import { assertInstalledFlowSmoke } from "./install-smoke";
import { assertRepositoryInventory } from "./inventory";
import { assertMessageStyle } from "./message-style";
import { assertPluginMarketplace } from "./plugins";
import { assertProviderConfigContracts } from "./provider";
import { assertRoadmapEvidence, buildRoadmapEvidence } from "./roadmap";
import { assertStrictRoadmapChecks } from "./roadmap-strict";
import { assertRtkGainPolicyFixtures } from "./rtk";
import {
	assertAuthoredMarkdownStyle,
	assertHookScriptsAreRuntimeOwned,
	assertNegativePolicyFixtures,
	assertNoLegacyCommandAlias,
	assertRoadmapSource,
	assertSourceInventory,
} from "./source";
import { assertTestInventory } from "./tests";
import { assertOpenCodeTools, assertSkillSupportFiles } from "./tools";
import { assertVersionBumpTool } from "./version";

export interface AcceptanceReport {
	status: "PASS";
	targetRoot: string;
	artifacts: number;
}

export async function runAcceptance(
	repoRoot: string,
): Promise<AcceptanceReport> {
	const graph = await loadSource(join(repoRoot, "source"));
	assertPolicyPass(validateSourceGraph(graph));
	await assertSourceInventory(repoRoot);
	await assertNoLegacyCommandAlias(repoRoot);
	await assertAuthoredMarkdownStyle(repoRoot);
	await assertCheckboxDiscipline(repoRoot);
	await assertRepositoryInventory(repoRoot);
	await assertCodebaseShape(repoRoot);
	await assertMessageStyle(repoRoot);
	await assertHomebrewCask(repoRoot);
	await assertCiCdWorkflow(repoRoot);
	await assertPluginMarketplace(repoRoot, graph.source);
	await assertVersionBumpTool(repoRoot);
	assertRtkGainPolicyFixtures();
	await assertTestInventory(repoRoot);
	assertRoadmapSource(graph.source);
	assertHookScriptsAreRuntimeOwned(graph.source);
	assertNegativePolicyFixtures(graph.source);
	await assertCliContracts(repoRoot);
	await assertInstalledFlowSmoke(repoRoot);
	assertRoadmapEvidence(await buildRoadmapEvidence(repoRoot));
	await assertRuntimeHooksExecutable(repoRoot);
	const rendered = await renderAllProviders(graph.source, repoRoot);
	if (rendered.artifacts.length < 100)
		throw new Error(
			`Expected substantial provider output, got ${rendered.artifacts.length} artifacts.`,
		);
	assertGeneratedArtifactContracts(graph.source, rendered.artifacts);
	assertStrictRoadmapChecks({
		source: graph.source,
		artifacts: rendered.artifacts,
	});
	for (const artifact of rendered.artifacts) {
		const issues = validateGeneratedText(artifact.path, artifact.content);
		if (issues.length > 0)
			throw new Error(issues.map((issue) => issue.message).join("\n"));
	}
	assertManifestDepth(
		rendered.artifacts.length,
		createManifest(rendered.artifacts).entries.length,
	);
	const targetRoot = await mkdtemp(join(tmpdir(), "oal-accept-"));
	await seedUserFiles(targetRoot);
	const plan = await planDeploy(targetRoot, rendered.artifacts);
	await applyDeploy(plan);
	await assertRenderedConfigs(targetRoot);
	await assertProviderConfigContracts(targetRoot);
	await assertMarkedBlocksInstalled(targetRoot);
	await assertBackupsCreated(targetRoot);
	await assertHooks(targetRoot, graph.source);
	await assertOpenCodeTools(targetRoot);
	await assertSkillSupportFiles(targetRoot, graph.source);
	const comparableArtifacts = rendered.artifacts.filter(
		(artifact) => artifact.mode === "file",
	);
	const driftBefore = await compareArtifacts(targetRoot, comparableArtifacts);
	if (driftBefore.length > 0)
		throw new Error(`Fresh deploy drifted: \`${driftBefore.join(", ")}\``);
	await writeFile(
		join(targetRoot, comparableArtifacts[0]?.path ?? "missing"),
		"manual edit\n",
	);
	const driftAfter = await compareArtifacts(targetRoot, comparableArtifacts);
	if (driftAfter.length === 0)
		throw new Error("Drift check failed to detect hand edit");
	await applyDeploy(plan);
	for (const provider of ["codex", "claude", "opencode"] satisfies Provider[])
		await uninstall(targetRoot, provider);
	for (const artifact of rendered.artifacts.filter(
		(candidate) => candidate.mode === "file",
	))
		if (await exists(join(targetRoot, artifact.path)))
			throw new Error(`Uninstall left owned artifact: \`${artifact.path}\``);
	await assertUserConfigPreservedAfterUninstall(targetRoot);
	await assertUserBlocksPreservedAfterUninstall(targetRoot);
	await rm(targetRoot, { recursive: true, force: true });
	return { status: "PASS", targetRoot, artifacts: rendered.artifacts.length };
}

function assertManifestDepth(artifactCount: number, entryCount: number): void {
	if (artifactCount !== entryCount)
		throw new Error("Manifest does not track every artifact");
}

export { buildRoadmapEvidence, renderRoadmapEvidenceMarkdown } from "./roadmap";
export { assertRtkGainThreshold, evaluateRtkGainOutput } from "./rtk";
