import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getCodexPlan } from "../source/subscriptions.mjs";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);

function read(relativePath) {
	return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("codex tier matrix wording", () => {
	it("is present in release notes and codex docs", () => {
		const changelog = read("CHANGELOG.md");
		const codexDocs = read("docs/platforms/codex.md");
		const header = /\| Codex plan \| Top-level `openagentsbtw` \|/;
		assert.match(changelog, header);
		assert.match(codexDocs, header);
		for (const plan of ["`go`", "`plus`", "`pro-5`", "`pro-20`"]) {
			const row = new RegExp(`\\|\\s*${plan}\\s*\\|`);
			assert.match(changelog, row);
			assert.match(codexDocs, row);
		}
	});

	it("matches canonical subscription mapping", () => {
		assert.equal(getCodexPlan("go").main.model, "gpt-5.4-mini");
		for (const plan of ["plus", "pro-5", "pro-20"]) {
			const config = getCodexPlan(plan);
			assert.equal(config.main.model, "gpt-5.4");
			assert.equal(config.profiles.main.modelReasoning, "medium");
			assert.equal(config.profiles.main.planReasoning, "high");
			assert.equal(config.implement.model, "gpt-5.3-codex");
			assert.equal(config.approvalAuto.model, "gpt-5.3-codex");
			assert.equal(config.runtimeLong.model, "gpt-5.3-codex");
		}
	});
});
