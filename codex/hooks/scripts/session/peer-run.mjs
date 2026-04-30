#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);

function homeDir() {
	return process.env.HOME || os.homedir();
}

export function installRoot({ home = homeDir() } = {}) {
	return path.join(home, ".codex", "openagentsbtw");
}

export function binPath(name, { home = homeDir() } = {}) {
	return path.join(installRoot({ home }), "bin", name);
}

export function makeRunId(now = new Date(), seed = randomUUID().slice(0, 8)) {
	const stamp = now.toISOString().replace(/[:]/g, "-").replace(/\..+$/, "");
	return `${stamp}-${seed}`;
}

export function runPaths({ cwd, runId }) {
	const root = path.join(cwd, ".openagentsbtw", "codex-peer", runId);
	return {
		root,
		brief: path.join(root, "brief.md"),
		state: path.join(root, "state.json"),
		handoffsDir: path.join(root, "handoffs"),
		resultsDir: path.join(root, "results"),
		promptsDir: path.join(root, "prompts"),
		bootstrapDir: path.join(root, "bootstrap"),
		summary: path.join(root, "summary.md"),
	};
}

function quoted(text) {
	return JSON.stringify(text);
}

function formatList(items) {
	return items.map((item) => `- ${item}`).join("\n");
}

export function renderBrief({ task, cwd, runId, mode }) {
	return `# Codex Peer Run

- Run ID: \`${runId}\`
- Mode: \`${mode}\`
- Repo: \`${cwd}\`

## Task

${task.trim()}

## Fixed Role Order

	${formatList([
		"orchestrator -- split work, define acceptance criteria, and decide ownership",
		"validate -- reproduce broadly, gather evidence, and enumerate variants",
		"worker -- implement against the orchestrator + QA handoff",
		"review -- audit the resulting diff, validation, and residual risk",
	])}
`;
}

function rolePrompt({ role, paths }) {
	const common = [
		`Shared run directory: ${paths.root}`,
		`Read ${paths.brief} first.`,
		`Use ${paths.handoffsDir} and ${paths.resultsDir} as the durable handoff trail.`,
		"Do not assume hidden context from other runs.",
	].join("\n");

	switch (role) {
		case "orchestrator":
			return `Use openagentsbtw. Route this through odysseus-style orchestration.

${common}

Produce:
1. a concrete ownership split
2. acceptance criteria
3. the exact next handoff the QA worker should use

Write no code. Keep the result concise, operational, and decision-complete.`;
		case "validate":
			return `Use openagentsbtw. Route this through atalanta-style validation.

${common}

Read ${path.join(paths.resultsDir, "orchestrator.md")} if it exists.

Requirements:
- reproduce broadly, not narrowly
- list exact repro steps
- record passed and failed variants
- prefer integration-test thinking when behavior crosses boundaries
- if Playwright CLI is available, gather screenshots, traces, or DOM evidence

Do not implement fixes.`;
		case "worker":
			return `Use openagentsbtw. Route this through hephaestus-style implementation.

${common}

Read:
- ${path.join(paths.resultsDir, "orchestrator.md")}
- ${path.join(paths.resultsDir, "validate.md")}

Implement the smallest cohesive fix that satisfies the orchestrator acceptance criteria and the QA evidence. Avoid big rewrites and god-object files.`;
		case "review":
			return `Use openagentsbtw. Route this through nemesis-style review.

${common}

Read:
- ${path.join(paths.resultsDir, "orchestrator.md")}
- ${path.join(paths.resultsDir, "validate.md")}
- ${path.join(paths.resultsDir, "worker.md")}

Audit correctness, regressions, missing tests, and residual risk. Lead with findings and evidence.`;
		default:
			throw new Error(`Unknown role: ${role}`);
	}
}

