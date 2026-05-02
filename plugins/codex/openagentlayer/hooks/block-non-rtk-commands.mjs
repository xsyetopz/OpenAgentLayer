#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const UNSAFE_DIRECT_COMMAND_PATTERN =
	/(^|\n)\s*(rm|mkdir|grep|find|sed|cat|python3?|node|bun|git)\b/i;
const RTK_PREFIX_PATTERN = /(^|\n)\s*rtk\s+/i;

function evaluate(payload) {
	const text =
		asString(payload.text) ||
		asString(payload.response) ||
		asString(payload.finalResponse) ||
		asString(payload.command);
	if (!text) {
		return { decision: "pass", reason: "No prose or command text to inspect." };
	}

	if (
		UNSAFE_DIRECT_COMMAND_PATTERN.test(text) &&
		!RTK_PREFIX_PATTERN.test(text)
	) {
		return {
			decision: "block",
			reason: "RTK-managed command guidance must use the rtk prefix.",
			details: [
				text.split("\n").find((line) => line.trim().length > 0) ?? text,
			],
		};
	}

	return {
		decision: "pass",
		reason: "RTK command guidance is prefixed safely.",
	};
}

createHookRunner("block-non-rtk-commands", evaluate);
