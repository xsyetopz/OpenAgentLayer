#!/usr/bin/env bun
import {
	providerInspectionPrompt,
	responseContainsOk,
	runProcess,
	runProviderE2E,
	summarizeFailure,
} from "./_helpers.mjs";

const MARKER = "OAL_E2E_OK:opencode";

const exitCode = await runProviderE2E({
	binary: "opencode",
	probe: async ({ model, project }) => {
		const result = await runProcess({
			args: opencodeArgs({
				model,
				project,
				prompt: `Respond exactly ${MARKER}`,
			}),
			cwd: project,
			timeoutMs: 180_000,
		});
		return result.exitCode === 0
			? { ok: true }
			: { ok: false, reason: summarizeFailure(result) };
	},
	scenario: async ({ model, project }) => {
		const result = await runProcess({
			args: opencodeArgs({
				model,
				project,
				prompt: providerInspectionPrompt("opencode", MARKER),
			}),
			cwd: project,
			timeoutMs: 180_000,
		});
		return responseContainsOk(result, MARKER);
	},
	surface: "opencode",
});

process.exit(exitCode);

function opencodeArgs({ model, project, prompt }) {
	return [
		"opencode",
		"run",
		"--dir",
		project,
		"--format",
		"json",
		"--model",
		model,
		prompt,
	];
}
