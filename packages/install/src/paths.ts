import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type { Surface } from "@openagentlayer/types";
import type { InstallScope } from "./types";

export function getManifestPath(
	targetRoot: string,
	surface: Surface,
	scope: InstallScope,
): string {
	return join(resolve(targetRoot), relativeManifestPath(surface, scope));
}

export function relativeManifestPath(
	surface: Surface,
	scope: InstallScope,
): string {
	return join(".oal", "manifest", `${surface}-${scope}.json`);
}

export function resolveManagedPath(
	targetRoot: string,
	relativePath: string,
): string {
	if (isAbsolute(relativePath)) {
		throw new Error(`Managed path must be relative: ${relativePath}`);
	}

	const root = resolve(targetRoot);
	const resolvedPath = resolve(root, relativePath);
	const relativeToRoot = relative(root, resolvedPath);
	if (
		relativeToRoot === ".." ||
		relativeToRoot.startsWith(`..${sep}`) ||
		isAbsolute(relativeToRoot)
	) {
		throw new Error(`Managed path escapes target root: ${relativePath}`);
	}
	return resolvedPath;
}
