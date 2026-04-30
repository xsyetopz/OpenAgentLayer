#!/usr/bin/env bun
const policyId = "secret-path-guard";
const secretPattern =
	/(^|[\\/])(\.env|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|known_hosts|credentials|secrets?)([\\/.]|$)/iu;
const safePattern = /(example|sample|template|fixture|mock)/iu;

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

function paths(payload) {
	const values = [...(payload?.paths ?? [])];
	const metadata = payload?.metadata ?? {};
	for (const key of ["paths", "changed_paths"]) {
		if (Array.isArray(metadata[key])) values.push(...metadata[key]);
	}
	const input = payload?.tool_input;
	if (input && typeof input === "object") {
		for (const key of ["path", "file_path", "filePath", "paths"]) {
			const value = input[key];
			if (typeof value === "string") values.push(value);
			if (Array.isArray(value)) values.push(...value);
		}
	}
	return values.filter(
		(value) => typeof value === "string" && value.length > 0,
	);
}

function evaluate(payload) {
	const secret = [command(payload), ...paths(payload)]
		.filter(Boolean)
		.find((value) => secretPattern.test(value) && !safePattern.test(value));
	return secret === undefined
		? {
				decision: "allow",
				policy_id: policyId,
				message: "No secret path access detected.",
			}
		: {
				decision: "deny",
				policy_id: policyId,
				message: `Secret path access blocked: ${secret}`,
			};
}

const decision = evaluate(await readStdin());
process.stdout.write(`${JSON.stringify(decision)}\n`);
process.exit(decision.decision === "deny" ? 1 : 0);
