import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { buildRoadmapEvidence } from "../src";
import { assertRtkGainThreshold, parseRtkGainPercent } from "../src/rtk";

test("roadmap evidence has no uncovered entries", async () => {
	const evidence = await buildRoadmapEvidence(
		resolve(import.meta.dir, "../../.."),
	);
	expect(evidence.filter((entry) => entry.status === "uncovered")).toEqual([]);
});

test("RTK gain parser reads current-style percentage output", () => {
	expect(parseRtkGainPercent("Tokens saved:      14.5M (92.9%)\n")).toBe(92.9);
});

test("RTK gain gate accepts 80 percent and rejects regressions", async () => {
	await expect(
		assertRtkGainThreshold("", async () => ({
			exitCode: 0,
			stdout: "Tokens saved:      10K (80.0%)\n",
			stderr: "",
		})),
	).resolves.toBe(80);
	await expect(
		assertRtkGainThreshold("", async () => ({
			exitCode: 0,
			stdout: "Tokens saved:      10K (79.9%)\n",
			stderr: "",
		})),
	).rejects.toThrow("below the required 80%");
});

test("RTK gain gate fails on missing or failed gain output", async () => {
	await expect(
		assertRtkGainThreshold("", async () => ({
			exitCode: 0,
			stdout: "RTK Token Savings\n",
			stderr: "",
		})),
	).rejects.toThrow("parseable Tokens saved percentage");
	await expect(
		assertRtkGainThreshold("", async () => ({
			exitCode: 127,
			stdout: "",
			stderr: "rtk not found",
		})),
	).rejects.toThrow("rtk gain failed");
});
