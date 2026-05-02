#!/usr/bin/env node

import { asArray, asString, createHookRunner } from "./_runtime.mjs";

function evaluate(payload) {
	const routeKind = asString(payload.routeKind) || asString(payload.kind);
	const commandEvidence =
		asString(payload.commandEvidence) || asString(payload.validationEvidence);
	if (
		routeKind === "edit-required" &&
		asArray(payload.changedFiles).length === 0
	) {
		return {
			decision: "block",
			reason: "Edit-required route completed without changed-file evidence.",
		};
	}
	if (routeKind === "execution-required" && !commandEvidence) {
		return {
			decision: "block",
			reason: "Execution-required route completed without command evidence.",
		};
	}
	if (payload.explanationOnly === true) {
		return {
			decision: "block",
			reason: "Completion flagged as explanation-only by structured signal.",
		};
	}
	return { decision: "pass", reason: "Route contract satisfied." };
}

createHookRunner("enforce-route-contract", evaluate);
