#!/usr/bin/env node

import { evaluateLifecycleContextInjection } from "./_context-injection.mjs";
import { asString, createHookRunner } from "./_runtime.mjs";

const SUBAGENT_EVENTS = new Set(["SubagentStart", "subagent.started"]);
const OPENDEX_GUIDANCE = [
	"OpenDex/Symphony is OAL's default orchestration path: keep native multi_agent and multi_agent_v2 disabled unless the rendered profile explicitly selected them",
	"Parent thread owns task split, child launch, evidence merge, continuation, and final decision",
	"Workers return final evidence and artifacts to the parent; do not spawn extra pooled threads or keep idle workers open",
	"Use `opendex` or `oal opendex` for OpenDex daemon/control-plane checks, and use Symphony workflow commands for bounded issue/workspace orchestration",
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
		reason: "OAL OpenDex/Symphony subagent context",
		details: OPENDEX_GUIDANCE,
	};
}

createHookRunner("inject-subagent-context", evaluateSubagentContextInjection);
