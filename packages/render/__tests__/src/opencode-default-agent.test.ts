import { describe, expect, test } from "bun:test";
import { createAdapterRegistry } from "@openagentlayer/render/registry";
import { loadSourceGraph } from "@openagentlayer/source";
import {
	createFixtureRoot,
	writeAgent,
	writeModelPlan,
} from "@openagentlayer/testkit";
import { artifactContent } from "../_helpers/registry";

describe("OAL OpenCode default agent rendering", () => {
	test("reports missing OpenCode primary agent", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, {
			primary: false,
			surfaces: '["opencode"]',
		});
		await writeModelPlan(root, {
			assignedRole: "fixture-agent",
			surfaces: '["opencode"]',
		});
		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}

		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"opencode",
		);
		const config = JSON.parse(artifactContent(bundle, "opencode.json") ?? "{}");

		expect(config.default_agent).toBeUndefined();
		expect(bundle.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "missing-opencode-primary-agent",
				level: "error",
			}),
		);
	});

	test("reports multiple OpenCode primary agents", async () => {
		const root = await createFixtureRoot();
		await writeAgent(root, {
			directory: "agents/one",
			id: "fixture-agent-one",
			primary: true,
			surfaces: '["opencode"]',
		});
		await writeAgent(root, {
			directory: "agents/two",
			id: "fixture-agent-two",
			primary: true,
			surfaces: '["opencode"]',
		});
		await writeModelPlan(root, {
			assignedRole: "fixture-agent-one",
			extraAssignments: [
				"[[role_assignments]]",
				'role = "fixture-agent-two"',
				'model = "gpt-5.4"',
				'effort = "medium"',
			].join("\n"),
			surfaces: '["opencode"]',
		});
		const result = await loadSourceGraph(root);
		if (result.graph === undefined) {
			throw new Error("Expected fixture graph.");
		}

		const bundle = createAdapterRegistry().renderSurfaceBundle(
			result.graph,
			"opencode",
		);
		const config = JSON.parse(artifactContent(bundle, "opencode.json") ?? "{}");

		expect(config.default_agent).toBeUndefined();
		expect(bundle.diagnostics).toContainEqual(
			expect.objectContaining({
				code: "multiple-opencode-primary-agents",
				level: "error",
			}),
		);
	});
});
