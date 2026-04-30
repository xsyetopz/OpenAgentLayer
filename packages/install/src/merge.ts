import type {
	AdapterArtifact,
	AdapterArtifactInstallMode,
} from "@openagentlayer/adapter-contract";
import { getManagedBlockMarkers, renderManagedBlock } from "./managed-block";
import {
	flattenManagedValues,
	getPathValue,
	jsonEqual,
	parseStructuredContent,
	renderStructuredContent,
	setPathValue,
} from "./structured-config";
import type { ManagedManifestEntry } from "./types";

const TRAILING_WHITESPACE_PATTERN = /\s*$/u;

export function mergeArtifactContent({
	artifact,
	existingContent,
	installMode,
	previousEntry,
}: {
	readonly artifact: AdapterArtifact;
	readonly existingContent: string | undefined;
	readonly installMode: AdapterArtifactInstallMode;
	readonly previousEntry: ManagedManifestEntry | undefined;
}): string {
	switch (installMode) {
		case "full-file":
			return artifact.content;
		case "marked-text-block":
			return mergeMarkedTextBlock(artifact, existingContent);
		case "structured-object":
			return mergeStructuredObject(artifact, existingContent, previousEntry);
		default:
			return artifact.content;
	}
}

function mergeMarkedTextBlock(
	artifact: AdapterArtifact,
	existingContent: string | undefined,
): string {
	const block = renderManagedBlock(artifact);
	if (existingContent === undefined || existingContent.trim() === "") {
		return `${block}\n`;
	}
	const markers = getManagedBlockMarkers(artifact);
	const startIndex = existingContent.indexOf(markers.start);
	const endIndex = existingContent.indexOf(markers.end);
	if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
		const afterEnd = endIndex + markers.end.length;
		return `${existingContent.slice(0, startIndex)}${block}${existingContent.slice(afterEnd)}`;
	}
	return `${existingContent.replace(TRAILING_WHITESPACE_PATTERN, "")}\n\n${block}\n`;
}

function mergeStructuredObject(
	artifact: AdapterArtifact,
	existingContent: string | undefined,
	previousEntry: ManagedManifestEntry | undefined,
): string {
	const desired = parseStructuredContent(artifact.path, artifact.content);
	const existing =
		existingContent === undefined || existingContent.trim() === ""
			? {}
			: parseStructuredContent(artifact.path, existingContent);
	const desiredValues = flattenManagedValues(desired);
	const previousValues = previousEntry?.managedValues ?? {};
	for (const [path, desiredValue] of Object.entries(desiredValues)) {
		const existingValue = getPathValue(existing, path);
		const previousValue = previousValues[path];
		if (
			existingValue !== undefined &&
			!jsonEqual(existingValue, desiredValue) &&
			(previousValue === undefined || !jsonEqual(existingValue, previousValue))
		) {
			throw new Error(
				`config-conflict: ${artifact.path}: existing user value at '${path}' differs from OpenAgentLayer managed value`,
			);
		}
		setPathValue(existing, path, desiredValue);
	}
	return renderStructuredContent(artifact.path, existing);
}
