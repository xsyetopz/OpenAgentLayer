#!/usr/bin/env node
import "../suppress-stderr.mjs";
import {
	PII_PATTERNS,
	passthrough,
	postWarn,
	readStdin,
	SECRET_PATTERNS,
} from "../_lib.mjs";

function categorizePii(pattern) {
	const src = pattern.source;
	if (src.includes("@")) return "email address";
	if (src.includes("\\d{3}-\\d{2}-\\d{4}")) return "SSN";
	if (src.includes("\\d{4}") && src.includes("3")) return "credit card number";
	if (src.includes("169.254")) return "cloud metadata endpoint";
	if (
		src.includes("10\\.") ||
		src.includes("172\\.") ||
		src.includes("192\\.168")
	)
		return "private IP address";
	if (src.includes("\\d{3}")) return "phone number";
	return "";
}

function detectSensitive(text) {
	const hits = [];
	for (const pat of SECRET_PATTERNS) {
		if (pat.test(text)) {
			hits.push("secret/credential");
			break;
		}
	}
	for (const pat of PII_PATTERNS) {
		if (pat.test(text)) {
			const label = categorizePii(pat);
			if (label && !hits.includes(label)) hits.push(label);
		}
	}
	return hits;
}

(async () => {
	try {
		const data = await readStdin();
		if (!data || !Object.keys(data).length) passthrough();

		const toolResponse = data.tool_response || "";
		if (!toolResponse || typeof toolResponse !== "string") passthrough();

		const hits = detectSensitive(toolResponse);
		if (!hits.length) passthrough();

		const summary = hits.slice(0, 5).join(", ");
		postWarn(
			`[redact] Sensitive data detected in command output: ${summary}. ` +
				"Do not repeat, log, or reference these values. " +
				"Replace with [REDACTED] in any output.",
		);
	} catch {
		passthrough();
	}
})();
