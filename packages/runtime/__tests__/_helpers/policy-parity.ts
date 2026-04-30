import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createSyntheticHookPayload } from "@openagentlayer/runtime";
import { createFixtureRoot } from "@openagentlayer/testkit";
import type { Surface } from "@openagentlayer/types";
import { writeManagedManifest } from "./runtime";

export interface PolicyFixture {
	readonly id: string;
	readonly surface_mappings: Record<string, unknown>;
	readonly surfaces: readonly Surface[];
}

export async function loadPolicyFixtures(): Promise<readonly PolicyFixture[]> {
	const policies: PolicyFixture[] = [];
	const glob = new Bun.Glob("source/policies/*/policy.toml");
	for await (const path of glob.scan({ cwd: process.cwd() })) {
		const parsed = Bun.TOML.parse(await Bun.file(path).text()) as {
			readonly id?: unknown;
			readonly surface_mappings?: unknown;
			readonly surfaces?: unknown;
		};
		if (
			typeof parsed.id === "string" &&
			Array.isArray(parsed.surfaces) &&
			parsed.surfaces.every(isSurface) &&
			typeof parsed.surface_mappings === "object" &&
			parsed.surface_mappings !== null &&
			!Array.isArray(parsed.surface_mappings)
		) {
			policies.push({
				id: parsed.id,
				surface_mappings: parsed.surface_mappings as Record<string, unknown>,
				surfaces: parsed.surfaces,
			});
		}
	}
	return policies.sort((left, right) => left.id.localeCompare(right.id));
}

export async function createRuntimePayloadForPolicy(
	policy: PolicyFixture,
	surface: Surface,
	event: string,
) {
	switch (policy.id) {
		case "completion-gate":
			return createSyntheticHookPayload({
				event,
				metadata: { validation: "passed" },
				policyId: policy.id,
				surface,
			});
		case "destructive-command-guard":
		case "rtk-enforcement-guard":
			return createSyntheticHookPayload({
				command: "rtk git status --short",
				event,
				policyId: policy.id,
				surface,
			});
		case "source-drift-guard": {
			const root = await createFixtureRoot();
			await writeFile(join(root, "managed.txt"), "clean\n");
			const manifestPath = await writeManagedManifest(root, "clean\n");
			return createSyntheticHookPayload({
				event,
				metadata: { manifest_path: manifestPath, target_root: root },
				policyId: policy.id,
				surface,
			});
		}
		case "permission-escalation-guard":
			return createSyntheticHookPayload({
				event,
				metadata: { justification: "Fixture escalation.", risk: "low" },
				policyId: policy.id,
				surface,
			});
		default:
			return createSyntheticHookPayload({
				event,
				policyId: policy.id,
				surface,
			});
	}
}

function isSurface(value: unknown): value is Surface {
	return value === "claude" || value === "codex" || value === "opencode";
}
