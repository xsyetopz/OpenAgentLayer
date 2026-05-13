#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const SESSION_EVENTS = new Set(["SessionStart", "session.created"]);
const SESSION_SCOPE_DETAILS = [
	"Before work: read the repo instructions plus route and skill contracts that match the task.",
	"Consent boundary: examples, corrections, suggested names, and partial ideas are input evidence for the requested behavior only",
	"Shared workspace rule: you are not alone in the codebase; assume any pre-existing, non-AI-authored, or unexplained change is user-owned and do not revert, reformat, overwrite, move, delete, or stage it without explicit user permission",
	"Scope rule: compatibility aliases, parser fallbacks, extra behavior, guardrails, docs, cleanup, and adjacent changes need explicit user request or controlling source requirement",
	"Edit rule: change authored source first; use apply_patch for focused edits and inspect the final diff.",
	"Delegation rule: split broad work into bounded owners early; name each child owner, output, runtime fit, and close idle agents promptly.",
	"Workflow rule: obey hook replacement commands exactly; use raw proxy fallbacks only as a last resort after RTK options are exhausted.",
	"Evidence rule: report changed behavior and validation evidence, or return STATUS BLOCKED with Attempted, Evidence, and Need.",
];

function hookEvent(payload) {
	return (
		asString(payload.hook_event_name) ||
		asString(payload.hookEventName) ||
		asString(payload.event) ||
		asString(process.env.OAL_HOOK_EVENT)
	);
}

export function evaluateSessionScopeInjection(payload) {
	const event = hookEvent(payload);
	if (!(SESSION_EVENTS.has(event) || !event)) {
		return {
			decision: "pass",
			reason: "Session scope receipt applies at session start",
		};
	}
	return {
		decision: "warn",
		reason: "OAL session scope receipt",
		details: SESSION_SCOPE_DETAILS,
	};
}

createHookRunner("inject-session-scope", evaluateSessionScopeInjection);
