import { GITLEAKS_RULES } from "./_gitleaks-rules.mjs";
import { extractCommands, extractPaths, extractText } from "./_payload.mjs";
import { asArray, asObject, uniqueValues } from "./_runtime.mjs";

const BASE64_CANDIDATE_PATTERN = /\b[A-Za-z0-9+/]{32,}={0,2}\b/g;
const GITHUB_ACTIONS_SECRET_REF_PATTERN =
	/\$\{\{\s*secrets\.[A-Za-z_][A-Za-z0-9_]*\s*\}\}/g;
const IDENTIFIER_REFERENCE_PATTERN =
	/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
const MIN_DECODED_LENGTH = 12;
const MAX_DECODE_DEPTH = 2;
const NON_SECRET_IDENTIFIER_VALUES = new Set([
	"apps",
	"codex_git_commit",
	"collaboration_modes",
	"enable_fanout",
	"fast_mode",
	"goals",
	"hooks",
	"js_repl",
	"marketplace",
	"memories",
	"multi_agent",
	"multi_agent_v2",
	"plugins",
	"responses_websockets",
	"responses_websockets_v2",
	"shell_snapshot",
	"shell_zsh_fork",
	"sqlite",
	"steer",
	"tui_app_server",
	"undo",
	"unified_exec",
]);

function structuredObjects(payload) {
	const objects = [asObject(payload)];
	for (const key of ["tool_input", "toolInput", "args", "arguments", "env"]) {
		const object = asObject(payload[key]);
		if (Object.keys(object).length > 0) objects.push(object);
	}
	for (const entry of asArray(payload.files)) {
		const file = asObject(entry);
		if (Object.keys(file).length > 0) objects.push(file);
	}
	return objects;
}

function textCorpus(payload) {
	return [
		extractText(payload),
		...extractCommands(payload),
		...structuredObjects(payload).map((object) => JSON.stringify(object)),
	]
		.filter(Boolean)
		.join("\n");
}

function pathFindings(paths) {
	const findings = [];
	for (const path of paths) {
		for (const rule of GITLEAKS_RULES) {
			if (!rule.path) continue;
			if (rule.regex) continue;
			const pattern = new RegExp(rule.path.source, rule.path.flags);
			if (pattern.test(path)) findings.push(`${rule.id}:${path}`);
		}
	}
	return findings;
}

function textFindings(text, depth = 0) {
	const scannedText = sanitizeText(text);
	const findings = [];
	for (const rule of GITLEAKS_RULES) {
		if (!rule.regex) continue;
		if (!keywordMatch(rule, scannedText)) continue;
		const pattern = new RegExp(rule.regex.source, rule.regex.flags);
		for (const match of scannedText.matchAll(pattern)) {
			findings.push(`${rule.id}:${match[1] ?? match[0]}`);
		}
	}
	if (depth < MAX_DECODE_DEPTH) {
		for (const candidate of scannedText.match(BASE64_CANDIDATE_PATTERN) ?? []) {
			const decoded = decodeBase64(candidate);
			if (!decoded) continue;
			const decodedFindings = textFindings(decoded, depth + 1);
			if (decodedFindings.length > 0)
				findings.push(`base64:${candidate.slice(0, 8)}…`);
		}
	}
	return uniqueValues(findings);
}

function sanitizeText(text) {
	return text.replace(GITHUB_ACTIONS_SECRET_REF_PATTERN, "gha-ref");
}

function keywordMatch(rule, text) {
	if (!Array.isArray(rule.keywords) || rule.keywords.length === 0) return true;
	const lowerText = text.toLowerCase();
	return rule.keywords.some((keyword) =>
		lowerText.includes(keyword.toLowerCase()),
	);
}

function decodeBase64(candidate) {
	try {
		const decoded = Buffer.from(candidate, "base64").toString("utf8");
		if (decoded.length < MIN_DECODED_LENGTH || !isPrintable(decoded)) return "";
		return decoded;
	} catch {
		return "";
	}
}

function isPrintable(value) {
	return [...value].every((char) => {
		const code = char.charCodeAt(0);
		return (
			code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)
		);
	});
}

function redact(value) {
	return `${value.slice(0, 80)}${value.length > 80 ? "…" : ""}`;
}

function findingRule(finding) {
	return finding.slice(0, finding.indexOf(":"));
}

function findingValue(finding) {
	return finding.slice(finding.indexOf(":") + 1);
}

function isKnownNonSecretFinding(finding) {
	if (findingRule(finding) !== "generic-api-key") return false;
	const value = findingValue(finding);
	return (
		NON_SECRET_IDENTIFIER_VALUES.has(value) || isIdentifierReference(value)
	);
}

function isIdentifierReference(value) {
	return IDENTIFIER_REFERENCE_PATTERN.test(value);
}

function describeFinding(finding) {
	const rule = findingRule(finding);
	const value = findingValue(finding);
	if (!(rule && value))
		return `Review possible credential match ${redact(finding)}`;
	return `Review possible credential match ${redact(value)} from ${rule}`;
}

export function evaluateSecretGuard(payload) {
	if (payload.allowSecretAccess === true) {
		return {
			decision: "warn",
			reason: "Secret access allowed by explicit override",
		};
	}

	const findings = uniqueValues([
		...pathFindings(extractPaths(payload)),
		...textFindings(textCorpus(payload)),
	]).filter((finding) => !isKnownNonSecretFinding(finding));
	if (findings.length > 0) {
		return {
			decision: "block",
			reason:
				"Secret guard paused this output because a configured rule matched possible credentials",
			details: findings.map(describeFinding),
		};
	}

	return {
		decision: "pass",
		reason: "Secret guard found no credential-shaped matches",
	};
}
