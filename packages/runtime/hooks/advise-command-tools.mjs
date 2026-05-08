#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const RECURSIVE_GREP_PATTERN = /\bgrep\s+-R\b/;
const UNBOUNDED_FIND_PATTERN = /\bfind\s+\.\b/;
const UNBOUNDED_TREE_PATTERN = /\btree\s+(?:\.|$)/;
const RECURSIVE_LS_PATTERN = /\bls\s+-[A-Za-z]*R[A-Za-z]*\s+(?:\.|$)/;
const BROAD_FD_PATTERN = /\bfd\s+\.?\s+(?:\.|$)/;
const TRACKED_ONLY_PATTERN = /\b(git\s+ls-files|rg\s+--files)\b/;
const REGEX_CONFIG_EDIT_PATTERN = /\b(sed|perl)\b[\s\S]*\.(json|ya?ml)\b/i;

function evaluate(payload) {
	const command = asString(payload.command) || asString(payload.input);
	if (REGEX_CONFIG_EDIT_PATTERN.test(command)) {
		return {
			decision: "warn",
			reason: "JSON/YAML edits use 'jq'/'yq' or typed code",
			details: [command],
		};
	}
	if (
		RECURSIVE_GREP_PATTERN.test(command) ||
		UNBOUNDED_FIND_PATTERN.test(command) ||
		UNBOUNDED_TREE_PATTERN.test(command) ||
		RECURSIVE_LS_PATTERN.test(command) ||
		BROAD_FD_PATTERN.test(command)
	) {
		return {
			decision: "warn",
			reason:
				"Large-codebase exploration needs an owner, explicit bounds, and tracked inventory when ignored files must stay out of scope",
			details: [
				"First: name the package/module/route/provider surface this task owns.",
				"Use: rtk grep <pattern> <path> --max <n> --file-type <type>",
				"Use: rtk find <path> -maxdepth <n> -type f -name '<glob>'",
				"Use: fd <pattern> <path> --max-depth <n> --max-results <n>",
				"Use: git ls-files <pathspec>",
				"Fallback after RTK mismatch: inspect help first, then use plain `rg -n ... | head -n <n>` and `sed -n '1,<n>p' <file>`.",
				"Note: rg and fd respect .gitignore by default; git ls-files is tracked-only.",
				command,
			],
		};
	}
	if (TRACKED_ONLY_PATTERN.test(command)) {
		return {
			decision: "pass",
			reason: "Search command uses bounded or tracked-file inventory",
		};
	}
	return {
		decision: "pass",
		reason: "Command tool guidance found no advisory issue",
	};
}

createHookRunner("advise-command-tools", evaluate);