export function buildBatchSteps({ cwd, runId, home = homeDir() }) {
	const paths = runPaths({ cwd, runId });
	const wrapper = binPath("oabtw-codex", { home });
	return [
		{
			id: "orchestrator",
			mode: "orchestrate",
			command: wrapper,
			args: ["orchestrate", rolePrompt({ role: "orchestrator", paths })],
			output: path.join(paths.resultsDir, "orchestrator.md"),
		},
		{
			id: "validate",
			mode: "validate",
			command: wrapper,
			args: ["validate", rolePrompt({ role: "validate", paths })],
			output: path.join(paths.resultsDir, "validate.md"),
		},
		{
			id: "worker",
			mode: "implement",
			command: wrapper,
			args: ["implement", rolePrompt({ role: "worker", paths })],
			output: path.join(paths.resultsDir, "worker.md"),
		},
		{
			id: "review",
			mode: "review",
			command: wrapper,
			args: ["review", rolePrompt({ role: "review", paths })],
			output: path.join(paths.resultsDir, "review.md"),
		},
	];
}

export function renderSummary({ task, runId, mode, results, root }) {
	const lines = [
		"# Codex Peer Summary",
		"",
		`- Run ID: \`${runId}\``,
		`- Mode: \`${mode}\``,
		`- Run Directory: \`${root}\``,
		"",
		"## Task",
		"",
		task.trim(),
		"",
		"## Step Status",
		"",
		...results.map(
			(result) =>
				`- \`${result.id}\`: ${result.status}${result.exitCode !== null ? ` (exit ${result.exitCode})` : ""}`,
		),
		"",
	];
	return `${lines.join("\n")}\n`;
}

export function buildTmuxPlan({ cwd, runId, home = homeDir() }) {
	const paths = runPaths({ cwd, runId });
	const wrapper = binPath("oabtw-codex", { home });
	const sessionName = `oabtw-${runId}`;
	const panes = [
		{ id: "orchestrator", mode: "orchestrate" },
		{ id: "validate", mode: "validate" },
		{ id: "worker", mode: "implement" },
		{ id: "review", mode: "review" },
	].map((pane) => ({
		...pane,
		prompt: rolePrompt({ role: pane.id, paths }),
		promptFile: path.join(paths.promptsDir, `${pane.id}.md`),
		script: path.join(paths.bootstrapDir, `${pane.id}.sh`),
		command: wrapper,
	}));
	return { sessionName, panes, paths, cwd };
}

async function ensureRunLayout(paths) {
	await fs.mkdir(paths.handoffsDir, { recursive: true });
	await fs.mkdir(paths.resultsDir, { recursive: true });
	await fs.mkdir(paths.promptsDir, { recursive: true });
	await fs.mkdir(paths.bootstrapDir, { recursive: true });
}

async function writeState(paths, payload) {
	await fs.writeFile(paths.state, `${JSON.stringify(payload, null, 2)}\n`);
}

async function runCommand(command, args, { cwd }) {
	return await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", reject);
		child.on("exit", (code) => {
			resolve({ code: code ?? 1, stdout, stderr });
		});
	});
}

async function runBatch(task, cwd, dryRun) {
	const runId = makeRunId();
	const paths = runPaths({ cwd, runId });
	const steps = buildBatchSteps({ cwd, runId });
	await ensureRunLayout(paths);
	await fs.writeFile(
		paths.brief,
		renderBrief({ task, cwd, runId, mode: "batch" }),
	);
	await writeState(paths, {
		runId,
		mode: "batch",
		cwd,
		steps: steps.map((step) => ({
			id: step.id,
			mode: step.mode,
			output: step.output,
		})),
	});

	if (dryRun) {
		process.stdout.write(
			`${JSON.stringify(
				{
					runId,
					mode: "batch",
					root: paths.root,
					steps: steps.map((step) => ({
						id: step.id,
						command: step.command,
						args: step.args,
						output: step.output,
					})),
				},
				null,
				2,
			)}\n`,
		);
		return;
	}

	const results = [];
	for (const step of steps) {
		const result = await runCommand(step.command, step.args, { cwd });
		await fs.writeFile(step.output, result.stdout || result.stderr || "");
		results.push({
			id: step.id,
			status: result.code === 0 ? "ok" : "failed",
			exitCode: result.code,
		});
		if (result.code !== 0) {
			break;
		}
	}
	await fs.writeFile(
		paths.summary,
		renderSummary({ task, runId, mode: "batch", results, root: paths.root }),
	);
	process.stdout.write(`${paths.summary}\n`);
}

