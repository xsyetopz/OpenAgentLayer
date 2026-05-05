import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function readRecords<T extends { id: string }>(
	sourceRoot: string,
	directory: string,
	validate: (record: T) => void,
): Promise<T[]> {
	const recordRoot = join(sourceRoot, directory);
	const names = (await readdir(recordRoot))
		.filter((name) => name.endsWith(".json"))
		.sort();
	const records = await Promise.all(
		names.map((name) => readJson<T>(join(recordRoot, name))),
	);
	for (const record of records) validate(record);
	assertUniqueIds(directory, records);
	return records;
}

export async function readJson<T>(path: string): Promise<T> {
	return JSON.parse(await readFile(path, "utf8")) as T;
}

function assertUniqueIds<T extends { id: string }>(
	directory: string,
	records: T[],
): void {
	const seen = new Set<string>();
	for (const record of records) {
		if (seen.has(record.id))
			throw new Error(
				`Duplicate source id in \`${directory}\`: \`${record.id}\``,
			);
		seen.add(record.id);
	}
}
