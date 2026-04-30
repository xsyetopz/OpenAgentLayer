import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import {
	COPILOT_MODELS,
	getClaudePlan,
	getCodexPlan,
	getCopilotPlan,
	resolveClaudePlan,
	resolveCodexPlan,
} from "../source/subscriptions.mjs";

describe("subscription presets", () => {
	it("accepts only current plan ids", () => {
		assert.equal(resolveClaudePlan("plus"), "");
		assert.equal(resolveClaudePlan("max5"), "");
		assert.equal(resolveClaudePlan("max20"), "");
		assert.equal(resolveClaudePlan("5x"), "");
		assert.equal(resolveClaudePlan("20x"), "");
		assert.equal(resolveClaudePlan("pro-5"), "");
		assert.equal(resolveClaudePlan("pro-20"), "");
		assert.equal(resolveCodexPlan("pro"), "");
	});

	it("keeps utility work on the small profile across Codex plans", () => {
		assert.equal(getCodexPlan("go").utility.model, "gpt-5.5-mini");
		assert.equal(getCodexPlan("plus").utility.model, "gpt-5.5-mini");
		assert.equal(getCodexPlan("pro-5").utility.model, "gpt-5.5-mini");
		assert.equal(getCodexPlan("pro-20").utility.model, "gpt-5.5-mini");
	});

	it("uses gpt-5.5 as top-level default only on eligible plans", () => {
		assert.equal(getCodexPlan("go").main.model, "gpt-5.5-mini");
		assert.equal(getCodexPlan("plus").main.model, "gpt-5.5");
		assert.equal(getCodexPlan("pro-5").main.model, "gpt-5.5");
		assert.equal(getCodexPlan("pro-20").main.model, "gpt-5.5");
		assert.equal(getCodexPlan("plus").implement.model, "gpt-5.3-codex");
		assert.equal(getCodexPlan("pro-5").approvalAuto.model, "gpt-5.3-codex");
		assert.equal(getCodexPlan("pro-20").runtimeLong.model, "gpt-5.3-codex");
	});

	it("uses low verbosity across all managed Codex profiles", () => {
		for (const planName of ["go", "plus", "pro-5", "pro-20"]) {
			const plan = getCodexPlan(planName);
			assert.equal(plan.main.verbosity, "low");
			assert.equal(plan.utility.verbosity, "low");
			assert.equal(plan.implement.verbosity, "low");
		}
	});

	it("keeps Claude Pro on Sonnet-only routing", () => {
		const pro = getClaudePlan("pro");
		assert.equal(pro.models.ccaModel, "claude-sonnet-4-6");
		assert.equal(pro.models.opusModel, "claude-sonnet-4-6");
	});

	it("keeps Codex edit turns at medium and normalizes gpt-5.5 top-level plan effort", () => {
		for (const planName of ["go", "plus", "pro-5", "pro-20"]) {
			const plan = getCodexPlan(planName);
			assert.equal(plan.profiles.main.modelReasoning, "medium");
			assert.equal(plan.profiles.approvalAuto.modelReasoning, "medium");
			assert.equal(plan.profiles.runtimeLong.modelReasoning, "medium");
		}
		assert.equal(getCodexPlan("go").profiles.main.planReasoning, "high");
		assert.equal(getCodexPlan("plus").profiles.main.planReasoning, "high");
		assert.equal(
			getCodexPlan("pro-5").profiles.approvalAuto.planReasoning,
			"high",
		);
		assert.equal(
			getCodexPlan("pro-20").profiles.runtimeLong.planReasoning,
			"high",
		);
	});

	it("uses heavier Copilot defaults on Pro+", () => {
		const pro = getCopilotPlan("pro");
		const proPlus = getCopilotPlan("pro-plus");
		assert.equal(pro.roleModels.implement, COPILOT_MODELS.gpt52);
		assert.equal(proPlus.roleModels.implement, COPILOT_MODELS.gpt53Codex);
		assert.equal(pro.roleModels.document, COPILOT_MODELS.gpt5Mini);
		assert.equal(proPlus.roleModels.document, COPILOT_MODELS.gpt54Mini);
	});
});
