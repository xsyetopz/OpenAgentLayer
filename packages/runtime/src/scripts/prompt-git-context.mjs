#!/usr/bin/env bun
const policyId = "prompt-git-context";
let text = "";
for await (const chunk of process.stdin) text += chunk;
const payload = text.trim() === "" ? {} : JSON.parse(text);
const metadata = payload.metadata ?? {};
const branch =
	typeof metadata.branch === "string" ? metadata.branch : "unknown";
const dirty =
	typeof metadata.dirty === "boolean" ? String(metadata.dirty) : "unknown";
const decision = {
	context: { prompt_context: `Git branch: ${branch}; dirty tree: ${dirty}.` },
	decision: "context",
	policy_id: policyId,
	message: "Git context attached to prompt route.",
};
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(0);
