#!/usr/bin/env node

import { evaluateLifecycleContextInjection } from "./_context-injection.mjs";
import { asString, createHookRunner } from "./_runtime.mjs";

const SUBAGENT_EVENTS = new Set(["SubagentStart", "subagent.started"]);
const USER_PROMPT_EVENTS = new Set(["UserPromptSubmit", "user.prompt.submit"]);
const USER_PROMPT_GUIDANCE = [
	"Autonomous OAL reminder: invoke `$oal` guidance and default to bounded native OAL subagents for code implementation, review, tests, docs, tracing, provider checks, and other splittable work.",
	"Before manual parent work, split any independent ownership, provider, package, test tier, review perspective, documentation lookup, or repeated batch item into the relevant rendered agent and keep useful local progress moving.",
	"Do not switch to doing the whole task manually after one subagent attempt; run the same `$oal` cycle again with tighter scope, clearer ownership, or a different relevant OAL agent.",
	"Use manual parent work only to recover from subagent failure, stalls, or regressions; capture the failure evidence, repair the blocker, then resume the `$oal` subagent cycle.",
];
const SUBAGENT_GUIDANCE = [
	"Native multi_agent_v2 is OAL's default Codex orchestration path: subagents are encouraged for split work, and each child stays inside the assigned ownership scope",
	"Custom OAL agent names and aliases are rendered in .codex/config.toml [agents] and AGENTS.md; parent agents should spawn those names directly when work can split",
	"Implementation workers such as hephaestus, daedalus, demeter, hecate, and prometheus use GPT-5.3-Codex in Codex model plans; significant or separable coding tasks should be routed to them instead of keeping all edits in the GPT-5.5 parent.",
	"Each assignment must fit inside the configured job runtime cap; if the requested scope is too broad, return the smallest useful evidence slice or a precise blocker instead of expanding work.",
	"Parent thread owns task split, child launch, evidence merge, continuation, and final decision",
	"Workers return final evidence and artifacts to the parent; do not spawn extra pooled threads or keep idle workers open",
	"Close or hand back promptly when the assigned output is complete, blocked, or no longer needed; stalled background work wastes token budget.",
	"Use `opendex` or `oal opendex` only when the task explicitly needs the external control plane",
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
	if (USER_PROMPT_EVENTS.has(event))
		return {
			decision: "warn",
			reason: "OAL subagent reminder",
			details: USER_PROMPT_GUIDANCE,
		};
	if (!SUBAGENT_EVENTS.has(event))
		return evaluateLifecycleContextInjection(payload);
	return {
		decision: "warn",
		reason: "OAL native multi-agent subagent context",
		details: SUBAGENT_GUIDANCE,
	};
}

createHookRunner("inject-subagent-context", evaluateSubagentContextInjection);
