import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { errorDiagnostic } from "@openagentlayer/diagnostics";
import type { Diagnostic } from "@openagentlayer/types";

const VALID_STATUS_LINE_PATTERN =
	/^\s*- \[(?: |~|x)\] (?:Queued|Active|Sealed) — /u;
const CHECKBOX_LINE_PATTERN = /^\s*- \[[^\]]*\] /u;
const V3_NORMATIVE_PATTERN =
	/\b(?:preserve|copy|reuse|match)\b[^\n]*(?:v3|old behavior|prior behavior|legacy)[^\n]*\b(?:must|should|required|requires|require)\b|\b(?:must|should|required|requires|require)\b[^\n]*\b(?:preserve|copy|reuse|match)\b[^\n]*(?:v3|old behavior|prior behavior|legacy)/iu;

export async function validateDocumentation(
	root: string,
): Promise<readonly Diagnostic[]> {
	const diagnostics: Diagnostic[] = [];
	await validateSpecLinks(root, diagnostics);
	await validateV3Evidence(root, diagnostics);
	await validateStatusMarkers(root, diagnostics);
	await validateNoSpecV3Requirements(root, diagnostics);
	return diagnostics;
}

async function validateSpecLinks(
	root: string,
	diagnostics: Diagnostic[],
): Promise<void> {
	for (const path of await markdownFiles(join(root, "specs"))) {
		if (basename(path) === "openagentlayer-v4.md") {
			continue;
		}
		const text = await readFile(path, "utf8");
		if (!text.includes("openagentlayer-v4.md")) {
			diagnostics.push(
				errorDiagnostic(
					"missing-top-level-spec-link",
					"Spec file must link to openagentlayer-v4.md.",
					relative(process.cwd(), path),
				),
			);
		}
	}
}

async function validateV3Evidence(
	root: string,
	diagnostics: Diagnostic[],
): Promise<void> {
	for (const path of await markdownFiles(join(root, "docs"))) {
		if (!basename(path).startsWith("v3-")) {
			continue;
		}
		const text = await readFile(path, "utf8");
		if (!text.includes("v3_to_be_removed/")) {
			diagnostics.push(
				errorDiagnostic(
					"missing-v3-evidence-path",
					"v3 study docs must cite v3_to_be_removed/ evidence paths.",
					relative(process.cwd(), path),
				),
			);
		}
	}
}

async function validateStatusMarkers(
	root: string,
	diagnostics: Diagnostic[],
): Promise<void> {
	for (const directory of ["plans", "docs"]) {
		for (const path of await markdownFiles(join(root, directory))) {
			const lines = (await readFile(path, "utf8")).split("\n");
			for (const [index, line] of lines.entries()) {
				if (
					CHECKBOX_LINE_PATTERN.test(line) &&
					!VALID_STATUS_LINE_PATTERN.test(line)
				) {
					diagnostics.push(
						errorDiagnostic(
							"invalid-status-marker",
							"Status marker must be one of [ ] Queued, [~] Active, or [x] Sealed.",
							`${relative(process.cwd(), path)}:${index + 1}`,
						),
					);
				}
			}
		}
	}
}

async function validateNoSpecV3Requirements(
	root: string,
	diagnostics: Diagnostic[],
): Promise<void> {
	for (const path of await markdownFiles(join(root, "specs"))) {
		const text = await readFile(path, "utf8");
		if (text.includes("v3_to_be_removed/") || V3_NORMATIVE_PATTERN.test(text)) {
			diagnostics.push(
				errorDiagnostic(
					"spec-v3-requirement",
					"Specs must not define v3 implementation behavior as required behavior.",
					relative(process.cwd(), path),
				),
			);
		}
	}
}

async function markdownFiles(directory: string): Promise<readonly string[]> {
	try {
		const entries = await readdir(directory, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
			.map((entry) => join(directory, entry.name))
			.sort();
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return [];
		}
		throw error;
	}
}
