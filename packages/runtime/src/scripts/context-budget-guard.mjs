#!/usr/bin/env bun
const policyId = "context-budget-guard";
const lowContextTokenThreshold = 4000;

async function readStdin() {
	let text = "";
	for await (const chunk of process.stdin) text += chunk;
	return text.trim() === "" ? {} : JSON.parse(text);
}

function metadata(payload) {
	return payload?.metadata && typeof payload.metadata === "object"
		? payload.metadata
		: {};
}

function evaluate(payload) {
	const meta = metadata(payload);
	const compacting =
		meta.compaction === true ||
		(payload?.event ?? "").toLowerCase().includes("compact");
	const remaining = meta.remaining_context_tokens;
	if (
		!compacting &&
		(typeof remaining !== "number" || remaining > lowContextTokenThreshold)
	) {
		return {
			decision: "allow",
			policy_id: policyId,
			message: "Context budget is sufficient.",
		};
	}
	return {
		context: {
			prompt_append:
				"Before compaction or low-context continuation, preserve OAL route, changed files, validation state, blockers, and next command.",
		},
		decision: "context",
		policy_id: policyId,
		message: "Context preservation guidance emitted.",
	};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
