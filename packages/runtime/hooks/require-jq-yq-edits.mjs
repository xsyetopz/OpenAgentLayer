#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

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
	return {
		decision: "pass",
		reason: "Structured config edit command is acceptable.",
	};
}

createHookRunner("require-jq-yq-edits", evaluate);
