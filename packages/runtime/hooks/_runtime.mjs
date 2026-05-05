#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { styleHookLines, styleHookMessage } from "./_hook-style.mjs";

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
			malformed: "Input JSON needs an object shape",
		};
	} catch (error) {
		return {
			payload: {},
			malformed:
				error instanceof Error
					? error.message
					: "JSON input needs valid syntax",
		};
	}
}

function printOutcome(outcome) {
	process.stdout.write(`${JSON.stringify(outcome)}\n`);
}

function printFeedback(outcome, event) {
	const reason = styledReasonText(outcome, event);
	if (reason) process.stderr.write(`${reason}\n`);
}

function hookEvent(payload) {
	return (
		asString(payload.hook_event_name) ||
		asString(payload.hookEventName) ||
		asString(process.env.OAL_HOOK_EVENT)
	);
}

function hookProvider(payload) {
	return (
		asString(payload.provider) ||
		asString(payload.hook_provider) ||
		asString(process.env.OAL_HOOK_PROVIDER) ||
		"codex"
	);
}

function styledReasonText(outcome, event) {
	const level = outcomeLevel(outcome, event);
	return [
		styleHookMessage(level, outcome.reason),
		...styleHookLines(
			"note",
			Array.isArray(outcome.details) ? outcome.details : [],
		),
	]
		.filter(Boolean)
		.join("\n");
}

function outcomeLevel(outcome, event) {
	if (outcome.decision === "warn") return "warn";
	if (outcome.decision === "block" && event !== "PreToolUse") return "fatal";
	if (outcome.decision === "block") return "error";
	return "note";
}

function isStopEvent(event) {
	return event === "Stop" || event === "SubagentStop";
}

function preToolUseDeny(reason) {
	return {
		hookSpecificOutput: {
			hookEventName: "PreToolUse",
			permissionDecision: "deny",
			permissionDecisionReason: reason,
		},
	};
}

function codexOutcome(event, outcome) {
	const reason = styledReasonText(outcome, event);
	switch (outcome.decision) {
		case "pass":
			return undefined;
		case "warn":
			return event === "SessionStart"
				? {
						continue: true,
						systemMessage: reason,
						hookSpecificOutput: {
							hookEventName: "SessionStart",
							additionalContext: reason,
						},
					}
				: undefined;
		default:
			if (event === "PreToolUse") {
				return preToolUseDeny(reason);
			}
			if (isStopEvent(event)) {
				return {
					continue: false,
					stopReason: reason,
					systemMessage: reason,
				};
			}
			return { continue: true, systemMessage: reason };
	}
}

function claudeOutcome(event, outcome) {
	const reason = styledReasonText(outcome, event);
	switch (outcome.decision) {
		case "pass":
			return undefined;
		case "warn":
			return {
				suppressOutput: false,
				hookSpecificOutput: {
					hookEventName: event || "SessionStart",
					additionalContext: reason,
				},
			};
		default:
			if (event === "PreToolUse") return preToolUseDeny(reason);
			if (isStopEvent(event)) return { decision: "block", reason };
			return {
				suppressOutput: false,
				hookSpecificOutput: {
					hookEventName: event || "PostToolUse",
					additionalContext: reason,
				},
			};
	}
}

function providerOutcome(payload, outcome) {
	const event = hookEvent(payload);
	const provider = hookProvider(payload);
	if (process.env.OAL_HOOK_RAW_OUTCOME === "1") return outcome;
	if (provider === "claude") return claudeOutcome(event, outcome);
	return codexOutcome(event, outcome);
}

export function createHookRunner(hook, evaluate) {
	const rawInput = readRawInput();
	const { payload, malformed } = parsePayload(rawInput);

	if (malformed) {
		printOutcome(
			providerOutcome(payload, {
				hook,
				decision: "block",
				reason: "Hook input needs valid JSON",
				details: [malformed],
			}) ?? { continue: false, systemMessage: malformed },
		);
		process.exitCode = 1;
		return;
	}

	const outcome = evaluate(payload);
	if (!(outcome && DECISIONS.has(outcome.decision))) {
		printOutcome(
			providerOutcome(payload, {
				hook,
				decision: "block",
				reason: "Hook decision needs pass, warn, or block",
			}) ?? {
				continue: false,
				systemMessage: "Hook decision needs pass, warn, or block",
			},
		);
		process.exitCode = 1;
		return;
	}

	const formatted = providerOutcome(payload, {
		hook,
		decision: outcome.decision,
		reason: outcome.reason,
		details: Array.isArray(outcome.details) ? outcome.details : undefined,
	});
	if (formatted) printOutcome(formatted);
	if (outcome.decision === "block" && hookEvent(payload) !== "PreToolUse") {
		printFeedback(
			{
				hook,
				decision: outcome.decision,
				reason: outcome.reason,
				details: Array.isArray(outcome.details) ? outcome.details : undefined,
			},
			hookEvent(payload),
		);
		process.exitCode = 2;
	}
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
