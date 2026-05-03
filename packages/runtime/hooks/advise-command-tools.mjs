#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const RECURSIVE_GREP_PATTERN = /\bgrep\s+-R\b/;
const UNBOUNDED_FIND_PATTERN = /\bfind\s+\.\b/;
const TRACKED_ONLY_PATTERN = /\b(git\s+ls-files|rg\s+--files)\b/;
const REGEX_CONFIG_EDIT_PATTERN = /\b(sed|perl)\b[\s\S]*\.(json|ya?ml)\b/i;

function evaluate(payload) {
	const command = asString(payload.command) || asString(payload.input);
	if (REGEX_CONFIG_EDIT_PATTERN.test(command)) {
		return {
			decision: "warn",
			reason: "JSON/YAML edits use 'jq'/'yq' or typed code.",
			details: [command],
		};
	}
	if (
		RECURSIVE_GREP_PATTERN.test(command) ||
		UNBOUNDED_FIND_PATTERN.test(command)
	) {
		return {
			decision: "warn",
			reason:
				"Prefer rg or fd with explicit bounds; use tracked-file inventory when ignored files must stay out of scope.",
			details: [
				"Use: rg <pattern> -g '<glob>'",
				"Use: fd <pattern> <path>",
				"Use: git ls-files <pathspec>",
				"Note: rg and fd respect .gitignore by default; git ls-files is tracked-only.",
				command,
			],
		};
	}
	if (TRACKED_ONLY_PATTERN.test(command)) {
		return {
			decision: "pass",
			reason: "Search command uses bounded or tracked-file inventory.",
		};
	}
	return {
		decision: "pass",
		reason: "Command tool guidance found no advisory issue.",
	};
}

createHookRunner("advise-command-tools", evaluate);
