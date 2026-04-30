#!/usr/bin/env bun
const policyId = "stale-generated-artifact-guard";

async function readStdin() {
	let text = "";
	for await (const chunk of process.stdin) text += chunk;
	return text.trim() === "" ? {} : JSON.parse(text);
}

function evaluate(payload) {
	const metadata =
		payload?.metadata && typeof payload.metadata === "object"
			? payload.metadata
			: {};
	const stalePaths = Array.isArray(metadata.stale_paths)
		? metadata.stale_paths.filter((path) => typeof path === "string")
		: [];
	if (metadata.generated_stale !== true && stalePaths.length === 0) {
		return {
			decision: "allow",
			policy_id: policyId,
			message: "No stale generated artifacts reported.",
		};
	}
	return {
		context: { stale_paths: stalePaths },
		decision: "deny",
		policy_id: policyId,
		message: "Stale generated artifacts blocked.",
	};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
