#!/usr/bin/env bun
const policyId = "protected-branch-confirm";
let text = "";
for await (const chunk of process.stdin) text += chunk;
const payload = text.trim() === "" ? {} : JSON.parse(text);
const metadata = payload.metadata ?? {};
const input = payload.tool_input ?? {};
const command = payload.command ?? input.command ?? input.cmd ?? "";
const branch = metadata.branch ?? command;
const isProtected = /\b(main|master|release|production)\b/iu.test(branch);
const mutatesBranch = /git\s+(push|merge|reset|commit)/iu.test(command);
const decision =
	mutatesBranch && isProtected && metadata.confirmed !== true
		? {
				decision: "deny",
				policy_id: policyId,
				message: "Protected branch operation requires explicit confirmation.",
			}
		: {
				decision: "allow",
				policy_id: policyId,
				message: "No unconfirmed protected branch operation detected.",
			};
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
