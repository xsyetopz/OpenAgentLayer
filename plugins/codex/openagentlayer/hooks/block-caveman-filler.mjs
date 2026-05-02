#!/usr/bin/env node

import { asArray, asString, createHookRunner } from "./_runtime.mjs";

function evaluate(payload) {
	const mode =
		asString(payload.cavemanMode) ||
		asString(payload.mode) ||
		asString(payload.contextMode);
	const active =
		payload.cavemanModeActive === true || mode.toLowerCase() === "caveman";
	if (!active) {
		return { decision: "pass", reason: "Caveman mode is not active." };
	}

	if (payload.cavemanCompliant === false) {
		return {
			decision: "block",
			reason: "Caveman contract violation reported by structured signal.",
			details: asArray(payload.contractViolations).map(String),
		};
	}

	if (payload.cavemanCompliant === true) {
		return { decision: "pass", reason: "Caveman contract satisfied." };
	}

	return {
		decision: "warn",
		reason: "Caveman mode active without structured compliance signal.",
	};
}

createHookRunner("block-caveman-filler", evaluate);