async function writeTmuxBootstrap(plan) {
	for (const pane of plan.panes) {
		await fs.writeFile(pane.promptFile, pane.prompt);
		await fs.writeFile(
			pane.script,
			`#!/bin/bash
set -euo pipefail
cd ${quoted(plan.cwd)}
exec ${quoted(pane.command)} ${pane.mode} "$(cat ${quoted(pane.promptFile)})"
`,
		);
		await fs.chmod(pane.script, 0o755);
	}
}

export function buildTmuxCommands(plan, cwd) {
	const [first, ...rest] = plan.panes;
	const commands = [
		[
			"tmux",
			["new-session", "-d", "-s", plan.sessionName, "-c", cwd, "-n", first.id],
		],
		[
			"tmux",
			["send-keys", "-t", `${plan.sessionName}:0.0`, first.script, "C-m"],
		],
	];
	rest.forEach((pane, index) => {
		commands.push([
			"tmux",
			[
				"split-window",
				"-t",
				`${plan.sessionName}:0`,
				index % 2 === 0 ? "-h" : "-v",
				"-c",
				cwd,
			],
		]);
		commands.push([
			"tmux",
			[
				"select-pane",
				"-t",
				`${plan.sessionName}:0.${index + 1}`,
				"-T",
				pane.id,
			],
		]);
		commands.push([
			"tmux",
			[
				"send-keys",
				"-t",
				`${plan.sessionName}:0.${index + 1}`,
				pane.script,
				"C-m",
			],
		]);
	});
	commands.push([
		"tmux",
		["select-layout", "-t", `${plan.sessionName}:0`, "tiled"],
	]);
	commands.push(["tmux", ["attach-session", "-t", plan.sessionName]]);
	return commands;
}

async function runTmux(task, cwd, dryRun) {
	const runId = makeRunId();
	const paths = runPaths({ cwd, runId });
	const plan = buildTmuxPlan({ cwd, runId });
	await ensureRunLayout(paths);
	await fs.writeFile(
		paths.brief,
		renderBrief({ task, cwd, runId, mode: "tmux" }),
	);
	await writeState(paths, {
		runId,
		mode: "tmux",
		cwd,
		sessionName: plan.sessionName,
		panes: plan.panes.map((pane) => ({
			id: pane.id,
			mode: pane.mode,
			script: pane.script,
		})),
	});
	await writeTmuxBootstrap(plan);
	const commands = buildTmuxCommands(plan, cwd);

	if (dryRun) {
		process.stdout.write(
			`${JSON.stringify(
				{
					runId,
					mode: "tmux",
					root: paths.root,
					sessionName: plan.sessionName,
					commands,
				},
				null,
				2,
			)}\n`,
		);
		return;
	}

	try {
		await runCommand("tmux", ["-V"], { cwd });
	} catch {
		throw new Error(
			"tmux is required for tmux mode. Use oabtw-codex-peer batch if tmux is unavailable.",
		);
	}

	for (const [command, args] of commands) {
		const result = await runCommand(command, args, { cwd });
		if (result.code !== 0) {
			throw new Error(result.stderr || `${command} failed with ${result.code}`);
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	const mode = args.shift();
	if (!mode || !["batch", "tmux"].includes(mode)) {
		throw new Error("Usage: peer-run.mjs <batch|tmux> [--dry-run] <task>");
	}
	const dryRunIndex = args.indexOf("--dry-run");
	const dryRun = dryRunIndex !== -1;
	if (dryRun) args.splice(dryRunIndex, 1);
	const task = args.join(" ").trim();
	if (!task) {
		throw new Error("Missing task for peer-run.mjs");
	}
	const cwd = process.cwd();
	if (mode === "batch") {
		await runBatch(task, cwd, dryRun);
		return;
	}
	await runTmux(task, cwd, dryRun);
}

if (process.argv[1] === __filename) {
	await main().catch((error) => {
		console.error(error.message);
		process.exitCode = 1;
	});
}
