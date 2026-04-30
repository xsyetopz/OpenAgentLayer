import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOOKS_DIR = resolve(__dirname, "..", "hooks", "scripts");

function mergeHookEnv(env) {
	const merged = { ...process.env };
	if (Object.hasOwn(env, "PATH")) {
		for (const key of Object.keys(merged)) {
			if (key.toLowerCase() === "path") {
				delete merged[key];
			}
		}
	}
	Object.assign(merged, env);
	if (!Object.hasOwn(env, "CCA_HOOK_LOG_DIR")) {
		delete merged.CCA_HOOK_LOG_DIR;
	}
	return merged;
}

export function runHook(scriptName, inputJson, env = {}, options = {}) {
	const script = resolve(HOOKS_DIR, scriptName);
	const merged = mergeHookEnv(env);
	return spawnSync("node", [script], {
		input: JSON.stringify(inputJson),
		encoding: "utf8",
		env: merged,
		cwd: options.cwd,
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
