#!/usr/bin/env node

import { readFileSync } from "node:fs";

const DECISIONS = new Set(["pass", "warn", "block"]);

function readInputFromStdin() {
	if (process.stdin.isTTY) {
		return "";
	}

	return readFileSync(0, "utf8");
}

function readRawInput() {
	const inputArg = process.argv[2];
	if (inputArg && inputArg !== "-") {
		return readFileSync(inputArg, "utf8");
	}

	return readInputFromStdin();
}

function parsePayload(raw) {
	const trimmed = raw.trim();
	if (trimmed.length === 0) {
		return { payload: {} };
	}

	try {
		const value = JSON.parse(trimmed);
		if (value && typeof value === "object" && !Array.isArray(value)) {
			return { payload: value };
		}

		return {
			payload: {},
			malformed: "Input JSON must be an object.",
		};
	} catch (error) {
		return {
			payload: {},
			malformed: error instanceof Error ? error.message : "Invalid JSON input.",
		};
	}
}

function printOutcome(outcome) {
	process.stdout.write(`${JSON.stringify(outcome)}\n`);
}

function providerOutcome(payload, outcome) {
	if (outcome.decision !== "block") return outcome;
	const reason = [
		outcome.reason,
		...(Array.isArray(outcome.details) ? outcome.details : []),
	]
		.filter(Boolean)
		.join("\n");
	if (payload.hook_event_name === "PreToolUse") {
		return {
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: reason,
			},
		};
	}
	return {
		...outcome,
		hookSpecificOutput: {
			hookEventName: "PreToolUse",
			permissionDecision: "deny",
			permissionDecisionReason: reason,
		},
		permissionDecision: "deny",
		permissionDecisionReason: reason,
	};
}

export function createHookRunner(hook, evaluate) {
	const rawInput = readRawInput();
	const { payload, malformed } = parsePayload(rawInput);

	if (malformed) {
		printOutcome({
			hook,
			decision: "block",
			reason: "Malformed hook input.",
			details: [malformed],
		});
		process.exitCode = 1;
		return;
	}

	const outcome = evaluate(payload);
	if (!(outcome && DECISIONS.has(outcome.decision))) {
		printOutcome({
			hook,
			decision: "block",
			reason: "Hook returned an invalid decision.",
		});
		process.exitCode = 1;
		return;
	}

	printOutcome(
		providerOutcome(payload, {
			hook,
			decision: outcome.decision,
			reason: outcome.reason,
			details: Array.isArray(outcome.details) ? outcome.details : undefined,
		}),
	);
	if (outcome.decision === "block" && payload.hook_event_name !== "PreToolUse")
		process.exitCode = 2;
}

export function asArray(value) {
	return Array.isArray(value) ? value : [];
}

export function asObject(value) {
	return value && typeof value === "object" && !Array.isArray(value)
		? value
		: {};
}

export function asString(value) {
	return typeof value === "string" ? value : "";
}

export function uniqueValues(values) {
	return [...new Set(values)];
}
