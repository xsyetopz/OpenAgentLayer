import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { HookRecord, OalSource } from "@openagentlayer/source";

interface HookFixture {
	input: unknown;
	decision: "pass" | "warn" | "block";
}

const HOOK_BEHAVIOR_FIXTURES: Record<string, HookFixture> = {
	block_protected_branch: {
		input: { branch: "main", command: "git push origin main" },
		decision: "block",
	},
	block_caveman_filler: {
		input: {
			cavemanMode: "caveman",
			cavemanModeActive: true,
			cavemanCompliant: false,
			contractViolations: ["filler"],
		},
		decision: "block",
	},
	inject_changed_files: {
		input: { provider: "codex", route: "implement" },
		decision: "pass",
	},
	require_completion_evidence: {
		input: {
			status: "complete",
			finalResponse: "STATUS PASS",
			validationEvidence: ["bun run accept"],
		},
		decision: "pass",
	},
	block_secret_output: {
		input: { output: "token ghp_123456789012345678901234567890123456" },
		decision: "block",
	},
	block_destructive_commands: {
		input: { command: "rm -rf /tmp/example" },
		decision: "block",
	},
	block_generated_drift: {
		input: { generatedEditWithoutSource: true },
		decision: "block",
	},
	block_env_file_access: {
		input: { paths: [".env"] },
		decision: "block",
	},
	require_execution_evidence: {
		input: { routeKind: "execution-required", finalResponse: "done" },
		decision: "block",
	},
	require_source_evidence: {
		input: {
			status: "complete",
			behaviorChanged: true,
			sourceEvidence: [{ type: "screenshot", path: "screen.png" }],
		},
		decision: "block",
	},
	block_explanation_only: {
		input: {
			routeKind: "execution-required",
			explanationOnly: true,
		},
		decision: "block",
	},
	block_generated_edits: {
		input: {
			files: [
				{ path: "generated/config.toml", generated: true, changed: true },
			],
		},
		decision: "block",
	},
	inject_git_context: {
		input: { provider: "codex", route: "plan" },
		decision: "pass",
	},
	warn_large_diff: {
		input: { changedLines: 1200, largeDiffThreshold: 800 },
		decision: "warn",
	},
	block_demo_artifacts: {
		input: { files: [{ path: "src/demo.ts", demo: true }] },
		decision: "block",
	},
	block_sentinel_markers: {
		input: { files: [{ path: "src/runtime.ts", content: "FIXME: finish" }] },
		decision: "block",
	},
	inject_package_scripts: {
		input: { provider: "claude", route: "test" },
		decision: "pass",
	},
	inject_project_memory: {
		input: { provider: "opencode", route: "resume" },
		decision: "pass",
	},
	block_repeated_failures: {
		input: { failures: ["one", "two", "three"], threshold: 3 },
		decision: "block",
	},
	inject_route_context: {
		input: { provider: "codex", route: "implement" },
		decision: "pass",
	},
	enforce_route_contract: {
		input: { routeKind: "edit-required", changedFiles: [] },
		decision: "block",
	},
	enforce_rtk_commands: {
		input: { command: "git status" },
		decision: "block",
	},
	block_secret_files: {
		input: { paths: [".env"] },
		decision: "block",
	},
	inject_subagent_context: {
		input: { provider: "claude", route: "review" },
		decision: "pass",
	},
	block_unsafe_git: {
		input: { command: "git push --force origin main" },
		decision: "block",
	},
	require_validation_evidence: {
		input: { status: "complete", finalResponse: "STATUS PASS" },
		decision: "block",
	},
	block_weak_blocked: {
		input: { status: "blocked", finalResponse: "blocked" },
		decision: "block",
	},
	advise_command_tools: {
		input: { command: "grep -R SentinelTag ." },
		decision: "warn",
	},
};

export async function assertHooks(
	targetRoot: string,
	source: OalSource,
): Promise<void> {
	for (const hook of source.hooks) await assertSourceHook(targetRoot, hook);
	await assertRtkHookBehavior(targetRoot);
	await assertProviderNativeHookOutput(targetRoot);
	await assertMalformedInput(
		join(targetRoot, ".codex/openagentlayer/hooks/inject-route-context.mjs"),
	);
}

