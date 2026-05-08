#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const SESSION_EVENTS = new Set(["SessionStart", "session.created"]);
const SESSION_SCOPE_DETAILS = [
	"Before work: read repo instructions plus route and skill contracts that match the task",
	"Consent boundary: examples, corrections, suggested names, and partial ideas are input evidence for the requested behavior only",
	"Scope rule: compatibility aliases, parser fallbacks, extra behavior, guardrails, docs, cleanup, and adjacent changes need explicit user request or controlling source requirement",
	"Edit rule: use apply_patch for focused edits; use bounded python3 rewrites for broad mechanical changes when many patch hunks would be fragile, then inspect the final diff",
	"Delegation rule: broad implementation work uses subagents or the orchestrate route when ownership, providers, packages, tests, or investigations can split; narrow single-owner edits begin with a recorded solo ownership reason",
	"Continuity rule: multi-step work keeps a short user-visible Continuation Record with objective, done, next, and blockers when compaction, handoff, or resume risk appears; current user messages and verified repo evidence define the active path",
	"Agent use: use OpenDex/Symphony as the Codex default orchestration path. Native Codex multi_agent or multi_agent_v2 is explicit profile opt-in only. In default Codex profiles, use `oal codex peer batch <task>`, `opendex`, `oal opendex`, or Symphony workflow commands for bounded orchestration. When native subagents are enabled, spawn rendered OAL custom agents by name, wait for their results, and merge only final summaries, diff evidence, and validation results in the parent thread.",
	"Workflow rule: use required route, skill, and subagent paths; ask when blocked instead of silently changing workflow",
	"Blocked path: when source truth or scope is ambiguous, return STATUS BLOCKED with Attempted, Evidence, and Need",
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
