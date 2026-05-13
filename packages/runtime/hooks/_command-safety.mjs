import { extractCommand, extractCommands } from "./_payload.mjs";
import { asArray, asString, uniqueValues } from "./_runtime.mjs";

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
	/\bgit\s+filter-branch\b/i,
	/\bgit\s+rebase\b/i,
];

const GIT_COMMIT_PATTERN = /\bgit\s+commit\b/i;
const COMMIT_FILE_PATTERN = /(?:^|\s)(?:-F|--file)(?:=|\s+)\S+/i;
const CO_AUTHOR_PATTERN =
	/(?:Co-authored-by:\s*[^<\n]+<[^>\n]+>|--trailer(?:=|\s+)["']?Co-authored-by:\s*[^<\n]+<[^>\n"']+>["']?)/i;
const MESSAGE_PATTERN =
	/(?:^|\s)(?:-m|--message)(?:=|\s+)(?:"([^"]*)"|'([^']*)'|(\S+))/gi;
const CONVENTIONAL_COMMIT_SUBJECT_PATTERN =
	/^[a-z][a-z0-9-]*(?:\([^)]+\))?!?: .+/;

const PROTECTED_BRANCH_MUTATION_PATTERNS = [
	/\bgit\s+push\b/i,
	/\bgit\s+rebase\b/i,
	/\bgit\s+reset\b/i,
	/\bgit\s+commit\b/i,
	/\bgit\s+merge\b/i,
	/\bgit\s+cherry-pick\b/i,
	/\bgit\s+tag\b/i,
];

const DEFAULT_PROTECTED_BRANCHES = ["main", "master", "release", "production"];

export function evaluateCommandSafety(payload) {
	for (const evaluate of [
		evaluateProtectedBranchMutation,
		evaluateUnsafeGit,
		evaluateDestructiveCommand,
	]) {
		const result = evaluate(payload);
		if (result.decision !== "pass") return result;
	}
	return {
		decision: "pass",
		reason: "Command passed safety checks",
	};
}

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
		{ checkCommit: true },
	);
}

export function isProtectedBranchMutation(payload) {
	const command = extractCommand(payload);
	return PROTECTED_BRANCH_MUTATION_PATTERNS.some((pattern) =>
		pattern.test(command),
	);
}

export function evaluateProtectedBranchMutation(payload) {
	if (payload.allowProtectedBranchMutation === true) {
		return {
			decision: "warn",
			reason: "Protected branch mutation allowed by explicit override",
		};
	}

	const currentBranch =
		asString(payload.branch) || asString(payload.currentBranch);
	if (!currentBranch) {
		return {
			decision: "pass",
			reason: "Branch context absent",
		};
	}

	const protectedBranches = uniqueValues([
		...DEFAULT_PROTECTED_BRANCHES,
		...asArray(payload.protectedBranches).map((branch) => asString(branch)),
	]).filter(Boolean);

	if (!protectedBranches.includes(currentBranch)) {
		return {
			decision: "pass",
			reason: "Current branch outside protected set",
		};
	}

	if (!isProtectedBranchMutation(payload)) {
		return {
			decision: "pass",
			reason: `Protected branch (\`${currentBranch}\`) operation is non-mutating`,
		};
	}

	return {
		decision: "block",
		reason: `Protected branch mutation blocked on \`${currentBranch}\``,
		details: [
			asString(payload.command) ||
				asString(payload.toolCommand) ||
				asString(payload.operation),
		].filter(Boolean),
	};
}

function evaluateCommandPatterns(
	commands,
	patterns,
	missingReason,
	blockReason,
	passReason,
	options = {},
) {
	if (commands.length === 0) return { decision: "pass", reason: missingReason };
	for (const command of commands) {
		if (options.checkCommit === true) {
			const commitDecision = evaluateGitCommitCommand(command, blockReason);
			if (commitDecision) return commitDecision;
		}
		if (patterns.some((pattern) => pattern.test(command))) {
			return { decision: "block", reason: blockReason, details: [command] };
		}
	}
	return { decision: "pass", reason: passReason };
}

function evaluateGitCommitCommand(command, blockReason) {
	if (!GIT_COMMIT_PATTERN.test(command)) return undefined;
	if (COMMIT_FILE_PATTERN.test(command)) return undefined;
	if (!CO_AUTHOR_PATTERN.test(command)) {
		return { decision: "block", reason: blockReason, details: [command] };
	}

	const subject = firstCommitMessage(command);
	if (subject && !CONVENTIONAL_COMMIT_SUBJECT_PATTERN.test(subject.trim())) {
		return {
			decision: "block",
			reason: "Commit subject must follow Conventional Commits",
			details: [command],
		};
	}

	return undefined;
}

function firstCommitMessage(command) {
	MESSAGE_PATTERN.lastIndex = 0;
	const match = MESSAGE_PATTERN.exec(command);
	return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}
