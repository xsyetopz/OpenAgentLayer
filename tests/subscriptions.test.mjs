import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	COPILOT_MODELS,
	getClaudePlan,
	getCodexPlan,
	getCopilotPlan,
	resolveClaudePlan,
	resolveCodexPlan,
} from "../source/subscriptions.mjs";

describe("subscription presets", () => {
	it("normalizes legacy Claude and Codex aliases", () => {
		assert.equal(resolveClaudePlan("5x"), "pro-5");
		assert.equal(resolveClaudePlan("20x"), "pro-20");
		assert.equal(resolveCodexPlan("pro"), "pro-5");
	});

	it("keeps Spark on Pro-only Codex plans", () => {
		assert.equal(getCodexPlan("go").utility.model, "gpt-5.4-mini");
		assert.equal(getCodexPlan("plus").utility.model, "gpt-5.4-mini");
		assert.equal(getCodexPlan("pro-5").utility.model, "gpt-5.3-codex-spark");
		assert.equal(getCodexPlan("pro-20").utility.model, "gpt-5.3-codex-spark");
	});

	it("uses low verbosity across all managed Codex profiles", () => {
		for (const planName of ["go", "plus", "pro-5", "pro-20"]) {
			const plan = getCodexPlan(planName);
			assert.equal(plan.main.verbosity, "low");
			assert.equal(plan.utility.verbosity, "low");
			assert.equal(plan.implement.verbosity, "low");
		}
	});

	it("maps Claude plus away from Opus by default", () => {
		const plus = getClaudePlan("plus");
		assert.equal(plus.models.ccaModel, "claude-sonnet-4-6");
		assert.equal(plus.models.opusModel, "claude-sonnet-4-6");
	});

	it("uses heavier Copilot defaults on pro-plus", () => {
		const pro = getCopilotPlan("pro");
		const proPlus = getCopilotPlan("pro-plus");
		assert.equal(pro.roleModels.implement, COPILOT_MODELS.gpt52);
		assert.equal(proPlus.roleModels.implement, COPILOT_MODELS.gpt53Codex);
		assert.equal(pro.roleModels.document, COPILOT_MODELS.gpt5Mini);
		assert.equal(proPlus.roleModels.document, COPILOT_MODELS.gpt54Mini);
	});
});
