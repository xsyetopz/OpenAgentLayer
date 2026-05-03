#!/usr/bin/env node

import { asArray, asObject, asString, createHookRunner } from "./_runtime.mjs";

const BLOCKED_FIELDS = ["attempted", "evidence", "need"];
const INVALID_EVIDENCE_TYPES = new Set([
	"screenshot",
	"label",
	"memory",
	"assumption",
	"inference",
	"smoke-test",
	"build-only",
]);
const VALID_EVIDENCE_TYPES = new Set([
	"production-code",
	"reference-code",
	"formal-doc",
	"schema",
	"golden-fixture",
	"accepted-test",
	"provider-doc",
	"user-source-snippet",
]);

function parseStatus(payload) {
	const route = asObject(payload.route);
	return (
		asString(payload.routeStatus) ||
		asString(payload.status) ||
		asString(route.status)
	).toLowerCase();
}

function isFinalStatus(payload) {
	const status = parseStatus(payload);
	return (
		status === "complete" ||
		status === "completed" ||
		status === "pass" ||
		payload.isFinal === true
	);
}

function hasBlockedContract(payload) {
	const blockedReport = asObject(payload.blockedReport);
	if (
		BLOCKED_FIELDS.every(
			(field) => asString(blockedReport[field]).trim().length > 0,
		)
	) {
		return true;
	}

	const responseText =
		asString(payload.finalResponse) ||
		asString(payload.response) ||
		asString(payload.outputText);
	return BLOCKED_FIELDS.every((field) =>
		new RegExp(`^${field}:\\s+`, "im").test(responseText),
	);
}

function behaviorChanged(payload) {
	if (
		payload.behaviorChanged === true ||
		payload.behaviourChanged === true ||
		payload.runtimeVisibleBehaviorChanged === true ||
		payload.runtimeVisibleBehaviourChanged === true
	) {
		return true;
	}

	const routeKind = asString(payload.routeKind) || asString(payload.kind);
	if (
		routeKind === "behavior-changing" ||
		routeKind === "behaviour-changing" ||
		routeKind === "runtime-visible"
	) {
		return true;
	}

	for (const entry of asArray(payload.files)) {
		const file = asObject(entry);
		if (
			file.behavior === true ||
			file.behaviour === true ||
			file.runtimeVisible === true
		) {
			return true;
		}
	}

	return false;
}

function collectSourceEvidence(payload) {
	const evidence = [];
	evidence.push(...asArray(payload.sourceEvidence));
	evidence.push(...asArray(payload.sourceEvidenceMap));

	const evidenceObject = asObject(payload.evidence);
	evidence.push(...asArray(evidenceObject.source));
	evidence.push(...asArray(evidenceObject.sourceEvidence));

	return evidence;
}

function classifyEvidence(entry) {
	if (typeof entry === "string") {
		return entry.trim().length > 0 ? "valid" : "empty";
	}

	const evidence = asObject(entry);
	const type = asString(evidence.type).toLowerCase();
	const path =
		asString(evidence.path) ||
		asString(evidence.sourcePath) ||
		asString(evidence.spec) ||
		asString(evidence.test) ||
		asString(evidence.url);
	const symbol =
		asString(evidence.symbol) ||
		asString(evidence.function) ||
		asString(evidence.section);

	if (INVALID_EVIDENCE_TYPES.has(type)) return "invalid";
	if (VALID_EVIDENCE_TYPES.has(type) && (path || symbol)) return "valid";
	if (!type && (path || symbol)) return "valid";
	return "empty";
}

function evaluate(payload) {
	const status = parseStatus(payload);
	if (status === "blocked") {
		if (!hasBlockedContract(payload)) {
			return {
				decision: "block",
				reason: "Blocked result lacks attempted, evidence, and need fields.",
			};
		}
		return {
			decision: "pass",
			reason: "Blocked result names attempted work, evidence, and need.",
		};
	}

	if (!(isFinalStatus(payload) && behaviorChanged(payload))) {
		return {
			decision: "pass",
			reason: "Source evidence check complete for this payload.",
		};
	}

	const classifications = collectSourceEvidence(payload).map(classifyEvidence);
	if (classifications.includes("valid")) {
		return {
			decision: "pass",
			reason: "Behavior change includes source evidence.",
		};
	}

	if (classifications.includes("invalid")) {
		return {
			decision: "block",
			reason: "Behavior change used non-source evidence.",
		};
	}

	return {
		decision: "block",
		reason: "Behavior change lacks source evidence.",
	};
}

createHookRunner("require-source-evidence", evaluate);
