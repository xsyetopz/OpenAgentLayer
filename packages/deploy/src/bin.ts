import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const MANIFEST_PATH = ".openagentlayer/manifest/global/cli.json";

export interface BinPlan {
	action: "write" | "update" | "skip" | "remove";
	path: string;
	reason: string;
	content: string;
	opendexPath: string;
	opendexContent: string;
}

export interface BinManifest {
	product: "OpenAgentLayer";
	version: 1;
	path: string;
	hash: string;
	source: string;
	opendexPath?: string;
	opendexHash?: string;
}

export function planBinInstall(binDir: string, entrypoint: string): BinPlan {
	const path = join(binDir, "oal");
	const opendexPath = join(binDir, "opendex");
	return {
		action: "write",
		path,
		reason: "owned CLI shim",
		content: renderShim(entrypoint),
		opendexPath,
		opendexContent: renderShim(entrypoint, ["opendex"]),
	};
}

export async function refineBinPlan(plan: BinPlan): Promise<BinPlan> {
	try {
		const [current, opendexCurrent] = await Promise.all([
			readFile(plan.path, "utf8"),
			readFile(plan.opendexPath, "utf8"),
		]);
		return {
			...plan,
			action:
				current === plan.content && opendexCurrent === plan.opendexContent
					? "skip"
					: "update",
		};
	} catch {
		return plan;
	}
}

export async function applyBinInstall(
	home: string,
	plan: BinPlan,
	entrypoint: string,
): Promise<void> {
	await mkdir(dirname(plan.path), { recursive: true });
	await writeFile(plan.path, plan.content, { mode: 0o755 });
	await chmod(plan.path, 0o755);
	await writeFile(plan.opendexPath, plan.opendexContent, { mode: 0o755 });
	await chmod(plan.opendexPath, 0o755);
	await writeManifest(home, {
		product: "OpenAgentLayer",
		version: 1,
		path: plan.path,
		hash: hash(plan.content),
		source: entrypoint,
		opendexPath: plan.opendexPath,
		opendexHash: hash(plan.opendexContent),
	});
}

export async function removeBinInstall(home: string): Promise<BinPlan> {
	const manifestPath = join(home, MANIFEST_PATH);
	const manifest = JSON.parse(
		await readFile(manifestPath, "utf8"),
	) as BinManifest;
	try {
		const current = await readFile(manifest.path, "utf8");
		if (hash(current) === manifest.hash) {
			await rm(manifest.path);
			await removeOwnedOpenDexShim(manifest);
			await rm(manifestPath);
			return {
				action: "remove",
				path: manifest.path,
				reason: "owned CLI shim hash matched",
				content: current,
				opendexPath: manifest.opendexPath ?? "",
				opendexContent: "",
			};
		}
		return {
			action: "skip",
			path: manifest.path,
			reason: "user modified CLI shim",
			content: current,
			opendexPath: manifest.opendexPath ?? "",
			opendexContent: "",
		};
	} catch {
		await removeOwnedOpenDexShim(manifest);
		await rm(manifestPath);
		return {
			action: "skip",
			path: manifest.path,
			reason: "CLI shim already absent",
			content: "",
			opendexPath: manifest.opendexPath ?? "",
			opendexContent: "",
		};
	}
}

export function binManifestPath(home: string): string {
	return join(home, MANIFEST_PATH);
}

export function pathContains(
	directory: string,
	pathEnv = process.env["PATH"] ?? "",
): boolean {
	return pathEnv.split(":").includes(directory);
}

function renderShim(entrypoint: string, prefixArgs: string[] = []): string {
	const prefix = prefixArgs.map((arg) => JSON.stringify(arg)).join(" ");
	return [
		"#!/usr/bin/env sh",
		"set -eu",
		`exec bun ${JSON.stringify(entrypoint)}${prefix ? ` ${prefix}` : ""} "$@"`,
		"",
	].join("\n");
}

async function removeOwnedOpenDexShim(manifest: BinManifest): Promise<void> {
	if (!(manifest.opendexPath && manifest.opendexHash)) return;
	try {
		const current = await readFile(manifest.opendexPath, "utf8");
		if (hash(current) === manifest.opendexHash) await rm(manifest.opendexPath);
	} catch {
		// Missing secondary shim is already the desired removal state.
	}
}

async function writeManifest(
	home: string,
	manifest: BinManifest,
): Promise<void> {
	const target = binManifestPath(home);
	await mkdir(dirname(target), { recursive: true });
	await writeFile(target, JSON.stringify(manifest, undefined, 2));
}

function hash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}
