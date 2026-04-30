#!/usr/bin/env bun
const policyId = "permission-escalation-guard";
const sudoCommandPattern = /\bsudo\b/u;

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

function command(payload) {
	if (typeof payload?.command === "string") return payload.command;
	const input = payload?.tool_input;
	return input && typeof input === "object"
		? (input.command ?? input.cmd ?? "")
		: "";
}

function evaluate(payload) {
	const meta = metadata(payload);
	const requested =
		payload?.event?.toLowerCase().includes("permission") === true ||
		meta.sandbox_permissions === "require_escalated" ||
		sudoCommandPattern.test(command(payload));
	if (!requested) {
		return {
			decision: "allow",
			policy_id: policyId,
			message: "No permission escalation requested.",
		};
	}
	const justification = meta.justification ?? meta.reason;
	const risk = meta.risk ?? meta.risk_level;
	return typeof justification === "string" &&
		justification.trim() !== "" &&
		typeof risk === "string"
		? {
				decision: "allow",
				policy_id: policyId,
				message:
					"Permission escalation request includes justification and risk metadata.",
			}
		: {
				decision: "deny",
				policy_id: policyId,
				message:
					"Permission escalation blocked: missing justification or risk metadata.",
			};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
