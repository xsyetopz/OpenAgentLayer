import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic, SourceGraph } from "@openagentlayer/types";

interface UpstreamSchemaManifest {
	readonly entries: readonly UpstreamSchemaManifestEntry[];
	readonly retrieval_date: string;
}

interface UpstreamSchemaManifestEntry {
	readonly content_type: string;
	readonly extraction_status: string;
	readonly id: string;
	readonly path: string;
	readonly retrieval_date: string;
	readonly sha256: string;
	readonly source_url: string;
	readonly surface: string;
}

export async function validateUpstreamSchemaProvenance(
	root: string,
	graph: SourceGraph,
): Promise<readonly Diagnostic[]> {
	const manifestPath = join(root, "source/schemas/upstream/manifest.json");
	const manifest = await readManifest(manifestPath);
	if (manifest === undefined) {
		return [];
	}

	const diagnostics: Diagnostic[] = [];
	const knownSourceUrls = new Set<string>();
	for (const entry of manifest.entries) {
		knownSourceUrls.add(entry.source_url);
		await validateManifestEntry(root, entry, diagnostics);
	}

	for (const record of graph.surfaceConfigs) {
		validateKnownSourceUrl(
			record.default_profile.source_url,
			record.location.metadataPath,
			knownSourceUrls,
			diagnostics,
		);
		for (const replacement of record.replacements) {
			validateKnownSourceUrl(
				replacement.source_url,
				record.location.metadataPath,
				knownSourceUrls,
				diagnostics,
			);
		}
	}

	return diagnostics;
}

async function readManifest(
	manifestPath: string,
): Promise<UpstreamSchemaManifest | undefined> {
	try {
		return JSON.parse(await readFile(manifestPath, "utf8"));
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return undefined;
		}
		throw error;
	}
}

async function validateManifestEntry(
	root: string,
	entry: UpstreamSchemaManifestEntry,
	diagnostics: Diagnostic[],
): Promise<void> {
	const filePath = join(root, entry.path);
	const diagnosticPath = relative(process.cwd(), filePath);
	let content: Buffer;
	try {
		content = await readFile(filePath);
	} catch {
		diagnostics.push(
			errorDiagnostic(
				"missing-upstream-schema-cache",
				`Upstream cache '${entry.id}' is missing file '${entry.path}'.`,
				diagnosticPath,
			),
		);
		return;
	}

	const actualSha256 = createHash("sha256").update(content).digest("hex");
	if (actualSha256 !== entry.sha256) {
		diagnostics.push(
			errorDiagnostic(
				"upstream-schema-hash-mismatch",
				`Upstream cache '${entry.id}' hash does not match manifest.`,
				diagnosticPath,
			),
		);
	}

	if (entry.content_type === "json-schema") {
		try {
			JSON.parse(content.toString("utf8"));
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			diagnostics.push(
				errorDiagnostic(
					"invalid-upstream-schema-json",
					`Upstream cache '${entry.id}' is not valid JSON: ${message}`,
					diagnosticPath,
				),
			);
		}
	}
}

function validateKnownSourceUrl(
	sourceUrl: string,
	path: string,
	knownSourceUrls: ReadonlySet<string>,
	diagnostics: Diagnostic[],
): void {
	if (!sourceUrl.startsWith("http") || knownSourceUrls.has(sourceUrl)) {
		return;
	}
	diagnostics.push(
		errorDiagnostic(
			"unknown-upstream-source-url",
			`Surface config source URL '${sourceUrl}' is not listed in source/schemas/upstream/manifest.json.`,
			path,
		),
	);
}
