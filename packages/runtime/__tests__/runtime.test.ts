import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { assertRuntimeHooksExecutable, runtimeHooks } from "../src";

test("runtime hook inventory uses executable mjs scripts", async () => {
	expect(runtimeHooks.every((hook) => hook.endsWith(".mjs"))).toBe(true);
	await assertRuntimeHooksExecutable(resolve(import.meta.dir, "../../.."));
});

async function runHook(
	input: unknown,
): Promise<{ decision?: string; details?: string[] }> {
	const result = await runHookRaw(input);
	return JSON.parse(result.stdout);
}

async function runHookRaw(
	input: unknown,
): Promise<{ code: number; stdout: string }> {
	const hookPath = resolve(
		import.meta.dir,
		"../hooks/enforce-rtk-commands.mjs",
	);
	const proc = Bun.spawn(["bun", hookPath], {
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	proc.stdin.write(JSON.stringify(input));
	proc.stdin.end();
	const stdout = await new Response(proc.stdout).text();
	const code = await proc.exited;
	return { code, stdout };
}

test("RTK hook enforces supported commands and proxies unsupported commands", async () => {
	await expect(
		runHook({
			command: "git status",
			rtkInstalled: true,
			rtkPolicyPresent: true,
		}),
	).resolves.toMatchObject({
		decision: "block",
		details: ["Use: rtk git status"],
	});
	await expect(runHook({ command: "rtk git status" })).resolves.toMatchObject({
		decision: "pass",
	});
	await expect(
		runHook({
			command: "cat package.json",
			rtkInstalled: true,
			rtkPolicyPresent: true,
		}),
	).resolves.toMatchObject({
		decision: "block",
		details: ["Use: rtk read package.json"],
	});
	await expect(runHook({ command: "make check" })).resolves.toMatchObject({
		decision: "warn",
		details: ["Use when useful: rtk proxy -- make check"],
	});
});

test("RTK hook requires binary and RTK.md before enforcing supported commands", async () => {
	await expect(
		runHook({
			command: "git status",
			rtkInstalled: false,
			rtkPolicyPresent: false,
		}),
	).resolves.toMatchObject({
		decision: "block",
		reason: expect.stringContaining("binary"),
	});
	await expect(
		runHook({
			command: "git status",
			rtkInstalled: true,
			rtkPolicyPresent: false,
		}),
	).resolves.toMatchObject({
		decision: "block",
		details: expect.arrayContaining(["Initialize Codex: rtk init -g --codex"]),
	});
});

test("RTK hook rewrites replaceable Node.js package-manager commands to Bun", async () => {
	for (const [command, replacement] of [
		["npx prettier foo.js", "rtk proxy -- bunx prettier foo.js"],
		["npm run test", "rtk proxy -- bun run test"],
		["pnpm add zod", "rtk proxy -- bun add zod"],
		["yarn add zod", "rtk proxy -- bun add zod"],
		["yarn dlx prettier foo.js", "rtk proxy -- bunx prettier foo.js"],
		["yarn test", "rtk proxy -- bun run test"],
	] as const) {
		await expect(runHook({ command })).resolves.toMatchObject({
			decision: "block",
			details: [`Use: ${replacement}`],
		});
	}
	await expect(
		runHook({ tool_input: { command: "npx prettier foo.js" } }),
	).resolves.toMatchObject({
		decision: "block",
		details: ["Use: rtk proxy -- bunx prettier foo.js"],
	});
	const codexPreToolUse = await runHookRaw({
		hook_event_name: "PreToolUse",
		tool_input: { command: "npx prettier foo.js" },
	});
	expect(codexPreToolUse.code).toBe(0);
	expect(JSON.parse(codexPreToolUse.stdout)).toMatchObject({
		hookSpecificOutput: {
			hookEventName: "PreToolUse",
			permissionDecision: "deny",
			permissionDecisionReason: expect.stringContaining(
				"rtk proxy -- bunx prettier foo.js",
			),
		},
	});
	await expect(
		runHook({ command: "yarn set version stable" }),
	).resolves.toMatchObject({
		decision: "warn",
	});
	await expect(runHook({ command: "deno test" })).resolves.toMatchObject({
		decision: "warn",
	});
	await expect(
		runHook({ command: "rtk proxy -- bun run test" }),
	).resolves.toMatchObject({
		decision: "pass",
	});
});

test("privileged exec helper denies by default and supports dry-run allowlist", async () => {
	const root = await mkdtemp(resolve(tmpdir(), "oal-privileged-"));
	const allowed = await runPrivileged({
		argv: ["xcodebuild", "-version"],
		cwd: root,
		allowedRoot: root,
		dryRun: true,
	});
	expect(allowed).toMatchObject({ ok: true, dryRun: true });
	const denied = await runPrivileged({
		argv: ["whoami"],
		cwd: root,
		allowedRoot: root,
		dryRun: true,
	});
	expect(denied).toMatchObject({ ok: false });
	const shellString = await runPrivileged({
		argv: ["xcodebuild", "-version;rm"],
		cwd: root,
		allowedRoot: root,
		dryRun: true,
	});
	expect(shellString).toMatchObject({ ok: false });
	const outside = await runPrivileged({
		argv: ["xcodebuild", "-version"],
		cwd: "/",
		allowedRoot: root,
		dryRun: true,
	});
	expect(outside).toMatchObject({ ok: false });
	await rm(root, { recursive: true, force: true });
});

async function runPrivileged(input: unknown): Promise<Record<string, unknown>> {
	const scriptPath = resolve(
		import.meta.dir,
		"../privileged/privileged-exec.mjs",
	);
	const proc = Bun.spawn(["bun", scriptPath], {
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});
	proc.stdin.write(JSON.stringify(input));
	proc.stdin.end();
	const stdout = await new Response(proc.stdout).text();
	await proc.exited;
	return JSON.parse(stdout);
}
