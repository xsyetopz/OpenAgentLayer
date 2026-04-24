import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import {
	COPILOT_MODELS,
	getClaudePlan,
	getCodexPlan,
	getCopilotPlan,
	resolveClaudePlan,
	resolveCodexPlan,
	SUPPORTED_CLAUDE_MODEL_IDS,
	SUPPORTED_CODEX_MODEL_IDS,
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
		assert.equal(resolveCodexPlan("go"), "");
	});

	it("keeps utility work on the small profile across Codex plans", () => {
		assert.equal(getCodexPlan("plus").utility.model, "gpt-5.4-mini");
		assert.equal(getCodexPlan("pro-5").utility.model, "gpt-5.4-mini");
		assert.equal(getCodexPlan("pro-20").utility.model, "gpt-5.4-mini");
	});

	it("uses reddit-derived model split across Codex plans", () => {
		assert.equal(getCodexPlan("plus").main.model, "gpt-5.5");
		assert.equal(getCodexPlan("pro-5").main.model, "gpt-5.5");
		assert.equal(getCodexPlan("pro-20").main.model, "gpt-5.5");
		assert.equal(getCodexPlan("plus").implement.model, "gpt-5.3-codex");
		assert.equal(getCodexPlan("pro-5").review.model, "gpt-5.3-codex");
		assert.equal(getCodexPlan("pro-5").approvalAuto.model, "gpt-5.3-codex");
		assert.equal(getCodexPlan("pro-20").runtimeLong.model, "gpt-5.3-codex");
		assert.equal(getCodexPlan("plus").utility.model, "gpt-5.4-mini");
	});

	it("keeps every managed Codex route on the supported Codex CLI model set", () => {
		const supported = new Set(SUPPORTED_CODEX_MODEL_IDS);
		for (const planName of ["plus", "pro-5", "pro-20"]) {
			const plan = getCodexPlan(planName);
			for (const route of [
				plan.main,
				plan.utility,
				plan.implement,
				plan.review,
				plan.approvalAuto,
				plan.runtimeLong,
			]) {
				assert.equal(
					supported.has(route.model),
					true,
					`${planName}: ${route.model}`,
				);
			}
			for (const [agentName, [model]] of Object.entries(
				plan.agentAssignments,
			)) {
				assert.equal(
					supported.has(model),
					true,
					`${planName}.${agentName}: ${model}`,
				);
			}
		}
	});

	it("uses low verbosity across all managed Codex profiles", () => {
		for (const planName of ["plus", "pro-5", "pro-20"]) {
			const plan = getCodexPlan(planName);
			assert.equal(plan.main.verbosity, "low");
			assert.equal(plan.utility.verbosity, "low");
			assert.equal(plan.implement.verbosity, "low");
		}
	});

	it("assigns planner/orchestrator to gpt-5.5 and keeps review/implementation specialists on the cheaper split", () => {
		for (const planName of ["plus", "pro-5", "pro-20"]) {
			const plan = getCodexPlan(planName);
			assert.deepEqual(plan.agentAssignments.athena, ["gpt-5.5", "high"]);
			assert.deepEqual(plan.agentAssignments.odysseus, ["gpt-5.5", "high"]);
			assert.deepEqual(plan.agentAssignments.nemesis, [
				"gpt-5.3-codex",
				"high",
			]);
			assert.deepEqual(plan.agentAssignments.hephaestus, [
				"gpt-5.3-codex",
				"medium",
			]);
			assert.deepEqual(plan.agentAssignments.hermes, [
				"gpt-5.4-mini",
				"medium",
			]);
			assert.deepEqual(plan.agentAssignments.atalanta, [
				"gpt-5.4-mini",
				"high",
			]);
			assert.deepEqual(plan.agentAssignments.calliope, [
				"gpt-5.4-mini",
				"high",
			]);
		}
	});

	it("keeps Claude Pro on Sonnet-only routing", () => {
		const pro = getClaudePlan("pro");
		assert.equal(pro.models.ccaModel, "claude-sonnet-4-6");
		assert.equal(pro.models.opusModel, "claude-sonnet-4-6");
	});

	it("keeps managed Claude plans on the supported Claude model set", () => {
		const supported = new Set(SUPPORTED_CLAUDE_MODEL_IDS);
		for (const planName of ["pro", "max-5", "max-20"]) {
			const plan = getClaudePlan(planName);
			for (const model of Object.values(plan.models)) {
				assert.equal(supported.has(model), true, `${planName}: ${model}`);
			}
		}
		assert.equal(getClaudePlan("max-5").models.ccaModel, "claude-opus-4-7");
		assert.equal(getClaudePlan("max-5").models.opusModel, "claude-opus-4-7");
		assert.equal(getClaudePlan("max-20").models.ccaModel, "claude-opus-4-7");
		assert.equal(getClaudePlan("max-20").models.opusModel, "claude-opus-4-7");
	});

	it("uses tier-aware reasoning split across managed Codex profiles", () => {
		for (const planName of ["plus", "pro-5", "pro-20"]) {
			const plan = getCodexPlan(planName);
			assert.equal(plan.profiles.main.modelReasoning, "medium");
			assert.equal(plan.profiles.main.planReasoning, "high");
			assert.equal(plan.profiles.utility.modelReasoning, "high");
			assert.equal(plan.profiles.utility.planReasoning, "high");
			assert.equal(plan.profiles.review.modelReasoning, "high");
			assert.equal(plan.profiles.review.planReasoning, "high");
			assert.equal(plan.profiles.approvalAuto.modelReasoning, "medium");
			assert.equal(plan.profiles.approvalAuto.planReasoning, "medium");
			assert.equal(plan.profiles.runtimeLong.modelReasoning, "medium");
			assert.equal(plan.profiles.runtimeLong.planReasoning, "medium");
			assert.equal(plan.profiles.implementation.modelReasoning, "medium");
			assert.equal(plan.profiles.implementation.planReasoning, "medium");
			assert.equal(plan.profiles.approvalAuto.approvalsReviewer, "auto_review");
			assert.equal(plan.profiles.approvalAuto.approval, "on-request");
		}
	});

	it("uses tier-aware swarm depth and worker runtime across Codex plans", () => {
		assert.equal(getCodexPlan("plus").swarm.maxThreads, 4);
		assert.equal(getCodexPlan("plus").swarm.maxDepth, 1);
		assert.equal(getCodexPlan("plus").swarm.jobMaxRuntimeSeconds, 1800);
		assert.equal(getCodexPlan("pro-5").swarm.maxThreads, 5);
		assert.equal(getCodexPlan("pro-5").swarm.maxDepth, 2);
		assert.equal(getCodexPlan("pro-5").swarm.jobMaxRuntimeSeconds, 2700);
		assert.equal(getCodexPlan("pro-20").swarm.maxThreads, 6);
		assert.equal(getCodexPlan("pro-20").swarm.maxDepth, 2);
		assert.equal(getCodexPlan("pro-20").swarm.jobMaxRuntimeSeconds, 3600);
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
