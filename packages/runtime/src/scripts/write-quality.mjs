#!/usr/bin/env bun
const policyId = "write-quality";
const placeholderPattern =
	/\b(TODO|FIXME|XXX|stub|placeholder|not implemented|coming soon|lorem ipsum)\b/iu;
let text = "";
for await (const chunk of process.stdin) text += chunk;
const payload = text.trim() === "" ? {} : JSON.parse(text);
const metadata = payload.metadata ?? {};
const input = payload.tool_input ?? {};
const blobs = [
	metadata.content,
	metadata.diff,
	metadata.text,
	input.content,
	input.diff,
	input.text,
].filter((value) => typeof value === "string");
const found = blobs.find((value) => placeholderPattern.test(value));
const decision =
	found === undefined
		? {
				decision: "allow",
				policy_id: policyId,
				message: "Write-quality guard passed.",
			}
		: {
				decision: "deny",
				policy_id: policyId,
				message: "Write-quality guard blocked placeholder output.",
			};
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
