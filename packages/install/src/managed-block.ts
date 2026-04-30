import type { AdapterArtifact } from "@openagentlayer/adapter-contract";
import type { ManagedManifestEntry } from "./types";

export function getManagedBlockId(artifact: AdapterArtifact): string {
	return artifact.managedBlockId ?? `${artifact.surface}-${artifact.kind}`;
}

export function getManagedBlockMarkers(artifact: AdapterArtifact): {
	readonly start: string;
	readonly end: string;
} {
	const blockId = getManagedBlockId(artifact);
	return {
		start: `<!-- BEGIN OPENAGENTLAYER:${artifact.surface}:${blockId} -->`,
		end: `<!-- END OPENAGENTLAYER:${artifact.surface}:${blockId} -->`,
	};
}

export function getManifestBlockMarkers(entry: ManagedManifestEntry): {
	readonly start: string;
	readonly end: string;
} {
	const blockId = entry.managedBlockId ?? `${entry.path}`;
	return {
		start: `<!-- BEGIN OPENAGENTLAYER:${blockId} -->`,
		end: `<!-- END OPENAGENTLAYER:${blockId} -->`,
	};
}

export function renderManagedBlock(artifact: AdapterArtifact): string {
	const markers = getManagedBlockMarkers(artifact);
	return [markers.start, artifact.content.trimEnd(), markers.end].join("\n");
}

export function findManagedBlock(
	content: string,
	entry: ManagedManifestEntry,
): string | undefined {
	const range = findManagedBlockRange(content, entry);
	return range === undefined
		? undefined
		: content.slice(range.contentStart, range.contentEnd);
}

export function findManagedBlockRange(
	content: string,
	entry: ManagedManifestEntry,
):
	| {
			readonly start: number;
			readonly end: number;
			readonly contentStart: number;
			readonly contentEnd: number;
	  }
	| undefined {
	const markers = getManifestBlockMarkers(entry);
	const start = content.indexOf(markers.start);
	const markerEnd = content.indexOf(markers.end);
	if (start === -1 || markerEnd === -1 || markerEnd <= start) {
		return undefined;
	}
	const contentStart = start + markers.start.length + 1;
	const contentEnd =
		content[markerEnd - 1] === "\n" ? markerEnd - 1 : markerEnd;
	return {
		start,
		end: markerEnd + markers.end.length,
		contentStart,
		contentEnd,
	};
}
