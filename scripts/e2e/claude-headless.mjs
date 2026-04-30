#!/usr/bin/env bun
import {
	providerInspectionPrompt,
	responseContainsOk,
	runProcess,
	runProviderE2E,
	summarizeFailure,
} from "./_helpers.mjs";

const MARKER = "OAL_E2E_OK:claude";

const exitCode = await runProviderE2E({
	binary: "claude",
	probe: async ({ model, project }) => {
		const result = await runProcess({
			args: claudeArgs({ model, prompt: `Respond exactly ${MARKER}` }),
			cwd: project,
			timeoutMs: 180_000,
		});
		return result.exitCode === 0
			? { ok: true }
			: { ok: false, reason: summarizeFailure(result) };
	},
	scenario: async ({ model, project }) => {
		const result = await runProcess({
			args: claudeArgs({
				model,
				prompt: providerInspectionPrompt("claude", MARKER),
			}),
			cwd: project,
			timeoutMs: 180_000,
		});
		return responseContainsOk(result, MARKER);
	},
	surface: "claude",
});

process.exit(exitCode);

function claudeArgs({ model, prompt }) {
	return ["claude", "-p", prompt, "--model", model];
}
