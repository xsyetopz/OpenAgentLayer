import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { matchPlaceholders } from "../hooks/scripts/_lib.mjs";

describe("codex hook lib", () => {
	it("matches soft hedges in prose lines", () => {
		const { hard, soft } = matchPlaceholders("README.md", [
			"For now this is acceptable.",
		]);
		assert.equal(hard.length, 0);
		assert.equal(soft.length, 1);
	});

	it("does not match soft hedges in code lines unless they are comments", () => {
		const plainCode = matchPlaceholders("src/foo.ts", ["const forNow = true;"]);
		assert.equal(plainCode.soft.length, 0);

		const comment = matchPlaceholders("src/foo.ts", ["// for now: keep it simple"]);
		assert.equal(comment.soft.length, 1);
	});

	it("supports cca-allow suppression", () => {
		const suppressed = matchPlaceholders("src/foo.ts", [
			"// for now: known edge case // cca-allow",
		]);
		assert.equal(suppressed.hard.length, 0);
		assert.equal(suppressed.soft.length, 0);
	});
});

