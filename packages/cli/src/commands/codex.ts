import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { AgentRecord } from "@openagentlayer/source";
import { loadSource } from "@openagentlayer/source";
import { flag, option } from "../arguments";

const PEER_ROLES = [
	["orchestrator", "orchestrate"],
	["validate", "validate"],
	["worker", "implement"],
	["review", "review"],
] as const;
const ISO_MILLISECONDS_PATTERN = /\..+$/;

type PeerRole = (typeof PEER_ROLES)[number][0];

interface CodexRun {
	command: string;
	args: string[];
	cwd: string;
	output?: string;
}

interface PeerPaths {
	root: string;
	brief: string;
	state: string;
	handoffsDir: string;
	resultsDir: string;
	promptsDir: string;
	bootstrapDir: string;
	summary: string;
}

export async function runCodexCommand(
	repoRoot: string,
	args: string[],
): Promise<void> {
	const action = args.shift();
	switch (action) {
		case "launch":
			await runCodexLaunch(args);
			return;
		case "agent":
			await runCodexAgent(repoRoot, args);
			return;
		case "route":
			await runCodexRoute(repoRoot, args);
			return;
		case "peer":
			await runCodexPeer(repoRoot, args);
			return;
		default:
			throw new Error("Usage: oal codex <launch|agent|route|peer>");
	}
}

export function makeRunId(
	now = new Date(),
	seed = randomUUID().slice(0, 8),
): string {
	const stamp = now
		.toISOString()
		.replaceAll(":", "-")
		.replace(ISO_MILLISECONDS_PATTERN, "");
	return `${stamp}-${seed}`;
}

export function peerRunPaths(cwd: string, runId: string): PeerPaths {
	const root = join(cwd, ".openagentlayer", "codex-peer", runId);
	return {
		root,
		brief: join(root, "brief.md"),
		state: join(root, "state.json"),
		handoffsDir: join(root, "handoffs"),
		resultsDir: join(root, "results"),
		promptsDir: join(root, "prompts"),
		bootstrapDir: join(root, "bootstrap"),
		summary: join(root, "summary.md"),
	};
}

export function buildPeerSteps(
	repoRoot: string,
	cwd: string,
	runId: string,
): Array<CodexRun & { id: PeerRole; mode: string }> {
	const paths = peerRunPaths(cwd, runId);
	return PEER_ROLES.map(([id, mode]) => ({
		id,
		mode,
		command: process.execPath,
		args: [
			join(repoRoot, "packages/cli/src/main.ts"),
			"codex",
			"route",
			mode,
			"--cwd",
			cwd,
			"--out",
			join(paths.resultsDir, `${id}.md`),
			rolePrompt(id, paths),
		],
		cwd,
		output: join(paths.resultsDir, `${id}.md`),
	}));
}

export function renderPeerBrief(
	task: string,
	cwd: string,
	runId: string,
	mode: string,
): string {
	return [
		"# Codex Peer Run",
		"",
		`- Run ID: \`${runId}\``,
		`- Mode: \`${mode}\``,
		`- Repo: \`${cwd}\``,
		"",
		"## Task",
		"",
		task.trim(),
		"",
		"## Fixed Role Order",
		"",
		"- orchestrator -- split work, define acceptance criteria, and decide ownership",
		"- validate -- reproduce broadly, gather evidence, and enumerate variants",
		"- worker -- implement against the orchestrator and validation handoff",
		"- review -- audit the resulting diff, validation, and residual risk",
		"",
		"## Spawn Boundary",
		"",
		"Only the top-level peer runner creates peers. Peer roles must not launch `oal codex peer`, `oal codex route orchestrate`, native Codex subagents, or another orchestrator.",
		"",
	].join("\n");
}

export function renderPeerSummary(
	task: string,
	runId: string,
	mode: string,
	root: string,
	results: Array<{ id: string; status: string; exitCode: number | null }>,
): string {
	return [
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
				`- \`${result.id}\`: ${result.status}${result.exitCode === null ? "" : ` (exit ${result.exitCode})`}`,
		),
		"",
	].join("\n");
}

