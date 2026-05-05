import { asArray } from "./_runtime.mjs";

export function evaluateFailureLoop(payload) {
	const failures = asArray(payload.failures);
	const threshold = Number(payload.threshold ?? 3);
	if (failures.length >= threshold) {
		return {
			decision: "block",
			reason: "Repeated symptom circuit opened",
			details: failures.map((failure) => String(failure)).slice(0, threshold),
		};
	}
	return {
		decision: "pass",
		reason: "Symptom count is below circuit threshold",
	};
}
