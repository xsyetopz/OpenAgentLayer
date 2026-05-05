import { extractCommand, extractCommands } from "./_payload.mjs";

const DESTRUCTIVE_COMMAND_PATTERNS = [
	/\brm\s+-[a-z]*[rf][a-z]*\s+(?:--\s+)?(?:\/|~|\.\.?)(?:\s|$)/i,
	/\brm\s+-[a-z]*[rf][a-z]*\b/i,
	/\bgit\s+reset\s+--hard\b/i,
	/\bgit\s+clean\s+-[^\n]*f[^\n]*d\b/i,
	/\bdd\s+(?:if|of)=/i,
	/\bmkfs(?:\.[^\s]+)?\b/i,
	/\bdiskutil\s+erase/i,
	/\bshutdown\b/i,
	/\breboot\b/i,
	/\bchmod\s+-R\s+777\b/i,
	/\bchown\s+-R\b/i,
	/\b(?:curl|wget)\b[^\n|;]*(?:\||>)\s*(?:sudo\s+)?(?:sh|bash)\b/i,
	/:\(\)\s*\{\s*:\|:&\s*};\s*:/i,
];

const UNSAFE_GIT_PATTERNS = [
	/\bgit\s+push\b[^\n]*(?:--force|\+\S+)/i,
	/\bgit\s+reset\s+--hard\b/i,
	/\bgit\s+clean\s+-[^\n]*f[^\n]*d\b/i,
	/\bgit\s+checkout\s+--\s+\./i,
	/\bgit\s+restore\b[^\n]*(?:--source|\.)/i,
	/\bgit\s+commit\b(?![\s\S]*(Co-authored-by|--trailer))/i,
	/\bgit\s+filter-branch\b/i,
	/\bgit\s+rebase\b/i,
];

const PROTECTED_BRANCH_MUTATION_PATTERNS = [
	/\bgit\s+push\b/i,
	/\bgit\s+rebase\b/i,
	/\bgit\s+reset\b/i,
	/\bgit\s+commit\b/i,
	/\bgit\s+merge\b/i,
	/\bgit\s+cherry-pick\b/i,
	/\bgit\s+tag\b/i,
];

export function evaluateDestructiveCommand(payload) {
	if (payload.allowDestructive === true) {
		return {
			decision: "warn",
			reason: "Destructive operation allowed by explicit override",
		};
	}
	return evaluateCommandPatterns(
		extractCommands(payload),
		DESTRUCTIVE_COMMAND_PATTERNS,
		"Command input absent.",
		"Use bounded file and git operations for this command",
		"Command matches safe pattern set.",
	);
}

export function evaluateUnsafeGit(payload) {
	if (payload.allowUnsafeGit === true) {
		return {
			decision: "warn",
			reason: "Unsafe git operation allowed by explicit override",
		};
	}
	return evaluateCommandPatterns(
		extractCommands(payload),
		UNSAFE_GIT_PATTERNS,
		"Git command input absent.",
		"Use reviewed git operations for this command",
		"Git command passed safety checks.",
	);
}

export function isProtectedBranchMutation(payload) {
	const command = extractCommand(payload);
	return PROTECTED_BRANCH_MUTATION_PATTERNS.some((pattern) =>
		pattern.test(command),
	);
}

function evaluateCommandPatterns(
	commands,
	patterns,
	missingReason,
	blockReason,
	passReason,
) {
	if (commands.length === 0) return { decision: "pass", reason: missingReason };
	for (const command of commands) {
		if (patterns.some((pattern) => pattern.test(command))) {
			return { decision: "block", reason: blockReason, details: [command] };
		}
	}
	return { decision: "pass", reason: passReason };
}
