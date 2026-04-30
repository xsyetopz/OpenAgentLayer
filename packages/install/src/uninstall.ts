import { rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { readExistingText, removeEmptyManagedParents } from "./filesystem";
import { stableJson } from "./json";
import { findManagedBlockRange } from "./managed-block";
import {
	getManifestPath,
	relativeManifestPath,
	resolveManagedPath,
} from "./paths";
import {
	deletePathValue,
	flattenManagedValues,
	getPathValue,
	jsonEqual,
	parseStructuredContent,
	renderStructuredContent,
} from "./structured-config";
import type {
	InstallVerificationIssue,
	ManagedManifest,
	ManagedManifestEntry,
	UninstallRequest,
	UninstallResult,
} from "./types";

export async function uninstallManagedFiles(
	request: UninstallRequest,
): Promise<UninstallResult> {
	const targetRoot = resolve(request.targetRoot);
	const manifestPath = getManifestPath(
		targetRoot,
		request.surface,
		request.scope,
	);
	if (!(await Bun.file(manifestPath).exists())) {
		return { manifestPath, issues: [], removedFiles: [] };
	}
	const manifest = JSON.parse(
		await Bun.file(manifestPath).text(),
	) as ManagedManifest;
	const removedFiles: string[] = [];
	const issues: InstallVerificationIssue[] = [];
	const remainingEntries: ManagedManifestEntry[] = [];

	for (const entry of [...manifest.entries].sort((left, right) =>
		right.path.localeCompare(left.path),
	)) {
		const targetPath = resolveManagedPath(targetRoot, entry.path);
		const result = await uninstallManagedEntry(targetPath, entry);
		issues.push(...result.issues);
		if (result.removed) {
			removedFiles.push(targetPath);
			await removeEmptyManagedParents(targetRoot, dirname(entry.path));
			continue;
		}
		if (result.issues.length > 0) {
			remainingEntries.push(entry);
		}
	}

	if (issues.length > 0) {
		await writeFile(
			manifestPath,
			`${stableJson({ ...manifest, entries: remainingEntries })}\n`,
		);
		return { manifestPath, issues, removedFiles };
	}

	await rm(manifestPath, { force: true });
	removedFiles.push(manifestPath);
	await removeEmptyManagedParents(
		targetRoot,
		dirname(relativeManifestPath(request.surface, request.scope)),
	);

	return { manifestPath, issues, removedFiles };
}

async function uninstallManagedEntry(
	targetPath: string,
	entry: ManagedManifestEntry,
): Promise<{
	readonly issues: readonly InstallVerificationIssue[];
	readonly removed: boolean;
}> {
	switch (entry.installMode ?? "full-file") {
		case "full-file":
			await rm(targetPath, { force: true });
			return { issues: [], removed: true };
		case "marked-text-block":
			return await uninstallManagedTextBlock(targetPath, entry);
		case "structured-object":
			return await uninstallManagedStructuredObject(targetPath, entry);
		default:
			return { issues: [], removed: false };
	}
}

async function uninstallManagedTextBlock(
	targetPath: string,
	entry: ManagedManifestEntry,
): Promise<{
	readonly issues: readonly InstallVerificationIssue[];
	readonly removed: boolean;
}> {
	const existingContent = await readExistingText(targetPath);
	if (existingContent === undefined) {
		return { issues: [], removed: false };
	}
	const range = findManagedBlockRange(existingContent, entry);
	if (range === undefined) {
		return {
			issues: [managedContentChanged(entry, "Managed block is missing.")],
			removed: false,
		};
	}
	const currentBlock = existingContent.slice(
		range.contentStart,
		range.contentEnd,
	);
	if (currentBlock !== entry.blockContent) {
		return {
			issues: [managedContentChanged(entry, "Managed block was modified.")],
			removed: false,
		};
	}
	const nextContent =
		`${existingContent.slice(0, range.start)}${existingContent.slice(range.end)}`.trim();
	if (nextContent === "") {
		await rm(targetPath, { force: true });
		return { issues: [], removed: true };
	}
	await writeFile(targetPath, `${nextContent}\n`);
	return { issues: [], removed: false };
}

async function uninstallManagedStructuredObject(
	targetPath: string,
	entry: ManagedManifestEntry,
): Promise<{
	readonly issues: readonly InstallVerificationIssue[];
	readonly removed: boolean;
}> {
	const existingContent = await readExistingText(targetPath);
	if (existingContent === undefined) {
		return { issues: [], removed: false };
	}
	const parsed = parseStructuredContent(entry.path, existingContent);
	const issues: InstallVerificationIssue[] = [];
	for (const [path, expected] of Object.entries(entry.managedValues ?? {})) {
		const actual = getPathValue(parsed, path);
		if (jsonEqual(actual, expected)) {
			deletePathValue(parsed, path);
			continue;
		}
		issues.push(
			managedContentChanged(entry, `Managed config value changed: ${path}`),
		);
	}
	if (issues.length > 0) {
		return { issues, removed: false };
	}
	if (Object.keys(flattenManagedValues(parsed)).length === 0) {
		await rm(targetPath, { force: true });
		return { issues: [], removed: true };
	}
	await writeFile(targetPath, renderStructuredContent(entry.path, parsed));
	return { issues: [], removed: false };
}

function managedContentChanged(
	entry: ManagedManifestEntry,
	message: string,
): InstallVerificationIssue {
	return {
		code: "managed-content-changed",
		message,
		path: entry.path,
	};
}
