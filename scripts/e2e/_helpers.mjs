import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const REPO_ROOT = new URL("../..", import.meta.url).pathname;

export async function commandExists(binary) {
	const result = await runProcess({
		args: ["zsh", "-lc", `command -v ${shellQuote(binary)}`],
		cwd: REPO_ROOT,
		timeoutMs: 10_000,
	});
	return result.exitCode === 0 && result.stdout.trim().length > 0;
}

export async function createTempProject(surface) {
	const directory = await mkdtemp(join(tmpdir(), `oal-${surface}-e2e-`));
	await writeFile(join(directory, "README.md"), `# ${surface} e2e fixture\n`);
	return directory;
}

export async function installSurface(surface, target) {
	return await runProcess({
		args: [
			"bun",
			"packages/cli/src/cli.ts",
			"install",
			"--surface",
			surface,
			"--scope",
			"project",
			"--target",
			target,
		],
		cwd: REPO_ROOT,
		timeoutMs: 60_000,
	});
}

export async function readModelCandidates(surface) {
	const glob = new Bun.Glob("source/model-plans/*/model-plan.toml");
	const models = new Set();
	for await (const path of glob.scan({ cwd: REPO_ROOT })) {
		const source = await readFile(join(REPO_ROOT, path), "utf8");
		if (!source.includes(`"${surface}"`)) {
			continue;
		}
		for (const match of source.matchAll(
			/(?:default_model|model) = "([^"]+)"/gu,
		)) {
			models.add(match[1]);
		}
	}
	return [...models];
}

export function requiredProviderFiles(surface) {
	switch (surface) {
		case "codex":
			return [
				"AGENTS.md",
				".codex/config.toml",
				".codex/agents/athena.toml",
				".codex/openagentlayer/plugin/.codex-plugin/plugin.json",
				".codex/openagentlayer/plugin/skills/command-implement/SKILL.md",
				".codex/openagentlayer/plugin/skills/review/SKILL.md",
				".codex/openagentlayer/runtime/completion-gate.mjs",
			];
		case "claude":
			return [
				"CLAUDE.md",
				".claude/settings.json",
				".claude/agents/athena.md",
				".claude/commands/implement.md",
				".claude/skills/review/SKILL.md",
				".claude/openagentlayer/runtime/completion-gate.mjs",
			];
		case "opencode":
			return [
				"opencode.json",
				".opencode/agents/athena.md",
				".opencode/commands/implement.md",
				".opencode/openagentlayer/instructions.md",
				".opencode/plugins/openagentlayer.ts",
				".opencode/skills/review/SKILL.md",
				".opencode/openagentlayer/runtime/completion-gate.mjs",
			];
		default:
			throw new Error(`Unsupported e2e surface '${surface}'.`);
	}
}

export function providerInspectionPrompt(surface, marker) {
	const paths = requiredProviderFiles(surface)
		.map((path) => `- ${path}`)
		.join("\n");
	return [
		"Inspect these generated provider-native files without editing them:",
		paths,
		`If every listed file exists and is readable, respond exactly ${marker}`,
	].join("\n");
}

export async function runProviderE2E({
	binary,
	commandExistsFn = commandExists,
	createTempProjectFn = createTempProject,
	cleanupProjectFn = async (project) =>
		await rm(project, { force: true, recursive: true }),
	installSurfaceFn = installSurface,
	logFn = console.log,
	modelCandidatesFn = readModelCandidates,
	probe,
	scenario,
	surface,
}) {
	if (!(await commandExistsFn(binary))) {
		logFn(`skip ${surface}: '${binary}' binary not installed`);
		return 0;
	}

	const models = await modelCandidatesFn(surface);
	if (models.length === 0) {
		logFn(`skip ${surface}: no source model candidates found`);
		return 0;
	}

	for (const model of models) {
		const project = await createTempProjectFn(surface);
		try {
			const install = await installSurfaceFn(surface, project);
			if (install.exitCode !== 0) {
				console.error(install.stderr || install.stdout);
				return install.exitCode;
			}

			const probeResult = await probe({ model, project });
			if (!probeResult.ok) {
				logFn(`skip ${surface}/${model}: ${probeResult.reason}`);
				continue;
			}

			const scenarioResult = await scenario({ model, project });
			if (!scenarioResult.ok) {
				console.error(`fail ${surface}/${model}: ${scenarioResult.reason}`);
				return 1;
			}

			logFn(`ok ${surface}/${model}`);
			return 0;
		} finally {
			await cleanupProjectFn(project);
		}
	}

	logFn(
		`skip ${surface}: no installed/authenticated source model returned a probe response`,
	);
	return 0;
}

export async function runProcess({ args, cwd, input, timeoutMs }) {
	const process = Bun.spawn(args, {
		cwd,
		stderr: "pipe",
		stdin: input === undefined ? "ignore" : "pipe",
		stdout: "pipe",
	});
	if (input !== undefined) {
		process.stdin.write(input);
		process.stdin.end();
	}

	const timeout = new Promise((resolve) => {
		setTimeout(() => resolve({ timedOut: true }), timeoutMs);
	});
	const completed = Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]).then(([exitCode, stdout, stderr]) => ({
		exitCode,
		stderr,
		stdout,
		timedOut: false,
	}));
	const result = await Promise.race([completed, timeout]);
	if (result.timedOut) {
		process.kill();
		return { exitCode: 124, stderr: "timed out", stdout: "" };
	}
	return result;
}

export function responseContainsOk(result, marker) {
	if (result.exitCode !== 0) {
		return { ok: false, reason: summarizeFailure(result) };
	}
	const combined = `${result.stdout}\n${result.stderr}`;
	return combined.includes(marker)
		? { ok: true }
		: { ok: false, reason: `response missing ${marker}` };
}

export function summarizeFailure(result) {
	const text = `${result.stderr}\n${result.stdout}`
		.trim()
		.replace(/\s+/gu, " ");
	return text.length === 0 ? `exit ${result.exitCode}` : text.slice(0, 240);
}

function shellQuote(value) {
	return `'${value.replaceAll("'", "'\\''")}'`;
}
