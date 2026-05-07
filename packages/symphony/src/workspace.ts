import { spawn } from "node:child_process";
import { mkdir, realpath, rm, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { Issue, SymphonyConfig, Workspace } from "./types";

export type HookRunner = (
	script: string,
	cwd: string,
	timeoutMs: number,
) => Promise<void>;

export function workspaceKey(identifier: string): string {
	return identifier.replaceAll(/[^A-Za-z0-9._-]/g, "_");
}

export async function ensureWorkspace(
	config: SymphonyConfig,
	issue: Issue,
	runHook: HookRunner = runShellHook,
): Promise<Workspace> {
	const key = workspaceKey(issue.identifier);
	const root = resolve(config.workspace.root);
	const path = resolve(root, key);
	if (!isContained(root, path))
		throw new Error(`Workspace path escapes root: ${issue.identifier}`);
	await mkdir(root, { recursive: true });
	let createdNow = false;
	try {
		await mkdir(path);
		createdNow = true;
	} catch (error) {
		if (!isExistsError(error)) throw error;
		const existing = await stat(path);
		if (!existing.isDirectory())
			throw new Error(`Workspace path exists and is not a directory: ${path}`);
	}
	await assertRealPathContained(root, path);
	if (createdNow && config.hooks.after_create)
		await runHook(config.hooks.after_create, path, config.hooks.timeout_ms);
	return { path, workspace_key: key, created_now: createdNow };
}

export async function removeWorkspace(
	config: SymphonyConfig,
	issue: Issue,
	runHook: HookRunner = runShellHook,
): Promise<void> {
	const root = resolve(config.workspace.root);
	const path = resolve(root, workspaceKey(issue.identifier));
	if (!isContained(root, path))
		throw new Error(`Workspace path escapes root: ${issue.identifier}`);
	if (config.hooks.before_remove) {
		try {
			await runHook(config.hooks.before_remove, path, config.hooks.timeout_ms);
		} catch {
			// Best-effort by spec: cleanup proceeds even when before_remove fails.
		}
	}
	await rm(path, { recursive: true, force: true });
}

export async function runShellHook(
	script: string,
	cwd: string,
	timeoutMs: number,
): Promise<void> {
	await new Promise<void>((resolvePromise, reject) => {
		const child = spawn("sh", ["-lc", script], { cwd, stdio: "ignore" });
		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`Hook timed out after ${timeoutMs}ms`));
		}, timeoutMs);
		child.on("exit", (code) => {
			clearTimeout(timeout);
			if (code === 0) resolvePromise();
			else reject(new Error(`Hook failed with exit code ${code}`));
		});
		child.on("error", (error) => {
			clearTimeout(timeout);
			reject(error);
		});
	});
}

function isExistsError(error: unknown): boolean {
	return Boolean(
		error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "EEXIST",
	);
}

function isContained(root: string, child: string): boolean {
	const rel = relative(root, child);
	return rel === "" || !(rel.startsWith("..") || rel.startsWith("/"));
}

async function assertRealPathContained(
	root: string,
	child: string,
): Promise<void> {
	const [realRoot, realChild] = await Promise.all([
		realpath(root),
		realpath(child),
	]);
	if (!isContained(realRoot, realChild))
		throw new Error(`Workspace real path escapes root: ${child}`);
}
