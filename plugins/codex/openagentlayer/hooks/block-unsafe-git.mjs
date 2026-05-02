#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const UNSAFE_GIT_PATTERNS = [
	/\bgit\s+push\s+--force(?:-with-lease)?\b/i,
	/\bgit\s+reset\s+--hard\b/i,
	/\bgit\s+clean\s+-[^\n]*f[^\n]*d\b/i,
	/\bgit\s+checkout\s+--\s+\./i,
	/\bgit\s+commit\b(?![\s\S]*(Co-authored-by|--trailer))/i,
];

function evaluate(payload) {
	if (payload.allowUnsafeGit === true) {
		return {
			decision: "warn",
			reason: "Unsafe git operation allowed by explicit override.",
		};
	}

	const command =
		asString(payload.command) ||
		asString(payload.toolCommand) ||
		asString(payload.input) ||
		asString(payload.rawCommand);
	if (!command) {
		return { decision: "pass", reason: "No git command input provided." };
	}

	const unsafePattern = UNSAFE_GIT_PATTERNS.find((pattern) =>
		pattern.test(command),
	);
	if (unsafePattern) {
		return {
			decision: "block",
			reason: "Unsafe git operation blocked.",
			details: [command],
		};
	}

	return { decision: "pass", reason: "Git command passed safety checks." };
}

createHookRunner("block-unsafe-git", evaluate);
