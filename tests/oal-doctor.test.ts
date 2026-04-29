import { describe, expect, test } from "bun:test";
import { claudeAdapter } from "../packages/oal/src/adapters/claude";
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

	test("reports Claude detect and capabilities", () => {
		withTempRepo((root) => {
			const graph = loadSource(root);
			expect(claudeAdapter.detect(root, graph)).toMatchObject({
				binary: "claude",
				platform: "claude",
				project_root: root,
			});
			expect(claudeAdapter.capabilities(graph).surfaces).toMatchObject({
				agents: "supported",
				commands: "manual",
				hooks: "supported",
				instructions: "supported",
				mcp: "manual",
				model_routes: "manual",
				settings: "supported",
				skills: "manual",
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
			expect(result.checks).toContainEqual({
				message:
					"tool-pre-shell-rtk: codex runtime source/hooks/runtime/tool-pre-shell-rtk.mjs found",
				ok: true,
				path: "source/hooks/tool-pre-shell-rtk.json",
			});
			expect(result.checks).toContainEqual({
				message: "tool-pre-shell-rtk: claude hook mapping supported",
				ok: true,
				path: "source/hooks/tool-pre-shell-rtk.json",
			});
			expect(result.checks).toContainEqual({
				message:
					"tool-pre-shell-rtk: opencode unsupported: Hook payload parity not proven in this wave.",
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

	test("reports Claude hook mappings without OpenCode fake parity", () => {
		withTempRepo((root) => {
			const result = doctorHooks("claude", root);
			expect(result.ok).toBe(true);
			expect(result.checks).toContainEqual({
				message: "tool-pre-shell-rtk: claude hook mapping supported",
				ok: true,
				path: "source/hooks/tool-pre-shell-rtk.json",
			});
			expect(result.checks).toContainEqual({
				message:
					"tool-pre-shell-rtk: claude runtime source/hooks/runtime/tool-pre-shell-rtk.mjs found",
				ok: true,
				path: "source/hooks/tool-pre-shell-rtk.json",
			});
			expect(result.checks).toContainEqual({
				message:
					"tool-pre-shell-rtk: opencode unsupported: Hook payload parity not proven in this wave.",
				ok: true,
				path: "source/hooks/tool-pre-shell-rtk.json",
			});
		});
	});

	test("rejects fake Claude hook events in doctor output", () => {
		withTempRepo((root) => {
			mutateJson(root, "source/hooks/tool-pre-shell-rtk.json", (hook) => {
				(
					(
						(hook["supported_platforms"] as Record<string, unknown>)[
							"claude"
						] as Record<string, unknown>
					)["events"] as string[]
				)[0] = "FakeEvent";
			});
			const result = doctorHooks("claude", root);
			expect(result.ok).toBe(false);
			expect(formatDoctorResult(result)).toContain(
				"unknown hook event FakeEvent",
			);
		});
	});
});
