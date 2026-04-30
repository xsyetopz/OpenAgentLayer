import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AdapterArtifact } from "@openagentlayer/adapter-contract";
import { readExistingText } from "./filesystem";
import { stableJson } from "./json";
import { createManifestEntry, readOptionalManifest } from "./manifest";
import { mergeArtifactContent } from "./merge";
import { getManifestPath, resolveManagedPath } from "./paths";
import type {
	InstallRequest,
	InstallResult,
	ManagedManifest,
	PlannedInstallWrite,
	PreparedInstallPlan,
} from "./types";

export async function createInstallPlan(
	request: InstallRequest,
): Promise<ManagedManifest> {
	return {
		surface: request.bundle.surface,
		scope: request.scope,
		targetRoot: resolve(request.targetRoot),
		generatedAt: "deterministic",
		entries: await Promise.all(
			request.bundle.artifacts.map((artifact) => {
				resolveManagedPath(request.targetRoot, artifact.path);
				return createManifestEntry(artifact);
			}),
		),
	};
}

export async function applyInstallPlan(
	request: InstallRequest,
): Promise<InstallResult> {
	return await applyPreparedInstallPlan(await prepareInstallPlan(request));
}

export async function prepareInstallPlan(
	request: InstallRequest,
): Promise<PreparedInstallPlan> {
	const targetRoot = resolve(request.targetRoot);
	const previousManifest = await readOptionalManifest(
		getManifestPath(targetRoot, request.bundle.surface, request.scope),
	);
	const plannedWrites = await Promise.all(
		request.bundle.artifacts.map((artifact) =>
			planInstallWrite({
				artifact,
				previousManifest,
				targetRoot,
			}),
		),
	);
	const manifest: ManagedManifest = {
		surface: request.bundle.surface,
		scope: request.scope,
		targetRoot,
		generatedAt: "deterministic",
		entries: plannedWrites.map((write) => write.entry),
	};
	return { manifest, writes: plannedWrites };
}

export async function applyPreparedInstallPlan(
	prepared: PreparedInstallPlan,
): Promise<InstallResult> {
	const { manifest } = prepared;
	const writtenFiles: string[] = [];
	for (const write of prepared.writes) {
		const targetPath = write.targetPath;
		await mkdir(dirname(targetPath), { recursive: true });
		await writeFile(targetPath, write.content);
		writtenFiles.push(targetPath);
	}

	const manifestPath = getManifestPath(
		manifest.targetRoot,
		manifest.surface,
		manifest.scope,
	);
	await mkdir(dirname(manifestPath), { recursive: true });
	await writeFile(manifestPath, `${stableJson(manifest)}\n`);
	writtenFiles.push(manifestPath);

	return { manifest, writtenFiles };
}

async function planInstallWrite({
	artifact,
	previousManifest,
	targetRoot,
}: {
	readonly artifact: AdapterArtifact;
	readonly previousManifest: ManagedManifest | undefined;
	readonly targetRoot: string;
}): Promise<PlannedInstallWrite> {
	const targetPath = resolveManagedPath(targetRoot, artifact.path);
	const installMode = artifact.installMode ?? "full-file";
	const previousEntry = previousManifest?.entries.find(
		(entry) => entry.path === artifact.path,
	);
	const existingContent = await readExistingText(targetPath);
	const content = mergeArtifactContent({
		artifact,
		existingContent,
		installMode,
		previousEntry,
	});
	const entry = await createManifestEntry(artifact, content);
	return { artifact, content, entry, targetPath };
}
