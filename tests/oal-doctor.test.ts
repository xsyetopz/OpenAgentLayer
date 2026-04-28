import { describe, expect, test } from "bun:test";
import { codexAdapter } from "../packages/oal/src/adapters/codex";
import {
	doctorHooks,
	doctorTools,
	formatDoctorResult,
} from "../packages/oal/src/doctor";
import { loadSource } from "../packages/oal/src/source";
import { withTempRepo } from "./helpers/oal";

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
});
