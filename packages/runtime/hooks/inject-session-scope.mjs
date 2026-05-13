#!/usr/bin/env node

import { asString, createHookRunner } from "./_runtime.mjs";

const SESSION_EVENTS = new Set(["SessionStart", "session.created"]);
const SESSION_SCOPE_DETAILS = [
	"Before work: read repo instructions plus route and skill contracts that match the task",
	"Consent boundary: examples, corrections, suggested names, and partial ideas are input evidence for the requested behavior only",
	"Shared workspace rule: you are not alone in the codebase; assume any pre-existing, non-AI-authored, or unexplained change is user-owned and do not revert, reformat, overwrite, move, delete, or stage it without explicit user permission",
	"Scope rule: compatibility aliases, parser fallbacks, extra behavior, guardrails, docs, cleanup, and adjacent changes need explicit user request or controlling source requirement",
	"Edit rule: use apply_patch for focused edits; use bounded python3 rewrites for broad mechanical changes when many patch hunks would be fragile, then inspect the final diff",
	"Delegation rule: assume native Codex subagents are encouraged for broad or parallelizable work; split independent sidecar tasks early when ownership, providers, packages, tests, docs, or investigations can run in parallel",
	"Spawn budget rule: before spawning, name each child owner, expected output, and why it fits the configured job runtime cap; assign bounded work only, avoid speculative fan-out, do not leave background agents running after their result is no longer needed, and close completed or idle agents promptly.",
	"Continuity rule: multi-step work keeps a short user-visible Continuation Record with objective, done, next, and blockers when compaction, handoff, or resume risk appears; current user messages and verified repo evidence define the active path",
	"Agent use: use native Codex multi_agent_v2 as the Codex default orchestration path. Spawn rendered OAL custom agents by name without waiting for user wording when work can split; wait only when blocked, and merge only final summaries, diff evidence, and validation results.",
	"Skill use: for OAL source, renderer, provider, hook, deploy, plugin, or acceptance work, invoke `$oal:oal` implicitly before editing so source-truth and generated-artifact boundaries stay active.",
	"Solo rule: keep a narrow single-owner edit local and record the solo ownership reason before editing.",
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
