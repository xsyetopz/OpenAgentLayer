import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	getCodexPlan,
	SUPPORTED_CODEX_MODEL_IDS,
} from "../source/subscriptions.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
	return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("codex tier matrix wording", () => {
	it("is present in codex docs", () => {
		const codexDocs = read("docs/platforms/codex.md");
		const header = /\| Codex plan \| Top-level `openagentsbtw` \|/;
		assert.match(codexDocs, header);
		for (const plan of ["`plus`", "`pro-5`", "`pro-20`"]) {
			const row = new RegExp(`\\|\\s*${plan}\\s*\\|`);
			assert.match(codexDocs, row);
		}
		for (const model of SUPPORTED_CODEX_MODEL_IDS) {
			assert.match(codexDocs, new RegExp(model.replaceAll(".", "\\.")));
		}
	});

	it("matches canonical subscription mapping", () => {
		for (const plan of ["plus", "pro-5", "pro-20"]) {
			const config = getCodexPlan(plan);
			assert.equal(config.main.model, "gpt-5.5");
			assert.equal(config.profiles.main.modelReasoning, "medium");
			assert.equal(config.profiles.main.planReasoning, "high");
			assert.equal(config.review.model, "gpt-5.3-codex");
			assert.equal(config.profiles.review.modelReasoning, "high");
			assert.equal(config.profiles.review.planReasoning, "high");
			assert.equal(config.implement.model, "gpt-5.3-codex");
			assert.equal(config.profiles.implementation.modelReasoning, "medium");
			assert.equal(config.profiles.implementation.planReasoning, "medium");
			assert.equal(config.utility.model, "gpt-5.4-mini");
			assert.equal(config.profiles.utility.modelReasoning, "high");
			assert.equal(config.profiles.utility.planReasoning, "high");
			assert.equal(config.approvalAuto.model, "gpt-5.3-codex");
			assert.equal(config.runtimeLong.model, "gpt-5.3-codex");
		}
	});
});
