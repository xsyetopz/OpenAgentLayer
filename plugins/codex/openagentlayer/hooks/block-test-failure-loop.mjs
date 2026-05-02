#!/usr/bin/env node

import { asArray, createHookRunner } from "./_runtime.mjs";

function evaluate(payload) {
	const failures = asArray(payload.failures);
	const threshold = Number(payload.threshold ?? 3);
	if (failures.length >= threshold) {
		return {
			decision: "block",
			reason: "Repeated failure circuit opened.",
			details: failures.map((failure) => String(failure)).slice(0, threshold),
		};
	}
	return { decision: "pass", reason: "Failure count below circuit threshold." };
}

createHookRunner("block-test-failure-loop", evaluate);
