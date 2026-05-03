import { readFile } from "node:fs/promises";
import { type Artifact, managedBlockMarker } from "@openagentlayer/artifact";

export async function mergedContent(
	target: string,
	artifact: Artifact,
): Promise<string> {
	if (artifact.mode === "block") return mergeMarkedBlock(target, artifact);
	if (artifact.mode !== "config") return artifact.content;
	try {
		const current = await readFile(target, "utf8");
		if (artifact.path.endsWith(".json") || artifact.path.endsWith(".jsonc"))
			return mergeJsonConfig(current, artifact.content, artifact.path);
		return mergeTomlConfig(current, artifact.content);
	} catch {
		return artifact.content;
	}
}

export async function mergeMarkedBlock(
	target: string,
	artifact: Artifact,
): Promise<string> {
	const marker = managedBlockMarker(artifact);
	let current = "";
	try {
		current = await readFile(target, "utf8");
	} catch {
		current = "";
	}
	const withoutExisting = removeMarkedBlock(current, marker).trimEnd();
	const block = `<!-- >>> ${marker} >>> -->\n${artifact.content.trim()}\n<!-- <<< ${marker} <<< -->`;
	return withoutExisting.length > 0
		? `${withoutExisting}\n\n${block}\n`
		: `${block}\n`;
}

export function removeMarkedBlock(current: string, marker: string): string {
	const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const pattern = new RegExp(
		`\n?<!-- >>> ${escapedMarker} >>> -->[\\s\\S]*?<!-- <<< ${escapedMarker} <<< -->\n?`,
		"g",
	);
	return `${current.replace(pattern, "\n").trimEnd()}\n`;
}

export function removeManagedConfig(
	current: string,
	path: string,
	keys: string[],
): string {
	if (path.endsWith(".toml"))
		return current
			.split("\n")
			.filter((line) => line.trim().startsWith("user_owned"))
			.join("\n");
	const currentObject = JSON.parse(stripJsonComments(current)) as Record<
		string,
		unknown
	>;
	for (const key of keys) delete currentObject[key];
	return JSON.stringify(currentObject, null, 2);
}

function mergeJsonConfig(
	current: string,
	incoming: string,
	path: string,
): string {
	const currentObject = JSON.parse(stripJsonComments(current)) as Record<
		string,
		unknown
	>;
	const incomingObject = JSON.parse(stripJsonComments(incoming)) as Record<
		string,
		unknown
	>;
	const mergedObject = deepMerge(currentObject, incomingObject);
	if (path.endsWith("opencode.jsonc")) delete mergedObject["model_fallbacks"];
	const merged = JSON.stringify(mergedObject, null, 2);
	if (!path.endsWith(".jsonc")) return merged;
	const comments = leadingJsonComments(incoming);
	return comments.length > 0 ? `${comments}\n${merged}` : merged;
}

function deepMerge(
	current: Record<string, unknown>,
	incoming: Record<string, unknown>,
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...current };
	for (const [key, value] of Object.entries(incoming)) {
		const existing = merged[key];
		merged[key] =
			isRecord(existing) && isRecord(value)
				? deepMerge(existing, value)
				: value;
	}
	return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeTomlConfig(current: string, incoming: string): string {
	const userOwnedLines = current
		.split("\n")
		.filter((line) => line.trim().startsWith("user_owned"));
	if (userOwnedLines.length === 0) return incoming;
	return `${userOwnedLines.join("\n")}\n${incoming}`;
}

function stripJsonComments(text: string): string {
	return text
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

function leadingJsonComments(text: string): string {
	const comments: string[] = [];
	for (const line of text.split("\n")) {
		const trimmed = line.trimStart();
		if (trimmed.startsWith("//")) comments.push(line);
		else if (trimmed.length === 0 && comments.length > 0) comments.push(line);
		else break;
	}
	return comments.join("\n").trimEnd();
}
