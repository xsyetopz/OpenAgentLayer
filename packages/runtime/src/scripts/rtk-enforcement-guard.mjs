#!/usr/bin/env bun
const policyId = "rtk-enforcement-guard";
const rtkRequiredPattern =
	/^(git|bun|bunx|rg|cat|node|python3|env|make|cargo|dotnet|go|swift)(\s|$)/u;

async function readStdin() {
	let text = "";
	for await (const chunk of process.stdin) text += chunk;
	return text.trim() === "" ? {} : JSON.parse(text);
}

function command(payload) {
	if (typeof payload?.command === "string") return payload.command;
	const input = payload?.tool_input;
	return input && typeof input === "object"
		? (input.command ?? input.cmd ?? "")
		: "";
}

function evaluate(payload) {
	const cmd = command(payload).trim();
	if (cmd === "" || cmd.startsWith("rtk ")) {
		return {
			decision: "allow",
			policy_id: policyId,
			message: "RTK command policy satisfied.",
		};
	}
	return rtkRequiredPattern.test(cmd)
		? {
				decision: "deny",
				policy_id: policyId,
				message: `Command must use RTK wrapper: ${cmd}`,
			}
		: {
				decision: "allow",
				policy_id: policyId,
				message: "Command outside RTK managed set.",
			};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
