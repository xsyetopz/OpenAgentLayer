import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
	buildBatchSteps,
	buildTmuxCommands,
	buildTmuxPlan,
	makeRunId,
	renderSummary,
	runPaths,
} from "../hooks/scripts/session/peer-run.mjs";

describe("codex peer runner", () => {
	it("builds deterministic batch steps around top-level codex wrappers", () => {
		const cwd = "/repo";
		const runId = makeRunId(new Date("2026-04-09T17:00:00Z"), "seed1234");
		const steps = buildBatchSteps({ cwd, runId, home: "/home/me" });
		assert.deepEqual(
			steps.map((step) => [step.id, step.mode]),
			[
				["orchestrator", "orchestrate"],
				["qa", "qa"],
				["worker", "implement"],
				["review", "review"],
			],
		);
		assert.ok(
			steps.every((step) =>
				step.command.endsWith(
					path.join(".codex", "openagentsbtw", "bin", "oabtw-codex"),
				),
			),
		);
		assert.ok(steps[1].args[1].includes("reproduce broadly"));
		assert.ok(steps[2].args[1].includes("Implement the smallest cohesive fix"));
	});

	it("builds a tmux plan with the fixed four-pane role split", () => {
		const cwd = "/repo";
		const runId = makeRunId(new Date("2026-04-09T17:00:00Z"), "seed1234");
		const plan = buildTmuxPlan({ cwd, runId, home: "/home/me" });
		assert.equal(plan.panes.length, 4);
		assert.deepEqual(
			plan.panes.map((pane) => pane.id),
			["orchestrator", "qa", "worker", "review"],
		);
		const commands = buildTmuxCommands(plan, cwd);
		assert.deepEqual(commands[0], [
			"tmux",
			[
				"new-session",
				"-d",
				"-s",
				plan.sessionName,
				"-c",
				cwd,
				"-n",
				"orchestrator",
			],
		]);
		assert.ok(commands.some((entry) => entry[1].includes("attach-session")));
	});

	it("renders a compact summary from step results", () => {
		const summary = renderSummary({
			task: "fix the auth race",
			runId: "run-123",
			mode: "batch",
			root: runPaths({ cwd: "/repo", runId: "run-123" }).root,
			results: [
				{ id: "orchestrator", status: "ok", exitCode: 0 },
				{ id: "qa", status: "ok", exitCode: 0 },
				{ id: "worker", status: "failed", exitCode: 1 },
			],
		});
		assert.match(summary, /Run ID: `run-123`/);
		assert.match(summary, /`worker`: failed \(exit 1\)/);
		assert.match(summary, /fix the auth race/);
	});
});
