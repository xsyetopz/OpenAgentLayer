#!/usr/bin/env bun
const policyId = "placeholder-prototype-guard";
const placeholderPattern =
	/\b(TODO|FIXME|XXX|stub|placeholder|not implemented|coming soon|lorem ipsum|rest follows|similar to above)\b/iu;

async function readStdin() {
	let text = "";
	for await (const chunk of process.stdin) text += chunk;
	return text.trim() === "" ? {} : JSON.parse(text);
}

function texts(payload) {
	const metadata = payload?.metadata ?? {};
	const input =
		payload?.tool_input && typeof payload.tool_input === "object"
			? payload.tool_input
			: {};
	return [
		metadata.content,
		metadata.diff,
		metadata.text,
		input.content,
		input.diff,
		input.text,
	].filter((value) => typeof value === "string" && value.length > 0);
}

function evaluate(payload) {
	return texts(payload).some((text) => placeholderPattern.test(text))
		? {
				decision: "deny",
				policy_id: policyId,
				message: "Placeholder or prototype content blocked.",
			}
		: {
				decision: "allow",
				policy_id: policyId,
				message: "No placeholder or prototype content detected.",
			};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
