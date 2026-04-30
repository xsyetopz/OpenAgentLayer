import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { renderRuntimeScript } from "@openagentlayer/runtime";
import { createFixtureRoot } from "@openagentlayer/testkit";

type RuntimeScriptId = Parameters<typeof renderRuntimeScript>[0];
export type RuntimeScriptDecision = "allow" | "context" | "deny" | "warn";

export interface RuntimeScriptResult {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

export async function writeRuntimeScript(
	script: RuntimeScriptId,
): Promise<string> {
	const root = await createFixtureRoot();
	const scriptPath = join(root, `${script}.mjs`);
	await writeFile(scriptPath, renderRuntimeScript(script));
	return scriptPath;
}

export async function runRuntimeScript(
	script: RuntimeScriptId,
	stdin: string,
): Promise<RuntimeScriptResult> {
	const process = Bun.spawn(["bun", await writeRuntimeScript(script)], {
		stderr: "pipe",
		stdin: "pipe",
		stdout: "pipe",
	});
	process.stdin.write(stdin);
	process.stdin.end();
	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]);

	return { exitCode, stdout, stderr };
}

export async function writeManagedManifest(
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

export async function writeForgedManifest(
	root: string,
	forgedRoot: string,
): Promise<string> {
	const manifestPath = join(root, ".oal/manifest/codex-project.json");
	await mkdir(dirname(manifestPath), { recursive: true });
	await writeFile(
		manifestPath,
		JSON.stringify({
			entries: [{ path: "..\\escape.txt", sha256: "bad" }],
			targetRoot: forgedRoot,
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

export function expectedDecisionForPolicy(
	policyId: string,
): RuntimeScriptDecision {
	switch (policyId) {
		case "completion-gate":
			return "deny";
		case "prompt-context-injection":
		case "prompt-git-context":
		case "subagent-route-context":
			return "context";
		case "source-drift-guard":
			return "deny";
		default:
			return "allow";
	}
}
