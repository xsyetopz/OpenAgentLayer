import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { buildRoadmapEvidence } from "../src";
import { assertCodebaseShape } from "../src/codebase-shape";
import { assertCodexTomlSchema } from "../src/config-schema";
import {
	assertRtkGainPolicyFixtures,
	assertRtkGainThreshold,
	evaluateRtkGainOutput,
	parseRtkGainPercent,
} from "../src/rtk";

test("roadmap evidence has no uncovered entries", async () => {
	const evidence = await buildRoadmapEvidence(
		resolve(import.meta.dir, "../../.."),
	);
	expect(evidence.filter((entry) => entry.status === "uncovered")).toEqual([]);
});

test("codebase shape gate accepts current source owners", async () => {
	await expect(
		assertCodebaseShape(resolve(import.meta.dir, "../../..")),
	).resolves.toBeUndefined();
});

test("Codex config schema requires cheap memory extraction model", () => {
	const config = [
		'profile = "openagentlayer"',
		'approvals_reviewer = "auto_review"',
		"",
		"[memories]",
		'extract_model = "gpt-5.4-mini"',
		"",
		"[profiles.openagentlayer]",
		'model = "gpt-5.5"',
		'model_verbosity = "low"',
		'approval_policy = "on-request"',
		'sandbox_mode = "workspace-write"',
		"",
		"[features]",
		"steer = true",
		"",
		"[agents]",
		"max_depth = 1",
		"",
		'[plugins."oal@openagentlayer-local"]',
		"enabled = true",
		"",
	].join("\n");
	expect(() => assertCodexTomlSchema(config)).not.toThrow();
	expect(() =>
		assertCodexTomlSchema(config.replace("gpt-5.4-mini", "gpt-5.5")),
	).toThrow("Codex memories.extract_model must use gpt-5.4-mini");
});

test("RTK gain parser reads current-style percentage output", () => {
	expect(
		parseRtkGainPercent(
			"Total commands:    11347\nTokens saved:      14.5M (92.9%)\n",
		),
	).toBe(92.9);
});

test("RTK gain gate accepts 80 percent and rejects non-empty regressions", async () => {
	await expect(
		assertRtkGainThreshold("", {}, async () => ({
			exitCode: 0,
			stdout: "Total commands:    1\nTokens saved:      10K (80.0%)\n",
			stderr: "",
		})),
	).resolves.toMatchObject({ percent: 80, status: "pass" });
	await expect(
		assertRtkGainThreshold("", {}, async () => ({
			exitCode: 0,
			stdout: "Total commands:    1\nTokens saved:      10K (79.9%)\n",
			stderr: "",
		})),
	).rejects.toThrow("below the required 80%");
	expect(() =>
		evaluateRtkGainOutput("Total commands:    1\nTokens saved:      0 (0%)\n", {
			allowEmptyHistory: true,
		}),
	).toThrow("below the required 80%");
});

test("RTK gain gate treats fresh empty history as explicit neutral state", () => {
	expect(
		evaluateRtkGainOutput("Total commands:    0\nTokens saved:      0 (0%)\n", {
			allowEmptyHistory: true,
		}),
	).toMatchObject({ status: "empty", percent: 0, totalCommands: 0 });
	expect(() =>
		evaluateRtkGainOutput("Total commands:    0\nTokens saved:      0 (0%)\n"),
	).toThrow("no command history");
});

test("RTK gain gate fails on missing or failed gain output", async () => {
	await expect(
		assertRtkGainThreshold("", {}, async () => ({
			exitCode: 0,
			stdout: "Total commands:    1\nRTK Token Savings\n",
			stderr: "",
		})),
	).rejects.toThrow("parseable Tokens saved percentage");
	await expect(
		assertRtkGainThreshold("", {}, async () => ({
			exitCode: 127,
			stdout: "",
			stderr: "rtk not found",
		})),
	).rejects.toThrow("rtk gain failed");
});

test("acceptance uses deterministic RTK gain policy fixtures", () => {
	expect(() => assertRtkGainPolicyFixtures()).not.toThrow();
});
