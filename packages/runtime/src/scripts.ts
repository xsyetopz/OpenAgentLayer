import { readFileSync } from "node:fs";

export const RUNTIME_SCRIPT_FILES = {
	"completion-gate": "completion-gate.mjs",
	"destructive-command-guard": "destructive-command-guard.mjs",
	"prompt-context-injection": "prompt-context-injection.mjs",
	"source-drift-guard": "source-drift-guard.mjs",
} as const satisfies Record<string, string>;

export function renderRuntimeScript(policyId: string): string {
	const fileName =
		RUNTIME_SCRIPT_FILES[policyId as keyof typeof RUNTIME_SCRIPT_FILES];
	if (fileName === undefined) {
		throw new Error(`Unknown runtime policy script '${policyId}'.`);
	}
	return readFileSync(
		new URL(`./scripts/${fileName}`, import.meta.url),
		"utf8",
	);
}
