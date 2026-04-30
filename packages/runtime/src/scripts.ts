import { readFileSync } from "node:fs";

export const RUNTIME_SCRIPT_FILES = {
	"completion-gate": "completion-gate.mjs",
	"context-budget-guard": "context-budget-guard.mjs",
	"destructive-command-guard": "destructive-command-guard.mjs",
	"diff-state-gate": "diff-state-gate.mjs",
	"permission-escalation-guard": "permission-escalation-guard.mjs",
	"placeholder-prototype-guard": "placeholder-prototype-guard.mjs",
	"prompt-context-injection": "prompt-context-injection.mjs",
	"rtk-enforcement-guard": "rtk-enforcement-guard.mjs",
	"secret-path-guard": "secret-path-guard.mjs",
	"source-drift-guard": "source-drift-guard.mjs",
	"stale-generated-artifact-guard": "stale-generated-artifact-guard.mjs",
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
