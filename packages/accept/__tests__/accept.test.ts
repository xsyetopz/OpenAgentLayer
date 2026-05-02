import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { buildRoadmapEvidence } from "../src";
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