async function runCodexLaunch(args: string[]): Promise<void> {
	const cwd = resolve(option(args, "--cwd") ?? process.cwd());
	const dryRun = flag(args, "--dry-run");
	const prompt = optionalPromptFromArgs(args);
	const run = codexLaunchRun(cwd, prompt);
	if (dryRun) {
		console.log(JSON.stringify(run, undefined, 2));
		return;
	}
	await executeCodexInteractive(run);
}

async function runCodexAgent(repoRoot: string, args: string[]): Promise<void> {
	const agent = args.shift();
	if (!agent) throw new Error("Usage: oal codex agent <agent> [prompt]");
	const cwd = resolve(option(args, "--cwd") ?? process.cwd());
	const out = option(args, "--out");
	const dryRun = flag(args, "--dry-run");
	const prompt = promptFromArgs(args);
	const graph = await loadSource(join(repoRoot, "source"));
	const record = graph.source.agents.find((record) => record.id === agent);
	if (!record) throw new Error(`Unknown Codex agent \`${agent}\``);
	const run = codexExecRun(record, cwd, agentPrompt(record, prompt), out);
	if (dryRun) {
		console.log(JSON.stringify(run, undefined, 2));
		return;
	}
	await executeCodexRun(run);
}

async function runCodexRoute(repoRoot: string, args: string[]): Promise<void> {
	const routeId = args.shift();
	if (!routeId) throw new Error("Usage: oal codex route <route> [prompt]");
	const cwd = resolve(option(args, "--cwd") ?? process.cwd());
	const out = option(args, "--out");
	const dryRun = flag(args, "--dry-run");
	const prompt = promptFromArgs(args);
	const graph = await loadSource(join(repoRoot, "source"));
	const route = graph.source.routes.find(
		(record) => record.id === routeId && record.providers.includes("codex"),
	);
	if (!route) throw new Error(`Unknown Codex route \`${routeId}\``);
	const routedPrompt = [
		`Use OpenAgentLayer route \`${route.id}\` with agent \`${route.agent}\``,
		`Route contract: ${route.body}`,
		"",
		"Task:",
		prompt,
	].join("\n");
	const agent = graph.source.agents.find((record) => record.id === route.agent);
	if (!agent) throw new Error(`Unknown Codex agent \`${route.agent}\``);
	const run = codexExecRun(agent, cwd, routedPrompt, out);
	if (dryRun) {
		console.log(JSON.stringify({ route: route.id, ...run }, undefined, 2));
		return;
	}
	await executeCodexRun(run);
}

async function runCodexPeer(repoRoot: string, args: string[]): Promise<void> {
	const mode = args.shift();
	if (!(mode === "batch" || mode === "tmux"))
		throw new Error("Usage: oal codex peer <batch|tmux> [task]");
	const cwd = resolve(option(args, "--cwd") ?? process.cwd());
	const dryRun = flag(args, "--dry-run");
	const task = promptFromArgs(args);
	const runId = makeRunId();
	const paths = peerRunPaths(cwd, runId);
	const steps = buildPeerSteps(repoRoot, cwd, runId);
	await ensurePeerLayout(paths);
	await writeFile(paths.brief, renderPeerBrief(task, cwd, runId, mode));
	await writeFile(
		paths.state,
		`${JSON.stringify(
			{
				runId,
				mode,
				cwd,
				steps: steps.map(({ id, mode, output }) => ({ id, mode, output })),
			},
			undefined,
			2,
		)}\n`,
	);
	if (dryRun) {
		console.log(
			JSON.stringify(
				{
					runId,
					mode,
					root: paths.root,
					steps: steps.map(({ id, command, args, output }) => ({
						id,
						command,
						args,
						output,
					})),
				},
				undefined,
				2,
			),
		);
		return;
	}
	if (mode === "tmux")
		throw new Error("Codex peer tmux mode is planned; use batch mode now");
	const results: Array<{
		id: string;
		status: string;
		exitCode: number | null;
	}> = [];
	for (const step of steps) {
		const result = await runProcess(step.command, step.args, step.cwd);
		if (step.output)
			await writeFile(step.output, result.stdout || result.stderr || "");
		results.push({
			id: step.id,
			status: result.code === 0 ? "ok" : "failed",
			exitCode: result.code,
		});
		if (result.code !== 0) break;
	}
	await writeFile(
		paths.summary,
		renderPeerSummary(task, runId, mode, paths.root, results),
	);
	console.log(paths.summary);
}

