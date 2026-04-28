import { readFile } from "node:fs/promises";

export async function readJson(path) {
	return JSON.parse(await readFile(path, "utf8"));
}
