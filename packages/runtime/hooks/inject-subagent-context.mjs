#!/usr/bin/env node

import { evaluateLifecycleContextInjection } from "./_context-injection.mjs";
import { asString, createHookRunner } from "./_runtime.mjs";

const SUBAGENT_EVENTS = new Set(["SubagentStart", "subagent.started"]);
const SUBAGENT_GUIDANCE = [
	"Native multi_agent_v2 is OAL's default Codex orchestration path: use rendered OAL agent names and stay inside the assigned ownership scope",
	"Custom OAL agent names and aliases are rendered in .codex/config.toml [agents] and AGENTS.md; use those names explicitly because Codex does not infer them from intent alone",
	"Parent thread owns task split, child launch, evidence merge, continuation, and final decision",
	"Workers return final evidence and artifacts to the parent; do not spawn extra pooled threads or keep idle workers open",
	"Use `opendex`, `oal opendex`, or `oal symphony <WORKFLOW.md>` only when the task explicitly needs those external control planes",
];

function hookEvent(payload) {
	return (
		asString(payload.hook_event_name) ||
		asString(payload.hookEventName) ||
		asString(payload.event) ||
		asString(process.env.OAL_HOOK_EVENT)
	);
}

export function evaluateSubagentContextInjection(payload) {
	const event = hookEvent(payload);
	if (!SUBAGENT_EVENTS.has(event))
		return evaluateLifecycleContextInjection(payload);
	return {
		decision: "warn",
		reason: "OAL native multi-agent subagent context",
		details: SUBAGENT_GUIDANCE,
	};
}

createHookRunner("inject-subagent-context", evaluateSubagentContextInjection);