export function codexExecRun(
	agent: AgentRecord,
	cwd: string,
	prompt: string,
	out?: string,
): CodexRun {
	const model = agent.models.codex;
	if (!model) throw new Error(`Codex model missing for agent \`${agent.id}\``);
	return {
		command: "codex",
		args: [
			"exec",
			"-c",
			`projects.${JSON.stringify(cwd)}.trust_level="trusted"`,
			"-m",
			model,
			"-s",
			agent.tools.includes("write") ? "workspace-write" : "read-only",
			"-C",
			cwd,
			...(out ? ["-o", out] : []),
			prompt,
		],
		cwd,
		...(out ? { output: out } : {}),
	};
}

export function codexLaunchRun(cwd: string, prompt = ""): CodexRun {
	return {
		command: "codex",
		args: [
			"--profile",
			"openagentlayer",
			"-C",
			cwd,
			...(prompt ? [prompt] : []),
		],
		cwd,
	};
}

function agentPrompt(agent: AgentRecord, task: string): string {
	return [
		`Use OpenAgentLayer agent \`${agent.id}\``,
		`Role: ${agent.role}`,
		"",
		agent.prompt,
		"",
		"Task:",
		task,
	].join("\n");
}

async function executeCodexRun(run: CodexRun): Promise<void> {
	const result = await runProcess(run.command, run.args, run.cwd);
	if (result.stdout) process.stdout.write(result.stdout);
	if (result.stderr) process.stderr.write(result.stderr);
	if (result.code !== 0)
		throw new Error(`Codex run exited with status \`${result.code}\``);
}

async function executeCodexInteractive(run: CodexRun): Promise<void> {
	const proc = Bun.spawn([run.command, ...run.args], {
		cwd: run.cwd,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	const code = await proc.exited;
	if (code !== 0)
		throw new Error(`Codex launch exited with status \`${code}\``);
}

function optionalPromptFromArgs(args: string[]): string {
	return args
		.filter(
			(arg, index) =>
				!(["--dry-run", "--cwd"].includes(arg) || args[index - 1] === "--cwd"),
		)
		.join(" ")
		.trim();
}

function promptFromArgs(args: string[]): string {
	const filtered = args.filter(
		(arg, index) =>
			!(
				["--dry-run", "--cwd", "--out"].includes(arg) ||
				args[index - 1] === "--cwd" ||
				args[index - 1] === "--out"
			),
	);
	const prompt = filtered.join(" ").trim();
	if (!prompt) throw new Error("Prompt text required");
	return prompt;
}

function rolePrompt(role: PeerRole, paths: PeerPaths): string {
	const common = [
		`Shared run directory: ${paths.root}`,
		`Read ${paths.brief} first`,
		`Use ${paths.handoffsDir} and ${paths.resultsDir} as the durable handoff trail`,
		"Do not assume hidden context from other runs",
		"Do not launch `oal codex peer`, `oal codex route orchestrate`, native Codex subagents, or another orchestrator",
	].join("\n");
	switch (role) {
		case "orchestrator":
			return `${common}\n\nProduce a concrete ownership split, acceptance criteria, and the next validation handoff. Write no code.`;
		case "validate":
			return `${common}\n\nRead ${join(paths.resultsDir, "orchestrator.md")} when present. Reproduce broadly, list exact variants, and record evidence. Do not implement fixes.`;
		case "worker":
			return `${common}\n\nRead orchestrator and validation results. Implement the complete cohesive fix that satisfies acceptance criteria and validation evidence.`;
		case "review":
			return `${common}\n\nRead orchestrator, validation, and worker results. Audit correctness, regressions, missing tests, and residual risk.`;
		default:
			throw new Error(`Unknown Codex peer role \`${role}\``);
	}
}

async function ensurePeerLayout(paths: PeerPaths): Promise<void> {
	await mkdir(paths.handoffsDir, { recursive: true });
	await mkdir(paths.resultsDir, { recursive: true });
	await mkdir(paths.promptsDir, { recursive: true });
	await mkdir(paths.bootstrapDir, { recursive: true });
}

async function runProcess(
	command: string,
	args: string[],
	cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
	const proc = Bun.spawn([command, ...args], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);
	return { code, stdout, stderr };
}
