#!/usr/bin/env bun
import { join } from "node:path";
import {
	providerInspectionPrompt,
	responseContainsOk,
	runProcess,
	runProviderE2E,
	summarizeFailure,
} from "./_helpers.mjs";

const MARKER = "OAL_E2E_OK:codex";

const exitCode = await runProviderE2E({
	binary: "codex",
	probe: async ({ model, project }) => {
		const output = join(project, "codex-probe.txt");
		const result = await runProcess({
			args: codexArgs({
				model,
				output,
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
		const output = join(project, "codex-scenario.txt");
		const result = await runProcess({
			args: codexArgs({
				model,
				output,
				project,
				prompt: providerInspectionPrompt("codex", MARKER),
			}),
			cwd: project,
			timeoutMs: 180_000,
		});
		return responseContainsOk(result, MARKER);
	},
	surface: "codex",
});

process.exit(exitCode);

function codexArgs({ model, output, project, prompt }) {
	return [
		"codex",
		"exec",
		"--cd",
		project,
		"--skip-git-repo-check",
		"--sandbox",
		"read-only",
		"--profile",
		"codex-plus",
		"--model",
		model,
		"--color",
		"never",
		"--output-last-message",
		output,
		prompt,
	];
}
