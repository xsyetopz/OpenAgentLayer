#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const HOOK_STRICT = process.env.CCA_HOOK_STRICT === "1";

export const CCA_ALLOW_RE = /\bcca-allow\b/;

export function hasSuppression(line) {
	return CCA_ALLOW_RE.test(line);
}

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
	/simplified version/i,
	/in a real implementation/i,
	/\bplaceholder\b/i,
	/\btemporary\b/i,
	/quick and dirty/i,
	/for demo(?:nstration)? purposes/i,
	/proof of concept/i,
	/in production(?:,)? (?:you|this) (?:would|should)/i,
	/this (?:is|can be) (?:improved|optimized) later/i,
	/handle (?:edge cases?|errors?) (?:here|later|properly)/i,
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
	// Claude-specific patterns
	/I'?d be happy to\b/i,
	/Here'?s what I found\b/i,
	/Based on my analysis\b/i,
	// GPTZero high-multiplier phrases
	/in today'?s digital age\b/i,
	/plays a crucial role\b/i,
	/\ba testament to\b/i,
	/\baims to\b/i,
	/\bserves as a\b/i,
	/\baligns with\b/i,
	// Additional dead giveaways
	/\b(?:elevate|streamline|resonate|vibrant|bustling|tapestry|testament|paramount|imperative|indispensable|pivotal)\b/i,
	/navigate the complexities\b/i,
];

export const UNICODE_SLOP = [
	// Tier 0 -- Unicode Forensics
	/\u2014/, // Em dash
	/\u2013/, // En dash
	/\u2026/, // Horizontal ellipsis
	/[\u201c\u201d]/, // Curly double quotes
	/[\u2018\u2019]/, // Curly single quotes
	/\u2192/, // Right arrow
	/\u2190/, // Left arrow
	/\u21d2/, // Double right arrow
	/[\u2264\u2265]/, // Less/greater-equal
	/\u2260/, // Not equal
	/\u2022/, // Bullet
	/\u00b7/, // Middle dot
	// Tier 5 -- Invisible Characters
	/\u00a0/, // Non-breaking space
	/\u200b/, // Zero-width space
	/\u202f/, // Narrow no-break space
	/\u00ad/, // Soft hyphen
	/\u200c/, // Zero-width non-joiner
	/\u200d/, // Zero-width joiner
	/[\u200e\u200f]/, // LTR/RTL marks
	/\u2060/, // Word joiner
	/\ufeff/, // BOM / ZWNBSP
];

export const SUPPRESSION_PATTERNS = [
	/#\s*noqa\b/,
	/#\s*type:\s*ignore\b/,
	/\/\/\s*eslint-disable/,
	/\/\/\s*@ts-ignore/,
	/\/\/\s*@ts-expect-error/,
	/\/\/\s*nolint/,
	/#\[allow\(/,
	/#\[cfg_attr\(.*clippy::/,
	/@Suppress\u0057arnings/, // split literal to avoid self-match by the suppression scanner
	/\/\/\s*SAFETY:.*(?:allow|ignore|suppress)/i,
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
	// Stream-guard expanded patterns
	/sk-ant-[a-z0-9-]{20,}/i,
	/sk_live_[a-zA-Z0-9]{24,}/,
	/rk_live_[a-zA-Z0-9]{24,}/,
	/bun_[a-zA-Z0-9]{36,}/,
	/github_pat_[A-Za-z0-9_]{22,}/,
	/SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/,
	/SK[a-f0-9]{32}/,
	/(?:postgres|mysql|mongodb(?:\+srv)?):\/\/[^:]+:[^@]+@/i,
	/\bsk-proj-[a-zA-Z0-9-]{20,}\b/,
	/\bvercel_[a-zA-Z0-9_-]{24,}\b/i,
	/\bsbp_[a-f0-9]{40,}\b/,
];

