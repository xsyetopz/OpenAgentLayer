import { describe, expect, test } from "bun:test";
import {
	evaluateDiffStateGate,
	evaluatePlaceholderPrototypeGuard,
	evaluateStaleGeneratedArtifactGuard,
} from "@openagentlayer/runtime";

describe("OAL output and drift guard runtime policies", () => {
	test("placeholder guard denies inspectable placeholder content", () => {
		expect(
			evaluatePlaceholderPrototypeGuard({
				metadata: { content: "TODO: finish" },
			}).decision,
		).toBe("deny");
		expect(
			evaluatePlaceholderPrototypeGuard({ metadata: { content: "done" } })
				.decision,
		).toBe("allow");
	});

	test("diff-state gate warns by default and denies clean-tree routes", () => {
		expect(evaluateDiffStateGate({ metadata: { dirty: true } }).decision).toBe(
			"warn",
		);
		expect(
			evaluateDiffStateGate({
				metadata: { dirty: true, require_clean_tree: true },
			}).decision,
		).toBe("deny");
	});

	test("stale generated artifact guard denies stale paths", () => {
		expect(
			evaluateStaleGeneratedArtifactGuard({
				metadata: { stale_paths: [".codex/config.toml"] },
			}).decision,
		).toBe("deny");
		expect(evaluateStaleGeneratedArtifactGuard({ metadata: {} }).decision).toBe(
			"allow",
		);
	});
});
