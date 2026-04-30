import { jsonEqual, stableJson } from "./json";

export { jsonEqual };

export function parseStructuredContent(
	path: string,
	content: string,
): Record<string, unknown> {
	if (path.endsWith(".json")) {
		return JSON.parse(content) as Record<string, unknown>;
	}
	if (path.endsWith(".toml")) {
		return Bun.TOML.parse(content) as Record<string, unknown>;
	}
	throw new Error(`Unsupported structured config format: ${path}`);
}

export function renderStructuredContent(
	path: string,
	content: Record<string, unknown>,
): string {
	if (path.endsWith(".json")) {
		return `${stableJson(content)}\n`;
	}
	if (path.endsWith(".toml")) {
		return `${renderTomlEntries(content).join("\n")}\n`;
	}
	throw new Error(`Unsupported structured config format: ${path}`);
}

export function flattenManagedValues(input: unknown): Record<string, unknown> {
	const values: Record<string, unknown> = {};
	flattenValue(input, [], values);
	return values;
}

function flattenValue(
	value: unknown,
	path: readonly string[],
	output: Record<string, unknown>,
): void {
	if (Array.isArray(value) || typeof value !== "object" || value === null) {
		if (path.length > 0) {
			output[path.join(".")] = value;
		}
		return;
	}
	for (const [key, child] of Object.entries(value)) {
		flattenValue(child, [...path, key], output);
	}
}

export function getPathValue(
	input: Record<string, unknown>,
	path: string,
): unknown {
	let current: unknown = input;
	for (const part of path.split(".")) {
		if (typeof current !== "object" || current === null) {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

export function setPathValue(
	input: Record<string, unknown>,
	path: string,
	value: unknown,
): void {
	const parts = path.split(".");
	let current = input;
	for (const part of parts.slice(0, -1)) {
		const child = current[part];
		if (typeof child !== "object" || child === null || Array.isArray(child)) {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	current[parts[parts.length - 1] ?? path] = value;
}

export function deletePathValue(
	input: Record<string, unknown>,
	path: string,
): void {
	const parts = path.split(".");
	deletePathValueParts(input, parts);
}

function deletePathValueParts(
	input: Record<string, unknown>,
	parts: readonly string[],
): boolean {
	const [head, ...tail] = parts;
	if (head === undefined) {
		return Object.keys(input).length === 0;
	}
	if (tail.length === 0) {
		delete input[head];
		return Object.keys(input).length === 0;
	}
	const child = input[head];
	if (typeof child !== "object" || child === null || Array.isArray(child)) {
		return Object.keys(input).length === 0;
	}
	if (deletePathValueParts(child as Record<string, unknown>, tail)) {
		delete input[head];
	}
	return Object.keys(input).length === 0;
}

function renderTomlEntries(
	input: Record<string, unknown>,
	prefix = "",
): string[] {
	const scalars: string[] = [];
	const sections: string[] = [];
	for (const key of Object.keys(input).sort()) {
		const value = input[key];
		const sectionName = prefix === "" ? key : `${prefix}.${key}`;
		if (isTomlArrayOfTables(value)) {
			for (const item of value) {
				sections.push(
					"",
					`[[${sectionName}]]`,
					...renderTomlEntries(item, sectionName),
				);
			}
			continue;
		}
		if (isTomlTable(value)) {
			const childEntries = renderTomlEntries(
				value as Record<string, unknown>,
				sectionName,
			);
			if (childEntries.length > 0) {
				sections.push("", `[${sectionName}]`, ...childEntries);
			}
			continue;
		}
		scalars.push(`${key} = ${renderTomlValue(value)}`);
	}
	return [...scalars, ...sections];
}

function renderTomlValue(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => renderTomlValue(entry)).join(", ")}]`;
	}
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
}

function isTomlTable(value: unknown): boolean {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTomlArrayOfTables(
	value: unknown,
): value is readonly Record<string, unknown>[] {
	return (
		Array.isArray(value) &&
		value.length > 0 &&
		value.every((entry) => isTomlTable(entry))
	);
}
