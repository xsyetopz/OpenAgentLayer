import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { applyInstallPlan } from "@openagentlayer/install";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import { createFixtureRoot } from "@openagentlayer/testkit";

export async function createInstallFixture() {
	const sourceResult = await loadSourceGraph(process.cwd());
	if (sourceResult.graph === undefined) {
		throw new Error("Expected graph.");
	}
	const targetRoot = await createFixtureRoot();
	const registry = createAdapterRegistry();
	return {
		targetRoot,
		claudeBundle: registry.renderSurfaceBundle(sourceResult.graph, "claude"),
		codexBundle: registry.renderSurfaceBundle(sourceResult.graph, "codex"),
		opencodeBundle: registry.renderSurfaceBundle(
			sourceResult.graph,
			"opencode",
		),
	};
}

export async function createInstalledCodexFixture() {
	const fixture = await createInstallFixture();
	await applyInstallPlan({
		bundle: fixture.codexBundle,
		scope: "project",
		targetRoot: fixture.targetRoot,
	});
	return fixture;
}

export async function writeManagedNeighbor(
	targetRoot: string,
): Promise<string> {
	const neighborPath = join(targetRoot, ".codex/openagentlayer/user-note.txt");
	await mkdir(join(targetRoot, ".codex/openagentlayer"), { recursive: true });
	await writeFile(neighborPath, "keep\n");
	return neighborPath;
}

export async function writeForgedManifestFixture(): Promise<{
	readonly externalVictim: string;
	readonly localManagedFile: string;
	readonly targetRoot: string;
}> {
	const targetRoot = await createFixtureRoot();
	const forgedTargetRoot = await createFixtureRoot();
	const externalVictim = join(forgedTargetRoot, "victim.txt");
	const localManagedFile = join(targetRoot, "victim.txt");
	const manifestPath = join(targetRoot, ".oal/manifest/codex-project.json");

	await mkdir(join(targetRoot, ".oal/manifest"), { recursive: true });
	await writeFile(externalVictim, "external\n");
	await writeFile(localManagedFile, "local\n");
	await writeFile(
		manifestPath,
		JSON.stringify({
			entries: [
				{
					artifactKind: "config",
					path: "victim.txt",
					sha256: "forged",
					sourceRecordIds: [],
				},
			],
			generatedAt: "deterministic",
			scope: "project",
			surface: "codex",
			targetRoot: forgedTargetRoot,
		}),
	);

	return { externalVictim, localManagedFile, targetRoot };
}

export async function readManifestEntryPaths(
	manifestPath: string,
): Promise<readonly string[]> {
	const manifest = JSON.parse(await Bun.file(manifestPath).text()) as {
		readonly entries: readonly { readonly path: string }[];
	};
	return manifest.entries.map((entry) => entry.path);
}
