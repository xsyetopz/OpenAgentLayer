#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PLACEHOLDER_HARD = [
	/\bTODO\b(?!\s*\(.*test)/,
	/\bFIXME\b/,
	/\bHACK\b/,
	/\bXXX\b/,
	/\btodo!\s*\(\s*\)/,
	/\bunimplemented!\s*\(\s*\)/,
	/raise\s+NotImplementedError/,
	/(def\s+\w+\([^)]*\)\s*:\s*\n\s*pass)\s*$/m,
];

export const PLACEHOLDER_EMPTY_BODY = [
	/fn\s+\w+\s*\([^)]*\)\s*(?:->[^{]*)?\{[\s]*\}/,
	/function\s+\w+\s*\([^)]*\)\s*\{[\s]*\}/,
];

export const PLACEHOLDER_SOFT = [
	/\bfor now\b/i,
	/\bfor simplicity\b/i,
	/for the sake of simplicity/i,
	/simplified version/i,
	/in a real implementation/i,
	/\bplaceholder\b/i,
	/\btemporary\b/i,
	/quick and dirty/i,
	/for demo(?:nstration)? purposes/i,
	/proof of concept/i,
	/\bout of scope\b/i,
	/\bfuture pr\b/i,
	/\bdefer(?:red)?\b/i,
];

export const PROTOTYPE_SCAFFOLDING = [
	/\bprototype\b/i,
	/\bdemo\b/i,
	/\btoy\b/i,
	/\bexample\b/i,
	/\bsample app\b/i,
	/for demo(?:nstration)?/i,
	/mock implementation/i,
	/simplified version/i,
];

export const SECRET_PATTERNS = [
	/\b(?:api_?key|api_?secret|secret_?key|auth_?token|access_?key|passwd|password)\s*[:=]\s*["']([^\s"']{8,})["']/i,
	/sk-[a-z0-9-]{20,}/i,
	/AKIA[0-9A-Z]{16}/,
	/gh[pous]_[A-Za-z0-9_]{36,}/,
	/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
	/\bAIza[0-9A-Za-z_-]{35}\b/,
	/\bxox[bpras]-[0-9a-zA-Z-]{10,}\b/,
	/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
	/\bsk-proj-[a-zA-Z0-9-]{20,}\b/,
];

export const PII_PATTERNS = [
	/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i,
	/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
	/\b\d{3}-\d{2}-\d{4}\b/,
	/\b(?:\d{4}[-\s]?){3}\d{4}\b/,
	/\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/,
	/169\.254\.169\.254/,
];

const COMMENT_LEADER_RE = /^\s*(?:\/\/|\/\*|#|--|;|%|<!--)/;
const SUPPRESSION_RE = /\bcca-allow\b/;
const TEST_FILE_RE =
	/(?:test_|_test\.|\.test\.|\.spec\.|tests\/|__tests__\/|test\.)/i;
const META_FILE_RE =
	/(?:hooks\/scripts\/|hooks\/hooks\.json|agents\/.*\.toml|skills\/.*\/SKILL\.md|install\.sh|AGENTS\.md|CLAUDE\.md)/i;

export function readStdin() {
	return new Promise((resolve) => {
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => {
			try {
				resolve(JSON.parse(data));
			} catch {
				resolve({});
			}
		});
		process.stdin.on("error", () => resolve({}));
		process.stdin.resume();
	});
}

function printJson(payload) {
	process.stdout.write(`${JSON.stringify(payload)}\n`);
	process.exit(0);
}

export function passthrough() {
	printJson({});
}

export function deny(reason) {
	printJson({
		permissionDecision: "deny",
		permissionDecisionReason: reason,
	});
}

export function allowModifiedArgs(modifiedArgs) {
	printJson({
		permissionDecision: "allow",
		modifiedArgs,
	});
}

export function additionalContext(message) {
	printJson({
		additionalContext: message,
	});
}

