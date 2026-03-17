#!/usr/bin/env node
import "./suppress-stderr.mjs";
import {
	PII_PATTERNS,
	passthrough,
	readStdin,
	SECRET_PATTERNS,
	warn,
} from "./_lib.mjs";

function categorizePii(patternSource) {
	if (patternSource.includes("@")) return "email address";
	if (patternSource.includes("\\d{3}-\\d{2}-\\d{4}")) return "SSN";
	if (patternSource.includes("\\d{4}") && patternSource.includes("3"))
		return "credit card number";
	if (patternSource.includes("169.254")) return "cloud metadata endpoint";
	if (
		patternSource.includes("10\\.") ||
		patternSource.includes("172\\.") ||
		patternSource.includes("192\\.168")
	)
		return "private IP address";
	if (patternSource.includes("\\d{3}")) return "phone number";
	return "";
}

function detectSensitive(text) {
	const hits = [];
	if (SECRET_PATTERNS.some((pat) => pat.test(text))) {
		hits.push("secret/credential");
	}
	for (const pat of PII_PATTERNS) {
		if (pat.test(text)) {
			const label = categorizePii(pat.source);
			if (label && !hits.includes(label)) hits.push(label);
		}
	}
	return hits;
}

(async () => {
	try {
		const data = await readStdin();
		if (!data) passthrough();

		const toolResponse = data.tool_response ?? "";
		if (!toolResponse || typeof toolResponse !== "string") passthrough();

		const hits = detectSensitive(toolResponse);
		if (!hits.length) passthrough();

		const summary = hits.slice(0, 5).join(", ");
		warn(
			`[redact] Sensitive data detected in command output: ${summary}. ` +
				"Do not repeat, log, or reference these values. " +
				"Replace with [REDACTED] in any output.",
			"PostToolUse",
		);
	} catch {
		passthrough();
	}
})();
