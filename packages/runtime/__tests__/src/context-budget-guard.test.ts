import { describe, expect, test } from "bun:test";
import { evaluateContextBudgetGuard } from "@openagentlayer/runtime";

describe("OAL context budget guard runtime policy", () => {
	test("emits context guidance for compaction and low budget", () => {
		expect(evaluateContextBudgetGuard({ event: "PreCompact" }).decision).toBe(
			"context",
		);
		expect(
			evaluateContextBudgetGuard({
				metadata: { remaining_context_tokens: 1000 },
			}).context?.["prompt_append"],
		).toContain("preserve OAL route");
	});

	test("allows sufficient context", () => {
		expect(
			evaluateContextBudgetGuard({
				metadata: { remaining_context_tokens: 8000 },
			}).decision,
		).toBe("allow");
	});
});
