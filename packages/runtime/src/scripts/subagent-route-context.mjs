#!/usr/bin/env bun
const policyId = "subagent-route-context";
let text = "";
for await (const chunk of process.stdin) text += chunk;
const payload = text.trim() === "" ? {} : JSON.parse(text);
const route = payload.route ?? payload.metadata?.route ?? "unspecified";
const decision = {
	context: { route },
	decision: "context",
	policy_id: policyId,
	message: "Subagent route context attached.",
};
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(0);
