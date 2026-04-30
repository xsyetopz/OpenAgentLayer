export interface TomlValueMap {
	readonly [key: string]:
		| string
		| boolean
		| number
		| readonly string[]
		| TomlValueMap
		| undefined;
}

export function renderTomlDocument(input: TomlValueMap): string {
	return `${renderTomlEntries(input).join("\n")}\n`;
}

function renderTomlEntries(input: TomlValueMap, prefix = ""): string[] {
	const scalars: string[] = [];
	const sections: string[] = [];
	for (const key of Object.keys(input).sort()) {
		const value = input[key];
		if (value === undefined) {
			continue;
		}
		if (isTomlTable(value)) {
			const sectionName = prefix === "" ? key : `${prefix}.${key}`;
			sections.push(
				"",
				`[${sectionName}]`,
				...renderTomlEntries(value, sectionName),
			);
			continue;
		}
		scalars.push(`${key} = ${renderTomlValue(value)}`);
	}
	return [...scalars, ...sections];
}

function renderTomlValue(
	value: string | boolean | number | readonly string[],
): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => JSON.stringify(entry)).join(", ")}]`;
	}
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	return String(value);
}

function isTomlTable(value: unknown): value is TomlValueMap {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
