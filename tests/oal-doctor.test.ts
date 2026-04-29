import { describe, expect, test } from "bun:test";
import { codexAdapter } from "../packages/oal/src/adapters/codex";
import {
	doctorHooks,
	doctorTools,
	formatDoctorResult,
} from "../packages/oal/src/doctor";
import { loadSource } from "../packages/oal/src/source";
import { mutateJson, withTempRepo } from "./helpers/oal";

describe("oal doctor", () => {
	test("reports required tools by default", () => {
		withTempRepo((root) => {
			const result = doctorTools(root);
			const output = formatDoctorResult(result);
			expect(
				result.checks.some((check) => check.message.startsWith("bun:")),
			).toBe(true);
			expect(
				result.checks.some((check) => check.message.startsWith("rtk:")),
			).toBe(true);
			expect(
				result.checks.some((check) => check.message.startsWith("bat:")),
			).toBe(false);
			expect(output).toContain("tools doctor");
		});
	});

	test("reports optional tools with --all semantics", () => {
		withTempRepo((root) => {
			const result = doctorTools(root, { includeOptional: true });
			expect(
				result.checks.some((check) => check.message.startsWith("bat:")),
			).toBe(true);
		});
	});

	test("reports Codex detect and capabilities", () => {
		withTempRepo((root) => {
			const graph = loadSource(root);
			expect(codexAdapter.detect(root, graph)).toMatchObject({
				binary: "codex",
				platform: "codex",
				project_root: root,
			});
			expect(codexAdapter.capabilities(graph).surfaces).toMatchObject({
				agents: "supported",
				hooks: "supported",
				instructions: "supported",
				mcp: "manual",
				model_routes: "manual",
			});
		});
	});

	test("reports Codex hook mappings without fake parity", () => {
		withTempRepo((root) => {
			const result = doctorHooks("codex", root);
			expect(result.ok).toBe(true);
			expect(result.checks).toContainEqual({
				message: "tool-pre-shell-rtk: codex hook mapping supported",
				ok: true,
				path: "source/hooks/tool-pre-shell-rtk.json",
			});
		});
	});

	test("rejects fake Codex hook events in doctor output", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/hooks/tool-pre-shell-rtk.json", (hook) => {
				(
					(
						(hook["supported_platforms"] as Record<string, unknown>)[
							"codex"
						] as Record<string, unknown>
					)["events"] as string[]
				)[0] = "FakeEvent";
			});
			const result = doctorHooks("codex", root);
			expect(result.ok).toBe(false);
			expect(formatDoctorResult(result)).toContain(
				"unknown hook event FakeEvent",
			);
		});
	});
});
