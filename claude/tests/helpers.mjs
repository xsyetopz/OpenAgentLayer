import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOKS_DIR = resolve(__dirname, "..", "hooks", "scripts");

export function runHook(scriptName, inputJson, env = {}) {
	const script = resolve(HOOKS_DIR, scriptName);
	const merged = { ...process.env, ...env };
	if (!Object.hasOwn(env, "CCA_HOOK_LOG_DIR")) {
		delete merged.CCA_HOOK_LOG_DIR;
	}
	return spawnSync("node", [script], {
		input: JSON.stringify(inputJson),
		encoding: "utf8",
		env: merged,
		timeout: 15000,
	});
}

export function parseHookOutput(result) {
	try {
		return JSON.parse(result.stdout.trim());
	} catch {
		return {};
	}
}
