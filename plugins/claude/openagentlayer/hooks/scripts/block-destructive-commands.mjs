#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const BLOCK_PATTERNS = [
	/\brm\s+-rf\b/i,
	/\bgit\s+reset\s+--hard\b/i,
	/\bgit\s+clean\s+-[^\n]*f[^\n]*d\b/i,
	/\bdd\s+if=/i,
	/\bmkfs(\.[^\s]+)?\b/i,
	/\bshutdown\b/i,
	/\breboot\b/i,
	/:\(\)\s*\{\s*:\|:&\s*};\s*:/i,
];

function evaluate(payload) {
	if (payload.allowDestructive === true) {
		return {
			decision: "warn",
			reason: "Destructive operation allowed by explicit override.",
		};
	}

	const command =
		asString(payload.command) ||
		asString(payload.toolCommand) ||
		asString(payload.input) ||
		asString(payload.rawCommand);
	if (!command) {
		return {
			decision: "pass",
			reason: "No command input provided.",
		};
	}

	for (const pattern of BLOCK_PATTERNS) {
		if (pattern.test(command)) {
			return {
				decision: "block",
				reason: "Destructive command blocked.",
				details: [command],
			};
		}
	}

	return {
		decision: "pass",
		reason: "Command did not match destructive patterns.",
	};
}

createHookRunner("block-destructive-commands", evaluate);
