import { relative, resolve } from "node:path";
import { sha256 } from "./json";
import { findManagedBlock } from "./managed-block";
import { readManifest } from "./manifest";
import { getManifestPath, resolveManagedPath } from "./paths";
import {
	getPathValue,
	jsonEqual,
	parseStructuredContent,
} from "./structured-config";
import type {
	InstallVerificationIssue,
	InstallVerificationRequest,
	InstallVerificationResult,
	ManagedManifestEntry,
} from "./types";

export async function verifyManagedInstall(
	request: InstallVerificationRequest,
): Promise<InstallVerificationResult> {
	const targetRoot = resolve(request.targetRoot);
	const manifestPath = getManifestPath(
		targetRoot,
		request.surface,
		request.scope,
	);
	if (!(await Bun.file(manifestPath).exists())) {
		return {
			manifestPath,
			issues: [
				{
					code: "missing-manifest",
					message: `Missing managed manifest for ${request.surface}/${request.scope}.`,
					path: relative(targetRoot, manifestPath),
				},
			],
		};
	}

	const manifestResult = await readManifest(manifestPath, targetRoot);
	if (manifestResult.manifest === undefined) {
		return { manifestPath, issues: manifestResult.issues };
	}
	const manifest = manifestResult.manifest;

	const issues: InstallVerificationIssue[] = [];
	for (const entry of manifest.entries) {
		let targetPath: string;
		try {
			targetPath = resolveManagedPath(targetRoot, entry.path);
		} catch (error) {
			issues.push({
				code: "path-escape",
				message: error instanceof Error ? error.message : String(error),
				path: entry.path,
			});
			continue;
		}

		const file = Bun.file(targetPath);
		if (!(await file.exists())) {
			issues.push({
				code: "missing-file",
				message: `Managed file is missing: ${entry.path}`,
				path: entry.path,
			});
			continue;
		}

		const content = await file.text();
		issues.push(...(await verifyManagedEntryContent(entry, content)));

		if (isHookLikeEntry(entry)) {
			const hookIssue = await verifyHookScript(targetPath, entry.path);
			if (hookIssue !== undefined) {
				issues.push(hookIssue);
			}
		}
	}

	return { manifestPath, issues };
}

async function verifyManagedEntryContent(
	entry: ManagedManifestEntry,
	content: string,
): Promise<readonly InstallVerificationIssue[]> {
	switch (entry.installMode ?? "full-file") {
		case "full-file": {
			const actualSha = await sha256(content);
			return actualSha === entry.sha256
				? []
				: [
						{
							code: "hash-mismatch",
							message: `Managed file hash mismatch: ${entry.path}`,
							path: entry.path,
						},
					];
		}
		case "marked-text-block": {
			const block = findManagedBlock(content, entry);
			if (block === undefined) {
				return [
					{
						code: "missing-file",
						message: `Managed block is missing: ${entry.path}`,
						path: entry.path,
					},
				];
			}
			return block === entry.blockContent
				? []
				: [
						{
							code: "hash-mismatch",
							message: `Managed block changed: ${entry.path}`,
							path: entry.path,
						},
					];
		}
		case "structured-object": {
			let parsed: Record<string, unknown>;
			try {
				parsed = parseStructuredContent(entry.path, content);
			} catch (error) {
				return [
					{
						code: "hash-mismatch",
						message: `Managed config parse failed: ${error instanceof Error ? error.message : String(error)}`,
						path: entry.path,
					},
				];
			}
			const issues: InstallVerificationIssue[] = [];
			for (const [path, expected] of Object.entries(
				entry.managedValues ?? {},
			)) {
				const actual = getPathValue(parsed, path);
				if (!jsonEqual(actual, expected)) {
					issues.push({
						code: "hash-mismatch",
						message: `Managed config value changed: ${entry.path}:${path}`,
						path: entry.path,
					});
				}
			}
			return issues;
		}
		default:
			return [];
	}
}

function isHookLikeEntry(entry: ManagedManifestEntry): boolean {
	return entry.artifactKind === "hook" && entry.path.endsWith(".mjs");
}

async function verifyHookScript(
	targetPath: string,
	relativePath: string,
): Promise<InstallVerificationIssue | undefined> {
	const process = Bun.spawn(["bun", targetPath], {
		stderr: "pipe",
		stdin: "pipe",
		stdout: "pipe",
	});
	process.stdin.write("{}");
	process.stdin.end();
	const [stdout, stderr] = await Promise.all([
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
		process.exited,
	]);
	try {
		const parsed = JSON.parse(stdout) as { readonly decision?: unknown };
		if (typeof parsed.decision === "string") {
			return undefined;
		}
	} catch {
		// Report below with stderr/stdout context.
	}
	return {
		code: "hook-execution-failed",
		message: `Hook script did not produce a runtime decision: ${stderr || stdout}`,
		path: relativePath,
	};
}
