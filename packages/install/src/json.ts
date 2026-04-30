export function stableJson(input: unknown): string {
	return JSON.stringify(sortJson(input), null, 2);
}

export function sortJson(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(sortJson);
	}
	if (typeof input !== "object" || input === null) {
		return input;
	}
	const record = input as Record<string, unknown>;
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(record).sort()) {
		sorted[key] = sortJson(record[key]);
	}
	return sorted;
}

export function jsonEqual(left: unknown, right: unknown): boolean {
	return JSON.stringify(sortJson(left)) === JSON.stringify(sortJson(right));
}

export async function sha256(content: string): Promise<string> {
	const bytes = new TextEncoder().encode(content);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
