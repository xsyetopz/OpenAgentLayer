#!/usr/bin/env node

import {
	asArray,
	asString,
	createHookRunner,
	uniqueValues,
} from "./_runtime.mjs";

const DEFAULT_PROTECTED_BRANCHES = ["main", "master", "release", "production"];

const RISKY_COMMAND_PATTERNS = [
	/\bgit\s+push\b/i,
	/\bgit\s+rebase\b/i,
	/\bgit\s+reset\b/i,
	/\bgit\s+commit\b/i,
	/\bgit\s+merge\b/i,
];

function evaluate(payload) {
	if (payload.allowProtectedBranchMutation === true) {
		return {
			decision: "warn",
			reason: "Protected branch mutation allowed by explicit override.",
		};
	}

	const currentBranch =
		asString(payload.branch) || asString(payload.currentBranch);
	if (!currentBranch) {
		return {
			decision: "pass",
			reason: "No branch context provided.",
		};
	}

	const protectedBranches = uniqueValues([
		...DEFAULT_PROTECTED_BRANCHES,
		...asArray(payload.protectedBranches).map((branch) => asString(branch)),
	]).filter(Boolean);

	if (!protectedBranches.includes(currentBranch)) {
		return {
			decision: "pass",
			reason: "Current branch is not protected.",
		};
	}

	const command =
		asString(payload.command) ||
		asString(payload.toolCommand) ||
		asString(payload.input) ||
		asString(payload.operation);
	if (!command) {
		return {
			decision: "warn",
			reason: `Protected branch detected (${currentBranch}) without command context.`,
		};
	}

	for (const pattern of RISKY_COMMAND_PATTERNS) {
		if (pattern.test(command)) {
			return {
				decision: "block",
				reason: `Protected branch mutation blocked on ${currentBranch}.`,
				details: [command],
			};
		}
	}

	return {
		decision: "pass",
		reason: `Protected branch (${currentBranch}) operation is non-mutating.`,
	};
}

createHookRunner("block-protected-branch", evaluate);