async function assertSourceHook(
	targetRoot: string,
	hook: HookRecord,
): Promise<void> {
	const fixture = HOOK_BEHAVIOR_FIXTURES[hook.id];
	if (!fixture)
		throw new Error(`Missing hook behavior fixture for \`${hook.id}\``);
	await assertHook(
		join(targetRoot, hookPath(hook.providers[0] ?? "codex", hook.script)),
		fixture.input,
		fixture.decision,
	);
}

function hookPath(provider: string, script: string): string {
	if (provider === "claude") return `.claude/hooks/scripts/${script}`;
	if (provider === "opencode")
		return `.opencode/openagentlayer/hooks/${script}`;
	return `.codex/openagentlayer/hooks/${script}`;
}

async function assertHook(
	scriptPath: string,
	input: unknown,
	expected: "pass" | "warn" | "block",
): Promise<void> {
	const proc = Bun.spawn(["bun", scriptPath], {
		env: { ...process.env, OAL_HOOK_RAW_OUTCOME: "1" },
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	proc.stdin.write(JSON.stringify(input));
	proc.stdin.end();
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;
	if (stdout.trim().length === 0)
		throw new Error(
			`Hook ${scriptPath} emitted no JSON. exit=${exitCode} stderr=${stderr}`,
		);
	const output = JSON.parse(stdout) as {
		allowed?: boolean;
		decision?: string;
	};
	const decision =
		output.decision ?? (output.allowed === false ? "block" : "pass");
	if (decision !== expected)
		throw new Error(
			`Hook ${scriptPath} returned ${decision}, expected ${expected}`,
		);
}

async function assertMalformedInput(scriptPath: string): Promise<void> {
	const proc = Bun.spawn(["bun", scriptPath], {
		env: {
			...process.env,
			OAL_HOOK_PROVIDER: "codex",
			OAL_HOOK_EVENT: "PreToolUse",
		},
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	proc.stdin.write("not-json");
	proc.stdin.end();
	const stdout = await new Response(proc.stdout).text();
	await proc.exited;
	const output = JSON.parse(stdout) as {
		hookSpecificOutput?: { permissionDecision?: string };
	};
	if (output.hookSpecificOutput?.permissionDecision !== "deny")
		throw new Error(
			`Hook ${scriptPath} did not fail closed on malformed input.`,
		);
}

async function assertProviderNativeHookOutput(
	targetRoot: string,
): Promise<void> {
	const scriptPath = join(
		targetRoot,
		".codex/openagentlayer/hooks/enforce-rtk-commands.mjs",
	);
	const pass = await runNativeHook(
		scriptPath,
		{ hook_event_name: "PreToolUse", command: "rtk git status" },
		{ OAL_HOOK_PROVIDER: "codex", OAL_HOOK_EVENT: "PreToolUse" },
	);
	if (pass.stdout !== "")
		throw new Error(
			"Codex pass hook emitted stdout instead of passing through.",
		);
	const codexDeny = await runNativeHook(
		scriptPath,
		{ hook_event_name: "PreToolUse", command: "git status" },
		{ OAL_HOOK_PROVIDER: "codex", OAL_HOOK_EVENT: "PreToolUse" },
	);
	if (
		JSON.parse(codexDeny.stdout).hookSpecificOutput?.permissionDecision !==
		"deny"
	)
		throw new Error("Codex PreToolUse hook did not emit native deny output");
	const claudeDeny = await runNativeHook(
		join(targetRoot, ".claude/hooks/scripts/enforce-rtk-commands.mjs"),
		{ hook_event_name: "PreToolUse", command: "git status" },
		{ OAL_HOOK_PROVIDER: "claude", OAL_HOOK_EVENT: "PreToolUse" },
	);
	if (
		JSON.parse(claudeDeny.stdout).hookSpecificOutput?.permissionDecision !==
		"deny"
	)
		throw new Error("Claude PreToolUse hook did not emit native deny output");
	const codexPostToolBlock = await runNativeHook(
		join(targetRoot, ".codex/openagentlayer/hooks/block-repeated-failures.mjs"),
		{
			hook_event_name: "PostToolUse",
			failures: ["one", "two", "three"],
			threshold: 3,
		},
		{ OAL_HOOK_PROVIDER: "codex", OAL_HOOK_EVENT: "PostToolUse" },
	);
	if (codexPostToolBlock.exitCode !== 2)
		throw new Error("Codex PostToolUse block did not exit with code 2");
	if (!codexPostToolBlock.stderr.includes("Repeated symptom circuit opened"))
		throw new Error("Codex PostToolUse block did not emit stderr feedback");
	const claudePostToolFailureBlock = await runNativeHook(
		join(targetRoot, ".claude/hooks/scripts/block-repeated-failures.mjs"),
		{
			hook_event_name: "PostToolUseFailure",
			failures: ["one", "two", "three"],
			threshold: 3,
		},
		{
			OAL_HOOK_PROVIDER: "claude",
			OAL_HOOK_EVENT: "PostToolUseFailure",
		},
	);
	if (claudePostToolFailureBlock.exitCode !== 2)
		throw new Error(
			"Claude PostToolUseFailure block did not exit with code 2.",
		);
	if (
		!claudePostToolFailureBlock.stderr.includes(
			"Repeated symptom circuit opened",
		)
	)
		throw new Error(
			"Claude PostToolUseFailure block did not emit stderr feedback.",
		);
	const claudePostOutput = JSON.parse(claudePostToolFailureBlock.stdout) as {
		hookSpecificOutput?: { additionalContext?: string };
	};
	if (
		!claudePostOutput.hookSpecificOutput?.additionalContext?.includes(
			"Repeated symptom circuit opened",
		)
	)
		throw new Error(
			"Claude PostToolUseFailure block did not emit native additional context.",
		);
	const plugin = await readFile(
		join(targetRoot, ".opencode/plugins/openagentlayer.ts"),
		"utf8",
	);
	for (const term of [
		'"tool.execute.before"',
		'"tool.execute.after"',
		"output.args.command = replacement",
		"throw new Error",
		"evaluateFailureLoop",
		"styleHookMessage",
		"styleHookLines",
		"blockIfNeeded(evaluateFailureLoop(output ?? {}))",
	])
		if (!plugin.includes(term))
			throw new Error(
				`OpenCode plugin missing active hook behavior: \`${term}\``,
			);
	if (plugin.includes("output.metadata"))
		throw new Error("OpenCode plugin uses metadata-only hook behavior");
}

async function runNativeHook(
	scriptPath: string,
	input: unknown,
	env: Record<string, string>,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const proc = Bun.spawn(["bun", scriptPath], {
		env: { ...process.env, ...env },
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	proc.stdin.write(JSON.stringify(input));
	proc.stdin.end();
	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;
	return { stdout, stderr, exitCode };
}

async function assertRtkHookBehavior(targetRoot: string): Promise<void> {
	const scriptPath = join(
		targetRoot,
		".codex/openagentlayer/hooks/enforce-rtk-commands.mjs",
	);
	await assertHook(scriptPath, { command: "git status" }, "block");
	await assertHook(scriptPath, { command: "rtk git status" }, "pass");
	await assertHook(scriptPath, { command: "make check" }, "warn");
	await assertHook(scriptPath, { command: "cat package.json" }, "block");
	const script = `${await readFile(scriptPath, "utf8")}\n${await readFile(
		join(targetRoot, ".codex/openagentlayer/hooks/_command-policy.mjs"),
		"utf8",
	)}`;
	for (const command of [
		"git",
		"gh",
		"cat",
		"read",
		"pytest",
		"mypy",
		"ruff",
		"go",
		"cargo",
		"docker",
		"kubectl",
		"aws",
		"curl",
		"glab",
	])
		if (!script.includes(`"${command}"`))
			throw new Error(`RTK enforcement hook missing command \`${command}\``);
	const rewriteSupport = await readFile(
		join(targetRoot, ".codex/openagentlayer/hooks/_bun-rewrite.mjs"),
		"utf8",
	);
	for (const replacement of ["bunx", '"run"', '"add"', "bun install", '"pm"'])
		if (!rewriteSupport.includes(replacement))
			throw new Error(
				`RTK enforcement hook missing Bun rewrite ${replacement}.`,
			);
}
