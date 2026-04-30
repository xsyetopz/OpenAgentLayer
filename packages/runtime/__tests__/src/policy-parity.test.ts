import { describe, expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	evaluateRuntimePolicy,
	evaluateRuntimePolicyAsync,
	renderRuntimeScript,
} from "@openagentlayer/runtime";
import { createFixtureRoot } from "@openagentlayer/testkit";
import {
	createRuntimePayloadForPolicy,
	loadPolicyFixtures,
} from "../_helpers/policy-parity";
import {
	expectedDecisionForPolicy,
	runRuntimeScript,
	writeManagedManifest,
} from "../_helpers/runtime";

describe("OAL runtime policy parity", () => {
	test("every source policy resolves to a runtime script", async () => {
		for (const policy of await loadPolicyFixtures()) {
			expect(() => renderRuntimeScript(policy.id)).not.toThrow();
			expect(renderRuntimeScript(policy.id)).toContain(
				`const policyId = "${policy.id}"`,
			);
		}
	});

	test("every source policy surface mapping evaluates through runtime router", async () => {
		for (const policy of await loadPolicyFixtures()) {
			for (const surface of policy.surfaces) {
				const event = policy.surface_mappings[surface];
				expect(typeof event).toBe("string");
				const payload = await createRuntimePayloadForPolicy(
					policy,
					surface,
					String(event),
				);
				const decision = await evaluateRuntimePolicyAsync(payload);
				expect(decision.policy_id).toBe(policy.id);
				expect(["allow", "context", "deny", "warn"]).toContain(
					decision.decision,
				);
			}
		}
	});

	test("sync router keeps source-drift guard on async path", () => {
		expect(
			evaluateRuntimePolicy({ policy_id: "source-drift-guard" }).message,
		).toContain("requires async runtime evaluation");
	});

	test("source drift guard evaluates through async router", async () => {
		const root = await createFixtureRoot();
		await writeFile(join(root, "managed.txt"), "clean\n");
		const manifestPath = await writeManagedManifest(root, "clean\n");

		const decision = await evaluateRuntimePolicyAsync({
			metadata: { manifest_path: manifestPath, target_root: root },
			policy_id: "source-drift-guard",
		});

		expect(decision.decision).toBe("allow");
		expect(decision.policy_id).toBe("source-drift-guard");
	});

	test("every generated runtime script emits JSON decision and deny-only nonzero exit", async () => {
		for (const policy of await loadPolicyFixtures()) {
			const result = await runRuntimeScript(policy.id, "");
			const parsed = JSON.parse(result.stdout) as { readonly decision: string };
			const expectedDecision = expectedDecisionForPolicy(policy.id);

			expect(parsed.decision).toBe(expectedDecision);
			expect(result.exitCode === 0).toBe(expectedDecision !== "deny");
		}
	});

	test("every source policy router decision matches rendered runtime script for representative payloads", async () => {
		for (const policy of await loadPolicyFixtures()) {
			for (const surface of policy.surfaces) {
				const event = policy.surface_mappings[surface];
				const payload = await createRuntimePayloadForPolicy(
					policy,
					surface,
					String(event),
				);
				const routerDecision = await evaluateRuntimePolicyAsync(payload);
				const scriptResult = await runRuntimeScript(
					policy.id,
					JSON.stringify(payload),
				);
				const scriptDecision = JSON.parse(scriptResult.stdout) as {
					readonly decision: string;
					readonly policy_id: string;
				};

				expect(scriptDecision).toMatchObject({
					decision: routerDecision.decision,
					policy_id: routerDecision.policy_id,
				});
				expect(scriptResult.exitCode === 0).toBe(
					routerDecision.decision !== "deny",
				);
			}
		}
	});
});
