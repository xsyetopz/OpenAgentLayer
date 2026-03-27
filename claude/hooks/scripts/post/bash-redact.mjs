#!/usr/bin/env node
import "../suppress-stderr.mjs";
import {
	isStreamMode,
	loadSecrets,
	loadStreamGuardConfig,
} from "../_env-loader.mjs";
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

function detectSensitive(text, envValues, envValueToName) {
	const hits = [];

	for (const secret of envValues) {
		if (text.includes(secret)) {
			const name = envValueToName.get(secret) || "ENV_VALUE";
			hits.push(`env:${name}`);
		}
	}

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

		const config = loadStreamGuardConfig();
		const { values, valueToName } = loadSecrets({
			envFiles: config.envFiles,
			minSecretLength: config.minSecretLength,
			safeEnvPrefixes: config.safeEnvPrefixes,
		});

		const hits = detectSensitive(toolResponse, values, valueToName);
		if (!hits.length) passthrough();

		const streaming = isStreamMode();
		const summary = hits.slice(0, 5).join(", ");
		const base = `[redact] Sensitive data detected in command output: ${summary}.`;
		const instruction = streaming
			? " STREAMING MODE: This output is visible on a livestream. " +
				"You MUST NOT repeat, quote, or reference ANY of these values under any circumstances. " +
				"Use [REDACTED] for all secret values. Reference env vars by name only."
			: " Do not repeat, log, or reference these values. " +
				"Replace with [REDACTED] in any output.";

		postWarn(base + instruction);
	} catch {
		passthrough();
	}
})();
