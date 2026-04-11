import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	COPILOT_MODELS,
	getClaudePlan,
	getCodexPlan,
	getCopilotPlan,
	migrateClaudePlan,
	resolveClaudePlan,
	resolveCodexPlan,
} from "../source/subscriptions.mjs";

describe("subscription presets", () => {
	it("rejects legacy Claude CLI aliases and keeps the Codex alias", () => {
		assert.equal(resolveClaudePlan("plus"), "");
		assert.equal(resolveClaudePlan("max5"), "");
		assert.equal(resolveClaudePlan("max20"), "");
		assert.equal(resolveClaudePlan("5x"), "");
		assert.equal(resolveClaudePlan("20x"), "");
		assert.equal(resolveClaudePlan("pro-5"), "");
		assert.equal(resolveClaudePlan("pro-20"), "");
		assert.equal(resolveCodexPlan("pro"), "pro-5");
	});

	it("migrates legacy stored Claude plan values to the canonical ids", () => {
		assert.equal(migrateClaudePlan("plus"), "pro");
		assert.equal(migrateClaudePlan("max5"), "max-5");
		assert.equal(migrateClaudePlan("max20"), "max-20");
		assert.equal(migrateClaudePlan("5x"), "max-5");
		assert.equal(migrateClaudePlan("20x"), "max-20");
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

	it("keeps Claude Pro on Sonnet-only routing", () => {
		const pro = getClaudePlan("pro");
		assert.equal(pro.models.ccaModel, "claude-sonnet-4-6");
		assert.equal(pro.models.opusModel, "claude-sonnet-4-6");
	});

	it("keeps Codex edit turns at medium while plan mode stays tier-shaped", () => {
		for (const planName of ["go", "plus", "pro-5", "pro-20"]) {
			const plan = getCodexPlan(planName);
			assert.equal(plan.profiles.main.modelReasoning, "medium");
			assert.equal(plan.profiles.acceptEdits.modelReasoning, "medium");
			assert.equal(plan.profiles.longrun.modelReasoning, "medium");
		}
		assert.equal(getCodexPlan("go").profiles.main.planReasoning, "high");
		assert.equal(getCodexPlan("plus").profiles.main.planReasoning, "xhigh");
		assert.equal(
			getCodexPlan("pro-5").profiles.acceptEdits.planReasoning,
			"xhigh",
		);
		assert.equal(
			getCodexPlan("pro-20").profiles.longrun.planReasoning,
			"xhigh",
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
