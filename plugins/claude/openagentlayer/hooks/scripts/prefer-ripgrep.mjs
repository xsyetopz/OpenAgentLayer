#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const RECURSIVE_GREP_PATTERN = /\bgrep\s+-R\b/;
const UNBOUNDED_FIND_PATTERN = /\bfind\s+\.\b/;

function evaluate(payload) {
	const command = asString(payload.command) || asString(payload.input);
	if (
		RECURSIVE_GREP_PATTERN.test(command) ||
		UNBOUNDED_FIND_PATTERN.test(command)
	) {
		return {
			decision: "warn",
			reason:
				"Prefer rg or fd with explicit bounds to reduce token-heavy scans.",
			details: [command],
		};
	}
	return {
		decision: "pass",
		reason: "Search command is bounded or tool-efficient.",
	};
}

createHookRunner("prefer-ripgrep", evaluate);
