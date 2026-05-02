#!/usr/bin/env node

import { asArray, asObject, asString, createHookRunner } from "./_runtime.mjs";

function collectFiles(payload) {
	return asArray(payload.files).map((entry) => asObject(entry));
}

function isDemoArtifact(file) {
	return (
		file.demo === true ||
		file.generatedDemo === true ||
		asString(file.artifactKind) === "demo"
	);
}

function evaluate(payload) {
	const violations = [];
	for (const file of collectFiles(payload)) {
		if (!isDemoArtifact(file)) {
			continue;
		}
		violations.push(asString(file.path) || "inline-artifact");
	}

	if (violations.length > 0) {
		return {
			decision: "block",
			reason: "Demo artifact flagged by structured metadata.",
			details: violations,
		};
	}

	return { decision: "pass", reason: "No demo artifact metadata detected." };
}

createHookRunner("block-demo-artifacts", evaluate);
