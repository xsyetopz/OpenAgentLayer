export function stableJson(input: unknown): string {
	return JSON.stringify(sortJson(input), null, 2);
}

export function renderJsonFile(input: unknown): string {
	return `${stableJson(input)}\n`;
}

function sortJson(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(sortJson);
	}

	if (typeof input !== "object" || input === null) {
		return input;
	}

	const source = input as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(source).sort()) {
		sorted[key] = sortJson(source[key]);
	}
	return sorted;
}
