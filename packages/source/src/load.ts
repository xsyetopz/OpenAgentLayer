import { join, resolve } from "node:path";
import { hasErrors } from "@openagentlayer/diagnostics";
import type {
	Diagnostic,
	LoadResult,
	SourceRecord,
} from "@openagentlayer/types";
import { RECORD_DEFINITIONS } from "./definitions";
import { readDirectoryIfPresent } from "./filesystem";
import { buildGraph } from "./graph-builder";
import { loadRecord } from "./record-loader";
import { validateGraphReferences } from "./validate";
import { validateDocumentation } from "./validate-docs";
import { validateUpstreamSchemaProvenance } from "./validation/upstream-schemas";

export async function loadSourceGraph(root: string): Promise<LoadResult> {
	const sourceRoot = resolve(root, "source");
	const diagnostics: Diagnostic[] = [];
	const records: SourceRecord[] = [];

	for (const definition of RECORD_DEFINITIONS) {
		const directory = join(sourceRoot, definition.directory);
		const entries = await readDirectoryIfPresent(directory);
		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue;
			}

			const recordDirectory = join(directory, entry.name);
			const metadataPath = join(recordDirectory, definition.metadataName);
			const record = await loadRecord(
				definition.kind,
				recordDirectory,
				metadataPath,
				diagnostics,
			);
			if (record !== undefined) {
				records.push(record);
			}
		}
	}

	diagnostics.push(...(await validateDocumentation(root)));
	diagnostics.push(...validateDuplicateIds(records));

	if (hasErrors(diagnostics)) {
		return { diagnostics };
	}

	const graph = buildGraph(records);
	diagnostics.push(...validateGraphReferences(graph));
	diagnostics.push(...(await validateUpstreamSchemaProvenance(root, graph)));

	if (hasErrors(diagnostics)) {
		return { diagnostics };
	}

	return { graph, diagnostics };
}

function validateDuplicateIds(
	records: readonly SourceRecord[],
): readonly Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const seen = new Map<string, SourceRecord>();
	for (const record of records) {
		const previous = seen.get(record.id);
		if (previous !== undefined) {
			diagnostics.push({
				code: "duplicate-id",
				level: "error",
				message: `Duplicate record id '${record.id}' in ${previous.location.metadataPath} and ${record.location.metadataPath}.`,
				path: record.location.metadataPath,
			});
		}
		seen.set(record.id, record);
	}
	return diagnostics;
}