export function systemMessage(message, extra = {}) {
	printJson({
		additionalContext: message,
		...extra,
	});
}

export function stopBlock(message) {
	printJson({
		decision: "block",
		reason: message,
	});
}

export function isCommentLine(line) {
	return COMMENT_LEADER_RE.test(line);
}

function hasSuppression(line) {
	return SUPPRESSION_RE.test(line);
}

export function isTestFile(filepath) {
	return TEST_FILE_RE.test(filepath);
}

export function isMetaFile(filepath) {
	return META_FILE_RE.test(filepath);
}

export function isProseFile(filepath) {
	return new Set([".md", ".mdx", ".txt", ".rst", ".adoc"]).has(
		extname(filepath).toLowerCase(),
	);
}

export function matchPlaceholders(filepath, lines, includeEmptyBody = false) {
	const hard = [];
	const soft = [];
	const patterns = includeEmptyBody
		? [...PLACEHOLDER_HARD, ...PLACEHOLDER_EMPTY_BODY]
		: PLACEHOLDER_HARD;
	const treatSoftAnywhere = isProseFile(filepath);

	lines.forEach((line, index) => {
		const lineNumber = index + 1;
		if (hasSuppression(line)) return;
		if (patterns.some((pattern) => pattern.test(line))) {
			hard.push(`  ${filepath}:${lineNumber}: ${line.trim().slice(0, 100)}`);
			return;
		}
		if (
			!includeEmptyBody &&
			PLACEHOLDER_EMPTY_BODY.some((pattern) => pattern.test(line))
		) {
			soft.push(
				`  ${filepath}:${lineNumber}: ${line.trim().slice(0, 100)} [empty body]`,
			);
			return;
		}
		if (
			treatSoftAnywhere
				? PLACEHOLDER_SOFT.some((pattern) => pattern.test(line))
				: isCommentLine(line) &&
					PLACEHOLDER_SOFT.some((pattern) => pattern.test(line))
		) {
			soft.push(`  ${filepath}:${lineNumber}: ${line.trim().slice(0, 100)}`);
		}
	});

	return { hard, soft };
}

export function matchPrototypeScaffolding(filepath, lines) {
	const hits = [];
	lines.forEach((line, index) => {
		if (hasSuppression(line)) return;
		if (!PROTOTYPE_SCAFFOLDING.some((pattern) => pattern.test(line))) return;
		if (!isCommentLine(line) && !isProseFile(filepath)) {
			hits.push(`  ${filepath}:${index + 1}: ${line.trim().slice(0, 100)}`);
			return;
		}
		hits.push(`  ${filepath}:${index + 1}: ${line.trim().slice(0, 100)}`);
	});
	return hits;
}

export function resolveToolName(payload) {
	return (
		payload?.tool_name ||
		payload?.toolName ||
		payload?.tool ||
		payload?.tool?.name ||
		""
	);
}

export function resolveToolInput(payload) {
	const toolArgs = payload?.toolArgs ?? payload?.tool_args ?? null;
	if (toolArgs) {
		if (typeof toolArgs === "object") return toolArgs;
		if (typeof toolArgs === "string") {
			try {
				return JSON.parse(toolArgs);
			} catch {
				return {};
			}
		}
	}
	return (
		payload?.tool_input ||
		payload?.toolInput ||
		payload?.args ||
		payload?.tool?.input ||
		{}
	);
}

export function resolveCwd(payload) {
	return (
		payload?.cwd || payload?.workspacePath || payload?.repoPath || process.cwd()
	);
}

export function resolveTranscriptPath(payload) {
	return (
		payload?.transcriptPath ||
		payload?.transcript_path ||
		payload?.agent_transcript_path ||
		""
	);
}

export function loadRouteContracts() {
	try {
		const path = join(__dirname, "..", "..", "route-contracts.json");
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return { skills: {}, agents: {} };
	}
}
