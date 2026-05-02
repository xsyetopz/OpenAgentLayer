#!/usr/bin/env node

import { asArray, asObject, asString, createHookRunner } from "./_runtime.mjs";

const GENERATED_PATH_HINTS = [
	"/generated/",
	".generated.",
	"/dist/",
	"/build/",
];
const DEFAULT_LARGE_DIFF_LINE_THRESHOLD = 800;

function isGeneratedPath(path) {
	return GENERATED_PATH_HINTS.some((hint) => path.includes(hint));
}

function evaluate(payload) {
	if (payload.allowGeneratedDrift === true) {
		return {
			decision: "warn",
			reason: "Generated drift allowed by explicit override.",
		};
	}

	if (payload.generatedEditWithoutSource === true) {
		return {
			decision: "block",
			reason: "Generated artifact changed without matching source update.",
		};
	}

	const sourceChangedPaths = new Set(
		asArray(payload.sourceChangedPaths)
			.map((path) => asString(path))
			.filter(Boolean),
	);
	const violations = [];

	for (const entry of asArray(payload.files)) {
		const file = asObject(entry);
		const path = asString(file.path);
		if (!path) {
			continue;
		}

		const changed = file.changed !== false;
		const generated = file.generated === true || isGeneratedPath(path);
		if (!(changed && generated)) {
			continue;
		}

		const sourcePath = asString(file.sourcePath);
		const sourceChanged =
			file.sourceChanged === true || sourceChangedPaths.has(sourcePath);
		if (!sourceChanged) {
			violations.push(sourcePath ? `${path} -> ${sourcePath}` : path);
		}
	}

	if (violations.length > 0) {
		return {
			decision: "block",
			reason: "Generated drift detected without corresponding source changes.",
			details: violations,
		};
	}

	const diffStats = asObject(payload.diffStats);
	const changedLines = Number(
		payload.changedLines ?? diffStats.changedLines ?? diffStats.lines ?? 0,
	);
	const largeDiffThreshold = Number(
		payload.largeDiffThreshold ?? DEFAULT_LARGE_DIFF_LINE_THRESHOLD,
	);
	if (changedLines > largeDiffThreshold) {
		return {
			decision: "warn",
			reason: "Large diff requires explicit validation and review evidence.",
			details: [
				`changedLines=${changedLines}`,
				`threshold=${largeDiffThreshold}`,
			],
		};
	}

	return {
		decision: "pass",
		reason: "No generated drift violations detected.",
	};
}

createHookRunner("block-generated-drift", evaluate);
