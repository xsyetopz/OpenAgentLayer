import { relative } from "node:path";
import type { AdapterArtifact } from "@openagentlayer/adapter-contract";
import { sha256 } from "./json";
import { getManagedBlockId } from "./managed-block";
import {
	flattenManagedValues,
	parseStructuredContent,
} from "./structured-config";
import type {
	ManagedManifest,
	ManagedManifestEntry,
	ManifestReadResult,
} from "./types";

export async function createManifestEntry(
	artifact: AdapterArtifact,
	content = artifact.content,
): Promise<ManagedManifestEntry> {
	const installMode = artifact.installMode ?? "full-file";
	return {
		path: artifact.path,
		sha256: await sha256(content),
		artifactKind: artifact.kind,
		installMode,
		...(installMode === "marked-text-block"
			? {
					blockContent: artifact.content.trimEnd(),
					managedBlockId: `${artifact.surface}:${getManagedBlockId(artifact)}`,
				}
			: {}),
		...(installMode === "structured-object"
			? {
					managedValues: flattenManagedValues(
						parseStructuredContent(artifact.path, artifact.content),
					),
				}
			: {}),
		sourceRecordIds: artifact.sourceRecordIds,
	};
}

export async function readOptionalManifest(
	manifestPath: string,
): Promise<ManagedManifest | undefined> {
	if (!(await Bun.file(manifestPath).exists())) {
		return undefined;
	}
	try {
		return JSON.parse(await Bun.file(manifestPath).text()) as ManagedManifest;
	} catch {
		return undefined;
	}
}

export async function readManifest(
	manifestPath: string,
	targetRoot: string,
): Promise<ManifestReadResult> {
	try {
		return {
			issues: [],
			manifest: JSON.parse(
				await Bun.file(manifestPath).text(),
			) as ManagedManifest,
		};
	} catch (error) {
		return {
			issues: [
				{
					code: "invalid-manifest",
					message: error instanceof Error ? error.message : String(error),
					path: relative(targetRoot, manifestPath),
				},
			],
		};
	}
}
