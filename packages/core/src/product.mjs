import { readJson } from "./json.mjs";
import { repoPath } from "./paths.mjs";

export async function loadProduct() {
	return await readJson(repoPath("source/harness/product.json"));
}
