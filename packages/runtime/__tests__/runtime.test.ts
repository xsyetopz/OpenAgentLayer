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
	await proc.exited;
	return JSON.parse(stdout);
}

test("RTK hook enforces supported commands and proxies unsupported commands", async () => {
	await expect(runHook({ command: "git status" })).resolves.toMatchObject({
		decision: "block",
		details: ["Use: rtk git status"],
	});
	await expect(runHook({ command: "rtk git status" })).resolves.toMatchObject({
		decision: "pass",
	});
	await expect(runHook({ command: "cat package.json" })).resolves.toMatchObject(
		{
			decision: "block",
			details: ["Use: rtk read package.json"],
		},
	);
	await expect(runHook({ command: "make check" })).resolves.toMatchObject({
		decision: "warn",
		details: ["Use when useful: rtk proxy -- make check"],
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
