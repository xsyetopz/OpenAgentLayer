#!/usr/bin/env bun
const policyId = "failure-circuit";
let text = "";
for await (const chunk of process.stdin) text += chunk;
const payload = text.trim() === "" ? {} : JSON.parse(text);
const metadata = payload.metadata ?? {};
const failures = Number(metadata.recent_failures ?? metadata.failures ?? 0);
const decision =
	failures >= 3
		? {
				context: { recent_failures: failures },
				decision: "warn",
				policy_id: policyId,
				message:
					"Repeated tool failures detected; stop retry loops and reassess route.",
			}
		: {
				decision: "allow",
				policy_id: policyId,
				message: "Failure circuit threshold not reached.",
			};
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
