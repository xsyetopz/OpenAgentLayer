import { asArray, asObject, asString } from "./_runtime.mjs";

const BLOCKED_FIELDS = ["attempted", "evidence", "need"];

function collectEvidence(payload) {
	const evidenceItems = [];
	evidenceItems.push(...asArray(payload.validationEvidence));
	evidenceItems.push(...asArray(payload.evidenceItems));

	const evidence = asObject(payload.evidence);
	evidenceItems.push(...asArray(evidence.items));
	evidenceItems.push(...asArray(evidence.validation));
	evidenceItems.push(...asArray(evidence.commands));

	return evidenceItems.filter(
		(item) => item !== undefined && item !== undefined,
	);
}

function parseStatus(payload) {
	const route = asObject(payload.route);
	const statusCandidate =
		asString(payload.routeStatus) ||
		asString(payload.status) ||
		asString(route.status);
	return statusCandidate.toLowerCase();
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
	if (!responseText) {
		return false;
	}

	return BLOCKED_FIELDS.every((field) =>
		new RegExp(`^${field}:\\s+`, "im").test(responseText),
	);
}

export function evaluateCompletionEvidence(payload) {
	const status = parseStatus(payload);
	const isBlocked = status === "blocked";
	const isCompleted =
		status === "complete" || status === "completed" || payload.isFinal === true;

	if (isBlocked) {
		if (!hasBlockedContract(payload)) {
			return {
				decision: "block",
				reason:
					"STATUS BLOCKED result needs Attempted, Evidence, and Need fields",
			};
		}

		return {
			decision: "pass",
			reason: "STATUS BLOCKED result includes the required handoff contract",
		};
	}

	if (!isCompleted) {
		return {
			decision: "pass",
			reason: "Completion check complete for current route status",
		};
	}

	const finalResponse =
		asString(payload.finalResponse) ||
		asString(payload.response) ||
		asString(payload.outputText);
	if (finalResponse.trim().length === 0) {
		return {
			decision: "block",
			reason: "Completion result needs final response text",
		};
	}

	const evidenceItems = collectEvidence(payload);
	const minimumEvidence = Number(payload.minimumEvidenceCount ?? 1);
	if (evidenceItems.length < minimumEvidence) {
		return {
			decision: "block",
			reason: "Completion result needs required validation evidence",
			details: [
				`required=${minimumEvidence}`,
				`received=${evidenceItems.length}`,
			],
		};
	}

	return {
		decision: "pass",
		reason: "Completion includes final response and validation evidence",
	};
}
