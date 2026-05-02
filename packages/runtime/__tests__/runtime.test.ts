import { expect, test } from "bun:test";
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
