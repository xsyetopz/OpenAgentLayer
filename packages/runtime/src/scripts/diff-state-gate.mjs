#!/usr/bin/env bun
const policyId = "diff-state-gate";

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
	const dirty =
		meta.dirty === true ||
		(typeof meta.files_changed === "number" && meta.files_changed > 0) ||
		(Array.isArray(meta.changed_paths) && meta.changed_paths.length > 0);
	if (!dirty) {
		return {
			decision: "allow",
			policy_id: policyId,
			message: "No dirty diff state reported.",
		};
	}
	return {
		context: { dirty: true },
		decision: meta.require_clean_tree === true ? "deny" : "warn",
		policy_id: policyId,
		message: "Dirty diff state reported.",
	};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
