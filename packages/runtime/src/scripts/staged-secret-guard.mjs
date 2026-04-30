#!/usr/bin/env bun
const policyId = "staged-secret-guard";
const secretValuePattern =
	/(api[_-]?key|secret|token|password|BEGIN [A-Z ]*PRIVATE KEY)/iu;
let text = "";
for await (const chunk of process.stdin) text += chunk;
const payload = text.trim() === "" ? {} : JSON.parse(text);
const metadata = payload.metadata ?? {};
const input = payload.tool_input ?? {};
const candidates = [
	metadata.content,
	metadata.diff,
	metadata.text,
	input.content,
	input.diff,
	input.text,
	...(payload.paths ?? []),
].filter((value) => typeof value === "string");
const found = candidates.find((value) => secretValuePattern.test(value));
const decision =
	found === undefined
		? {
				decision: "allow",
				policy_id: policyId,
				message: "No staged secret content detected.",
			}
		: {
				decision: "deny",
				policy_id: policyId,
				message: "Secret-bearing staged content blocked.",
			};
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
