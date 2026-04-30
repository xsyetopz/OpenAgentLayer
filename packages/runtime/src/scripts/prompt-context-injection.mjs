#!/usr/bin/env bun
const policyId = "prompt-context-injection";

async function readStdin() {
	let text = "";
	for await (const chunk of process.stdin) {
		text += chunk;
	}
	return text.trim() === "" ? {} : JSON.parse(text);
}

function evaluate(payload) {
	const route = payload.route ?? "default";
	return {
		context: {
			prompt_append: [
				"OpenAgentLayer context:",
				`- Surface: ${payload.surface ?? "unknown"}.`,
				`- Event: ${payload.event ?? "unknown"}.`,
				`- Route: ${route}.`,
				"- Use OAL source graph roles, commands, skills, policies, and validation contracts.",
				"- Preserve tool-native behavior; do not invent harness/framework behavior.",
			].join("\n"),
		},
		decision: "context",
		policy_id: policyId,
		message: "OAL prompt context available.",
	};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
