import { describe, expect, test } from "bun:test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
	createSyntheticHookPayload,
	evaluateCompletionGate,
	evaluateDestructiveCommandGuard,
	evaluatePromptContextInjection,
	evaluateRuntimePolicy,
	evaluateSourceDriftGuard,
	renderRuntimeScript,
} from "@openagentlayer/runtime";
import { createFixtureRoot } from "@openagentlayer/testkit";

describe("OAL runtime policies", () => {
	test("runtime scripts are loaded from separate source files", async () => {
		const script = await readFile(
			new URL("../../src/scripts/completion-gate.mjs", import.meta.url),
			"utf8",
		);

		expect(renderRuntimeScript("completion-gate")).toBe(script);
	});

	test("completion gate allows accepted validation evidence", () => {
		expect(
			evaluateCompletionGate({
				metadata: { validation: "passed" },
				policy_id: "completion-gate",
			}).decision,
		).toBe("allow");
	});

	test("prompt context injection returns prompt append context", () => {
		const decision = evaluatePromptContextInjection({
			event: "UserPromptSubmit",
			policy_id: "prompt-context-injection",
			route: "plan",
			surface: "codex",
		});

		expect(decision.decision).toBe("context");
		expect(decision.context?.["prompt_append"]).toContain(
			"OpenAgentLayer context:",
		);
		expect(decision.context?.["prompt_append"]).toContain("Route: plan");
	});

	test("completion gate denies missing validation evidence", () => {
		expect(
			evaluateCompletionGate({
				metadata: {},
				policy_id: "completion-gate",
			}).decision,
		).toBe("deny");
	});

	test("completion gate reads OpenCode-style nested metadata", () => {
		expect(
			evaluateCompletionGate({
				policy_id: "completion-gate",
				tool_input: { metadata: { validation_passed: true } },
			}).decision,
		).toBe("allow");
	});

	test("destructive command guard denies destructive shell", () => {
		expect(
			evaluateDestructiveCommandGuard({
				command: "rm -rf generated",
				policy_id: "destructive-command-guard",
			}).decision,
		).toBe("deny");
	});

	test("destructive command guard allows read-only shell", () => {
		expect(
			evaluateDestructiveCommandGuard({
				command: "git status --short",
				policy_id: "destructive-command-guard",
			}).decision,
		).toBe("allow");
	});

	test("rendered runtime script accepts stdin JSON", async () => {
		const root = await createFixtureRoot();
		const scriptPath = join(root, "completion-gate.mjs");
		await writeFile(scriptPath, renderRuntimeScript("completion-gate"));

		const process = Bun.spawn(["bun", scriptPath], {
			stdin: "pipe",
			stdout: "pipe",
		});
		process.stdin.write(
			JSON.stringify({ metadata: { validation_passed: true } }),
		);
		process.stdin.end();
		const output = await new Response(process.stdout).text();

		expect(JSON.parse(output).decision).toBe("allow");
	});

	test("synthetic hook payload harness covers supported surface shapes", () => {
		const cases = [
			createSyntheticHookPayload({
				command: "git status --short",
				event: "PreToolUse",
				policyId: "destructive-command-guard",
				surface: "codex",
			}),
			createSyntheticHookPayload({
				event: "Stop",
				metadata: { validation: "passed" },
				policyId: "completion-gate",
				surface: "claude",
			}),
			createSyntheticHookPayload({
				event: "tool.execute.before",
				policyId: "destructive-command-guard",
				surface: "opencode",
				toolInput: { cmd: "bun test ./packages" },
			}),
		];

		expect(
			cases.map((payload) => evaluateRuntimePolicy(payload).decision),
		).toEqual(["allow", "allow", "allow"]);
	});

	test("rendered prompt context script returns context decision", async () => {
		const root = await createFixtureRoot();
		const scriptPath = join(root, "prompt-context-injection.mjs");
		await writeFile(
			scriptPath,
			renderRuntimeScript("prompt-context-injection"),
		);

		const process = Bun.spawn(["bun", scriptPath], {
			stdin: "pipe",
			stdout: "pipe",
		});
		process.stdin.write(
			JSON.stringify({ event: "UserPromptSubmit", surface: "codex" }),
		);
		process.stdin.end();
		const output = await new Response(process.stdout).text();

		expect(JSON.parse(output).decision).toBe("context");
	});

	test("rendered runtime script handles empty stdin as empty payload", async () => {
		const root = await createFixtureRoot();
		const scriptPath = join(root, "destructive-command-guard.mjs");
		await writeFile(
			scriptPath,
			renderRuntimeScript("destructive-command-guard"),
		);

		const process = Bun.spawn(["bun", scriptPath], {
			stdin: "pipe",
			stdout: "pipe",
		});
		process.stdin.end();
		const [exitCode, output] = await Promise.all([
			process.exited,
			new Response(process.stdout).text(),
		]);
		const decision = JSON.parse(output);

		expect(exitCode).toBe(0);
		expect(decision).toMatchObject({
			decision: "allow",
			policy_id: "destructive-command-guard",
		});
	});

	test("rendered runtime script fails malformed JSON payloads", async () => {
		const root = await createFixtureRoot();
		const scriptPath = join(root, "completion-gate.mjs");
		await writeFile(scriptPath, renderRuntimeScript("completion-gate"));

		const process = Bun.spawn(["bun", scriptPath], {
			stderr: "pipe",
			stdin: "pipe",
			stdout: "pipe",
		});
		process.stdin.write("{bad json");
		process.stdin.end();
		const [exitCode, stderr] = await Promise.all([
			process.exited,
			new Response(process.stderr).text(),
		]);

		expect(exitCode).not.toBe(0);
		expect(stderr).toContain("SyntaxError");
	});

	test("source drift guard allows clean manifest", async () => {
		const root = await createFixtureRoot();
		const filePath = join(root, "managed.txt");
		await writeFile(filePath, "clean\n");
		const manifestPath = await writeManifest(root, "clean\n");

		const decision = await evaluateSourceDriftGuard({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("allow");
	});

	test("source drift guard denies missing and changed files", async () => {
		const root = await createFixtureRoot();
		const manifestPath = await writeManifest(root, "expected\n");

		const missing = await evaluateSourceDriftGuard({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});
		await writeFile(join(root, "managed.txt"), "changed\n");
		const changed = await evaluateSourceDriftGuard({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});

		expect(missing.decision).toBe("deny");
		expect(changed.decision).toBe("deny");
	});

	test("source drift guard discovers managed manifests from cwd", async () => {
		const root = await createFixtureRoot();
		await writeFile(join(root, "managed.txt"), "clean\n");
		await writeManifest(root, "clean\n");

		const decision = await evaluateSourceDriftGuard({
			cwd: root,
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("allow");
	});

	test("source drift guard denies missing manifest", async () => {
		const root = await createFixtureRoot();

		const decision = await evaluateSourceDriftGuard({
			metadata: {
				manifest_path: join(root, ".oal/manifest/codex-project.json"),
				target_root: root,
			},
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("deny");
	});

	test("source drift guard rejects escaping manifest paths and ignores forged target root", async () => {
		const root = await createFixtureRoot();
		const forgedRoot = await createFixtureRoot();
		const manifestPath = join(root, ".oal/manifest/codex-project.json");
		await mkdir(dirname(manifestPath), { recursive: true });
		await writeFile(
			manifestPath,
			JSON.stringify({
				entries: [{ path: "..\\escape.txt", sha256: "bad" }],
				targetRoot: forgedRoot,
			}),
		);

		const decision = await evaluateSourceDriftGuard({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("deny");
		expect(decision.context?.["issues"]).toContain(
			"path-escape:..\\escape.txt",
		);
	});
});

async function writeManifest(
	root: string,
	expectedContent: string,
): Promise<string> {
	const manifestPath = join(root, ".oal/manifest/codex-project.json");
	await mkdir(dirname(manifestPath), { recursive: true });
	await writeFile(
		manifestPath,
		JSON.stringify({
			entries: [
				{
					path: "managed.txt",
					sha256: await sha256(expectedContent),
				},
			],
			targetRoot: root,
		}),
	);
	return manifestPath;
}

async function sha256(content: string): Promise<string> {
	const bytes = new TextEncoder().encode(content);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
