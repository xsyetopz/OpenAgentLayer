import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { loadCatalogItems } from "../source/catalog/items.mjs";

describe("catalog items", () => {
	it("loads normalized item records for generation APIs", async () => {
		const items = await loadCatalogItems();
		assert.ok(items.length > 0);
		for (const entry of items) {
			assert.ok(typeof entry.kind === "string" && entry.kind.length > 0);
			assert.ok(typeof entry.id === "string" && entry.id.length > 0);
			assert.ok(entry.item && typeof entry.item === "object");
		}
	});
});
