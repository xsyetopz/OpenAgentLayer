import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, parse, resolve } from "node:path";

const input = await readHookInput();
const command = String(input.tool_input?.command ?? "");
const cwd = String(input.cwd ?? process.cwd());

if (isRtkPolicyActive(cwd) && command.trim() && !usesRtk(command)) {
	deny(
		"RTK policy active. Run shell through RTK (e.g., `rtk --ultra-compact run 'command'`).",
	);
}

process.exit(0);

async function readHookInput() {
	const chunks = [];
	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}
	const rawInput = Buffer.concat(chunks).toString("utf8").trim();
	return rawInput ? JSON.parse(rawInput) : {};
}

function isRtkPolicyActive(cwd) {
	return Boolean(
		findUp(cwd, "RTK.md") || existsSync(join(homedir(), ".codex", "RTK.md")),
	);
}

function findUp(start, filename) {
	let current = resolve(start);
	while (true) {
		const candidate = join(current, filename);
		if (
			existsSync(candidate) &&
			readFileSync(candidate, "utf8").includes("RTK")
		) {
			return candidate;
		}
		const parent = dirname(current);
		if (parent === current || current === parse(current).root) {
			return undefined;
		}
		current = parent;
	}
}

function usesRtk(command) {
	const trimmed = command.trimStart();
	return trimmed === "rtk" || trimmed.startsWith("rtk ");
}

function deny(reason) {
	process.stdout.write(
		`${JSON.stringify({
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: reason,
			},
		})}\n`,
	);
	process.exit(0);
}
