import { readJson } from "./json.mjs";
import { repoPath } from "./paths.mjs";

export async function loadAdapters() {
	return await readJson(repoPath("source/harness/adapters.json"));
}

export async function getAdapter(id) {
	const adapters = await loadAdapters();
	return adapters.find((adapter) => adapter.id === id);
}