export const PII_PATTERNS = [
	/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i,
	/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
	/\b\d{3}-\d{2}-\d{4}\b/,
	/\b(?:\d{4}[-\s]?){3}\d{4}\b/,
	/\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/,
	/169\.254\.169\.254/,
];

export const MERGE_CONFLICT = /^(?:<{7}|={7}|>{7})\s/m;

export const TEST_FILE_RE =
	/(?:test_|_test\.|\.test\.|\.spec\.|tests\/|__tests__\/|test\.)/i;

export const META_FILE_RE =
	/(?:hooks\/scripts\/|hooks\/hooks\.json|agents\/.*\.md|templates\/.*\.md|skills\/.*\/SKILL\.md|install\.sh|CLAUDE\.md|\.claude\/plans\/)/i;

export const WORKAROUND_HARD = [
	/(?:Actually|Better|Instead),?\s+(?:let'?s|I'?ll|we(?:'ll)?)\s+(?:just|simply)/i,
	/(?:we|I)\s+(?:could|can)\s+(?:also|instead|alternatively)\s+(?:just\s+)?(?:use|do|make|change|switch|create|add)/i,
	/(?:make|change|switch)\s+\w+\s+(?:to\s+)?(?:public|private|protected|pub\b|pub\(crate\))/i,
	/Since\s+\w+\s+is\s+(?:private|internal|protected),\s+(?:I'?ll|we'?ll|let'?s)/i,
];

export const WORKAROUND_SOFT = [
	/(?:quick|simple|easy)\s+(?:fix|workaround|hack)/i,
	/(?:for now|temporarily|as a stopgap)/i,
	/while\s+(?:I'?m|we'?re)\s+here/i,
	/(?:might as well|may as well)\s+(?:also|just)/i,
];

const PROSE_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".rst", ".adoc"]);

const COMMENT_LEADER_RE = /^\s*(?:\/\/|\/\*|#|--|;|%|<!--)/;

export function isTestFile(filepath) {
	return TEST_FILE_RE.test(filepath);
}

export function isProseFile(filepath) {
	return PROSE_EXTENSIONS.has(extname(filepath).toLowerCase());
}

export function isMetaFile(filepath) {
	return META_FILE_RE.test(filepath);
}

/**
 * Read and parse JSON from stdin using event-based flowing mode.
 * Avoids readFileSync(0) which can hang on macOS (spawnSync pipe)
 * or throw EOF/EISDIR on Windows and EAGAIN on Linux.
 * @returns {Promise<object>}
 */
export function readStdin() {
	return new Promise((resolve) => {
		let data = "";
		process.stdin.setEncoding("utf-8");
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

export function _printAndExit(data) {
	process.stdout.write(`${JSON.stringify(data)}\n`);
	process.exit(0);
}

export function deny(reason, event = "PreToolUse") {
	_printAndExit({
		hookSpecificOutput: {
			hookEventName: event,
			permissionDecision: "deny",
			permissionDecisionReason: reason,
		},
	});
}

export function allow(reason = "", event = "PreToolUse", updatedInput = null) {
	const result = {
		hookSpecificOutput: { hookEventName: event, permissionDecision: "allow" },
	};
	if (reason) {
		result.hookSpecificOutput.permissionDecisionReason = reason;
	}
	if (updatedInput) {
		result.hookSpecificOutput.updatedInput = updatedInput;
	}
	_printAndExit(result);
}

export function block(reason) {
	deny(reason);
}

export function warn(message, event = "PostToolUse") {
	_printAndExit({
		suppressOutput: false,
		hookSpecificOutput: {
			hookEventName: event,
			additionalContext: message,
		},
	});
}

export function postWarn(message) {
	_printAndExit({
		suppressOutput: false,
		hookSpecificOutput: {
			hookEventName: "PostToolUse",
			additionalContext: message,
		},
	});
}

export function genericWarn(message, event = "PostToolUse") {
	warn(message, event);
}

export function genericBlock(message, event = "PreToolUse") {
	deny(message, event);
}

export function stopWarn(message) {
	process.stdout.write(
		`${JSON.stringify({ decision: "approve", reason: message })}\n`,
	);
	process.exit(0);
}

export function stopBlock(message) {
	process.stdout.write(
		`${JSON.stringify({
			decision: "block",
			reason: message,
		})}\n`,
	);
	process.exit(2);
}

export function passthrough() {
	process.exit(0);
}

export function hiddenContext(message, event = "UserPromptSubmit") {
	_printAndExit({
		suppressOutput: true,
		hookSpecificOutput: {
			hookEventName: event,
			additionalContext: message,
		},
	});
}

export function isCommentLine(line) {
	return COMMENT_LEADER_RE.test(line);
}

export function matchPlaceholders(
	filepath,
	lines,
	{ includeEmptyBody = false } = {},
) {
	const hard = [];
	const soft = [];
	const patterns = includeEmptyBody
		? [...PLACEHOLDER_HARD, ...PLACEHOLDER_EMPTY_BODY]
		: PLACEHOLDER_HARD;
	lines.forEach((line, idx) => {
		const lineNum = idx + 1;
		if (hasSuppression(line)) return;
		if (patterns.some((pat) => pat.test(line))) {
			hard.push(`  ${filepath}:${lineNum}: ${line.trim().slice(0, 80)}`);
		} else if (
			!includeEmptyBody &&
			PLACEHOLDER_EMPTY_BODY.some((pat) => pat.test(line))
		) {
			soft.push(
				`  ${filepath}:${lineNum}: ${line.trim().slice(0, 80)} [empty body]`,
			);
		} else if (
			isCommentLine(line) &&
			PLACEHOLDER_SOFT.some((pat) => pat.test(line))
		) {
			soft.push(`  ${filepath}:${lineNum}: ${line.trim().slice(0, 80)}`);
		}
	});
	return { hard, soft };
}

export function matchPrototypeScaffolding(filepath, lines) {
	const hits = [];
	lines.forEach((line, index) => {
		if (hasSuppression(line)) return;
		if (PROTOTYPE_SCAFFOLDING.some((pattern) => pattern.test(line))) {
			hits.push(`  ${filepath}:${index + 1}: ${line.trim().slice(0, 100)}`);
		}
	});
	return hits;
}

export function matchSecrets(filepath, lines) {
	const hits = [];
	lines.forEach((line, idx) => {
		if (hasSuppression(line)) return;
		for (const pat of SECRET_PATTERNS) {
			if (pat.test(line)) {
				hits.push({
					file: filepath,
					line: idx + 1,
					text: line.trim().slice(0, 80),
				});
				break;
			}
		}
	});
	return hits;
}

export function auditLog(
	event,
	hook,
	action,
	reason = "",
	tool = "",
	extra = null,
) {
	const logDir = process.env.CCA_HOOK_LOG_DIR;
	if (!logDir) return;

	const entry = {
		ts: new Date().toISOString(),
		event,
		hook,
		action,
	};
	if (reason) entry.reason = reason;
	if (tool) entry.tool = tool;
	if (extra) Object.assign(entry, extra);

	try {
		mkdirSync(logDir, { recursive: true });
		const logFile = join(logDir, "cca-hooks.jsonl");
		appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
	} catch {
		// Best-effort logging, never block on write failure
	}
}

let routeContractCache = null;

export function loadRouteContracts() {
	if (routeContractCache) return routeContractCache;
	const routeContractsPath = join(__dirname, "..", "route-contracts.json");
	if (!existsSync(routeContractsPath)) {
		routeContractCache = { skills: {}, agents: {} };
		return routeContractCache;
	}
	try {
		routeContractCache = JSON.parse(readFileSync(routeContractsPath, "utf8"));
	} catch {
		routeContractCache = { skills: {}, agents: {} };
	}
	return routeContractCache;
}
