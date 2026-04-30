#!/usr/bin/env node
import { extname } from "node:path";

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
	/for demonstration/i,
	/\bmock implementation\b/i,
	/simplified version/i,
	/\bproof of concept\b/i,
];

export const AI_PROSE_SLOP = [
	/\b(?:robust|seamless|comprehensive|cutting-edge|innovative|streamlined)\b/i,
	/\b(?:leverage|utilize|facilitate|enhance|empower|foster)\b/i,
	/it'?s (?:important|worth) (?:to )?(?:note|mention)/i,
	/(?:great|excellent|fantastic) (?:question|point|approach)/i,
	/\b(?:delve|underscore|bolster|unpack|craft|curate)\b/i,
	/in today'?s (?:landscape|world|environment)/i,
	/moving forward\b/i,
	/needless to say\b/i,
	/at the end of the day\b/i,
	/let'?s (?:dive in|break this down|explore)/i,
	/I'?d be happy to\b/i,
	/Here'?s what I found\b/i,
	/Based on my analysis\b/i,
];

export const SECTION_NARRATORS =
	/^\s*(?:\/\/|#|\/\*)\s*(?:Constants?|Helper functions?|Imports?|Main function|Define\s|Initialize|Setup|Configuration|Variables?|Types?|Interfaces?|Dependencies|Exports?|Utils?|Utilities)\s*\*?\/?\s*$/im;

export const EDUCATIONAL_COMMENTS =
	/^\s*(?:\/\/|#|\/\*)\s*(?:This is where we|Here we|Note that|Now we|First we|Then we|Finally we|We need to|This (?:function|method|class) (?:is|handles|does)|The following|As you can see|Below we|Above we|This (?:is a|represents|provides|allows))\b/im;

export const TAUTOLOGICAL_COMMENTS =
	/^\s*(?:\/\/|#|\/\*)\s*(?:(?:Get|Set|Return|Check|Create|Initialize|Import|Define|Declare|Update|Delete|Remove|Add|Process|Handle|Parse|Validate|Calculate|Compute|Convert|Transform|Format|Render|Display|Print|Log|Send|Fetch|Load|Save|Store|Read|Write|Open|Close)\s+(?:the\s+)?)/im;

export const COMMENT_SLOP_PATTERNS = [
	SECTION_NARRATORS,
	EDUCATIONAL_COMMENTS,
	TAUTOLOGICAL_COMMENTS,
];

export const SYCOPHANCY_PATTERNS = [
	/^(sure|of course|absolutely|great question|good point|I'd be happy to)/i,
	/^(let me know if|hope this helps|feel free to)/i,
	/sorry for (the|any) (confusion|inconvenience|error)/i,
	/I apologize for/i,
	/^(that's a great|that's an excellent|that's a good) (question|point|idea|observation)/i,
	/^(certainly|definitely|you're (absolutely )?right)/i,
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

export const TEST_FILE_RE =
	/(?:test_|_test\.|\.test\.|\.spec\.|tests\/|__tests__\/|test\.)/i;

export const META_FILE_RE =
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

export function deny(reason) {
	printJson({
		hookSpecificOutput: {
			hookEventName: "PreToolUse",
			permissionDecision: "deny",
			permissionDecisionReason: reason,
		},
	});
}

export function systemMessage(message, extra = {}) {
	printJson({
		continue: true,
		systemMessage: message,
		...extra,
	});
}

export function stopBlock(message) {
	printJson({
		continue: false,
		stopReason: "openagentsbtw completion check failed",
		systemMessage: message,
	});
}

export function passthrough() {
	process.exit(0);
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
	const treatAnywhere = isProseFile(filepath);

	lines.forEach((line, index) => {
		if (hasSuppression(line)) return;
		if (
			(treatAnywhere || isCommentLine(line)) &&
			PROTOTYPE_SCAFFOLDING.some((pattern) => pattern.test(line))
		) {
			hits.push(`  ${filepath}:${index + 1}: ${line.trim().slice(0, 100)}`);
		}
	});

	return hits;
}

export function matchCommentSlop(filepath, lines) {
	const hits = [];
	lines.forEach((line, index) => {
		if (!isCommentLine(line)) return;
		if (COMMENT_SLOP_PATTERNS.some((pattern) => pattern.test(line))) {
			hits.push(`  ${filepath}:${index + 1}: ${line.trim().slice(0, 100)}`);
		}
	});
	return hits;
}

export function matchProseSlop(filepath, lines) {
	const hits = [];
	lines.forEach((line, index) => {
		if (AI_PROSE_SLOP.some((pattern) => pattern.test(line))) {
			hits.push(`  ${filepath}:${index + 1}: ${line.trim().slice(0, 100)}`);
		}
	});
	return hits;
}

export function matchSycophancy(filepath, lines) {
	const hits = [];
	lines.forEach((line, index) => {
		if (SYCOPHANCY_PATTERNS.some((pattern) => pattern.test(line))) {
			hits.push(`  ${filepath}:${index + 1}: ${line.trim().slice(0, 100)}`);
		}
	});
	return hits;
}
