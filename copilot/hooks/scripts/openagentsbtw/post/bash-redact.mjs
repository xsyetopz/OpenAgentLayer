#!/usr/bin/env node
import { loadSecrets } from "../_env-loader.mjs";
import {
	PII_PATTERNS,
	passthrough,
	readStdin,
	resolveCwd,
	SECRET_PATTERNS,
	systemMessage,
} from "../_lib.mjs";

function categorize(text) {
	const hits = [];
	for (const pattern of SECRET_PATTERNS) {
		if (pattern.test(text)) {
			hits.push("secret or credential");
			break;
		}
	}
	for (const pattern of PII_PATTERNS) {
		if (pattern.test(text)) {
			hits.push("PII");
			break;
		}
	}
	return hits;
}

(async () => {
	const data = await readStdin();
	if (!data || !Object.keys(data).length) passthrough();

	const responseRaw =
		typeof data.tool_response === "string"
			? data.tool_response
			: typeof data.toolResponse === "string"
				? data.toolResponse
				: JSON.stringify(data.tool_response || data.toolResponse || "");
	if (!responseRaw) passthrough();

	const cwd = resolveCwd(data);
	const { values, names } = loadSecrets(cwd);
	const exactEnvMatches = [];
	for (const value of values) {
		if (!responseRaw.includes(value)) continue;
		exactEnvMatches.push(names.get(value) || "ENV_SECRET");
	}

	const categories = categorize(responseRaw);
	if (!exactEnvMatches.length && !categories.length) passthrough();

	const parts = [];
	if (exactEnvMatches.length) {
		parts.push(`env values matched: ${exactEnvMatches.slice(0, 5).join(", ")}`);
	}
	if (categories.length) {
		parts.push(categories.join(", "));
	}

	systemMessage(
		`[openagentsbtw:redact] Sensitive command output detected (${parts.join("; ")}). Do not repeat secret values. Use [REDACTED] and refer to env vars by name only.`,
	);
})();
