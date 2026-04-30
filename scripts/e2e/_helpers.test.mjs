import { describe, expect, test } from "bun:test";
import {
	providerInspectionPrompt,
	requiredProviderFiles,
	runProviderE2E,
} from "./_helpers.mjs";

describe("OAL headless e2e helpers", () => {
	test("provider inspection prompts name native generated files", () => {
		expect(providerInspectionPrompt("codex", "OK")).toContain(
			".codex/openagentlayer/plugin/skills/command-implement/SKILL.md",
		);
		expect(providerInspectionPrompt("claude", "OK")).toContain(
			".claude/commands/implement.md",
		);
		expect(providerInspectionPrompt("opencode", "OK")).toContain(
			".opencode/plugins/openagentlayer.ts",
		);
		expect(requiredProviderFiles("codex")).toContain("AGENTS.md");
		expect(requiredProviderFiles("claude")).toContain("CLAUDE.md");
		expect(requiredProviderFiles("opencode")).toContain("opencode.json");
	});

	test("skips before install when provider binary is missing", async () => {
		let installCalls = 0;
		const messages = [];

		const exitCode = await runProviderE2E({
			binary: "missing-provider",
			commandExistsFn: async () => false,
			installSurfaceFn: () => {
				installCalls += 1;
				return { exitCode: 0, stderr: "", stdout: "" };
			},
			logFn: (message) => messages.push(message),
			probe: async () => ({ ok: true }),
			scenario: async () => ({ ok: true }),
			surface: "codex",
		});

		expect(exitCode).toBe(0);
		expect(installCalls).toBe(0);
		expect(messages).toContain(
			"skip codex: 'missing-provider' binary not installed",
		);
	});

	test("requires a real probe before scenario execution", async () => {
		let scenarioCalls = 0;
		const messages = [];

		const exitCode = await runProviderE2E({
			binary: "codex",
			cleanupProjectFn: () => undefined,
			commandExistsFn: async () => true,
			createTempProjectFn: async () => "/tmp/oal-e2e-test",
			installSurfaceFn: () => ({ exitCode: 0, stderr: "", stdout: "" }),
			logFn: (message) => messages.push(message),
			modelCandidatesFn: async () => ["gpt-test"],
			probe: async () => ({ ok: false, reason: "auth unavailable" }),
			scenario: () => {
				scenarioCalls += 1;
				return { ok: true };
			},
			surface: "codex",
		});

		expect(exitCode).toBe(0);
		expect(scenarioCalls).toBe(0);
		expect(messages).toContain("skip codex/gpt-test: auth unavailable");
		expect(messages).toContain(
			"skip codex: no installed/authenticated source model returned a probe response",
		);
	});
});
