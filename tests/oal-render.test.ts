import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { explain, render } from "../packages/oal/src/render";
import { repoRoot, withTempRepo } from "./helpers/oal";

describe("oal render", () => {
	test("renders deterministic tree with manifest and explain map", () => {
		const packageJson = JSON.parse(
			readFileSync(resolve(repoRoot, "package.json"), "utf8"),
		) as { scripts: Record<string, string> };
		expect(packageJson.scripts["render"]).toBe(
			"bun packages/oal/src/cli.ts render --out generated",
		);
		expect(packageJson.scripts["generate"]).toBe("bun run render");
		withTempRepo((root) => {
			const first = resolve(root, "first");
			const second = resolve(root, "second");
			render(root, first);
			render(root, second);
			expect(readFileSync(resolve(first, "source-index.json"), "utf8")).toEqual(
				readFileSync(resolve(second, "source-index.json"), "utf8"),
			);
			expect(
				readFileSync(resolve(first, ".oal/render-manifest.json"), "utf8"),
			).toEqual(
				readFileSync(resolve(second, ".oal/render-manifest.json"), "utf8"),
			);
			expect(readFileSync(resolve(first, "codex/AGENTS.md"), "utf8")).toContain(
				"### Athena",
			);
			const projectConfig = readFileSync(
				resolve(first, "codex/.codex/config.toml"),
				"utf8",
			);
			const userConfig = readFileSync(
				resolve(first, "codex/user/config.toml"),
				"utf8",
			);
			const athenaAgent = readFileSync(
				resolve(first, "codex/.codex/agents/athena.toml"),
				"utf8",
			);
			const claudeAthenaAgent = readFileSync(
				resolve(first, "claude/.claude/agents/athena.md"),
				"utf8",
			);
			const claudeSettings = readFileSync(
				resolve(first, "claude/.claude/settings.json"),
				"utf8",
			);
			const oalSkill = readFileSync(
				resolve(first, "codex/.agents/skills/oal/SKILL.md"),
				"utf8",
			);
			const generatedAthena = JSON.parse(
				readFileSync(resolve(first, "agents/athena.json"), "utf8"),
			) as { $schema: string };
			const generatedSkill = JSON.parse(
				readFileSync(resolve(first, "skills/oal.json"), "utf8"),
			) as { $schema: string };
			const generatedHook = JSON.parse(
				readFileSync(resolve(first, "hooks/tool-pre-shell-rtk.json"), "utf8"),
			) as { $schema: string };
			const generatedPlatform = JSON.parse(
				readFileSync(resolve(first, "platforms/codex/platform.json"), "utf8"),
			) as { $schema: string };
			expect(existsSync(resolve(first, "codex/config.toml"))).toBe(false);
			expect(generatedAthena.$schema).toBe(
				"https://raw.githubusercontent.com/xsyetopz/OpenAgentLayer/refs/heads/master/source/schema/agent.schema.json",
			);
			expect(generatedHook.$schema).toBe(
				"https://raw.githubusercontent.com/xsyetopz/OpenAgentLayer/refs/heads/master/source/schema/hook.schema.json",
			);
			expect(generatedPlatform.$schema).toBe(
				"https://raw.githubusercontent.com/xsyetopz/OpenAgentLayer/refs/heads/master/source/schema/platform.schema.json",
			);
			expect(generatedSkill.$schema).toBe(
				"https://raw.githubusercontent.com/xsyetopz/OpenAgentLayer/refs/heads/master/source/schema/skill.schema.json",
			);
			for (const path of listJsonFiles(first)) {
				const content = readFileSync(path, "utf8");
				expect(content).not.toContain('"$schema": "../schema/');
				expect(content).not.toContain('"$schema": "../../schema/');
			}
			expect(projectConfig).toContain("multi_agent_v2 = true");
			expect(projectConfig).toContain("memories = true");
			expect(projectConfig).toContain(
				'model_instructions_file = "model-instructions.md"',
			);
			expect(projectConfig).toContain(
				"model_auto_compact_token_limit = 120000",
			);
			expect(projectConfig).toContain("tool_output_token_limit = 20000");
			expect(projectConfig).toContain("[[hooks.PreToolUse]]");
			expect(projectConfig).toContain('matcher = "^Bash$"');
			expect(projectConfig).toContain(
				'command = "node \\"$(git rev-parse --show-toplevel)/.codex/hooks/tool-pre-shell-rtk.mjs\\""',
			);
			expect(userConfig).toContain('profile = "oal-plus"');
			expect(userConfig).toContain('model_reasoning_effort = "medium"');
			expect(userConfig).toContain('plan_mode_reasoning_effort = "high"');
			expect(userConfig).toContain('consolidation_model = "gpt-5.4-mini"');
			expect(userConfig).toContain("[profiles.oal-plus]");
			expect(userConfig).toContain("[profiles.oal-pro-5]");
			expect(userConfig).toContain("[profiles.oal-pro-20]");
			expect(userConfig).not.toContain("[profiles.plus]");
			expect(userConfig).not.toContain("[profiles.pro-5]");
			expect(userConfig).not.toContain("[profiles.pro-20]");
			expect(
				existsSync(resolve(first, "codex/.codex/model-instructions.md")),
			).toBe(true);
			expect(
				existsSync(resolve(first, "codex/.codex/agents/athena.toml")),
			).toBe(true);
			expect(
				existsSync(resolve(first, "codex/.agents/skills/oal/SKILL.md")),
			).toBe(true);
			expect(existsSync(resolve(first, "claude/CLAUDE.md"))).toBe(true);
			expect(
				existsSync(resolve(first, "claude/.claude/agents/athena.md")),
			).toBe(true);
			expect(existsSync(resolve(first, "claude/.claude/settings.json"))).toBe(
				true,
			);
			expect(
				existsSync(
					resolve(first, "claude/.claude/hooks/tool-pre-shell-rtk.mjs"),
				),
			).toBe(true);
			expect(
				existsSync(resolve(first, "claude/hooks/tool-pre-shell-rtk.json")),
			).toBe(false);
			expect(
				existsSync(resolve(first, "codex/.codex/hooks/tool-pre-shell-rtk.mjs")),
			).toBe(true);
			expect(
				existsSync(resolve(first, "codex/hooks/tool-pre-shell-rtk.json")),
			).toBe(false);
			expect(athenaAgent).toContain('model = "gpt-5.4-mini"');
			expect(athenaAgent).toContain('model_reasoning_effort = "medium"');
			expect(athenaAgent).toContain('developer_instructions = """');
			expect(claudeAthenaAgent).toContain("name: athena");
			expect(claudeAthenaAgent).toContain("model: claude-sonnet-4-6");
			expect(claudeAthenaAgent).toContain("effort: medium");
			expect(claudeSettings).toContain(
				'"$schema": "https://www.schemastore.org/claude-code-settings.json"',
			);
			expect(claudeSettings).toContain('"disableAllHooks": false');
			expect(claudeSettings).toContain('"fastMode": false');
			expect(claudeSettings).toContain('"PreToolUse"');
			expect(claudeSettings).toContain('"matcher": "Bash"');
			expect(claudeSettings).toContain(
				'"command": "node \\"$CLAUDE_PROJECT_DIR/.claude/hooks/tool-pre-shell-rtk.mjs\\""',
			);
			expect(oalSkill).toContain("name: oal");
			expect(oalSkill).toContain("description: Use the OpenAgentLayer");
			expect(existsSync(resolve(first, "codex/agents/athena.json"))).toBe(
				false,
			);
			const managedFiles = JSON.parse(
				readFileSync(resolve(first, ".oal/managed-files.json"), "utf8"),
			) as { files: string[] };
			expect(managedFiles.files).toContain(".oal/render-manifest.json");
			expect(managedFiles.files).toContain(".oal/managed-files.json");
			expect(managedFiles.files).toContain(".oal/explain-map.json");
			expect(managedFiles.files).toContain("codex/.agents/skills/oal/SKILL.md");
			expect(explain(root, `${first}/agents/athena.json`, first)).toEqual({
				sha256: expect.any(String),
				sources: ["source/agents/athena.json"],
			});
			expect(
				explain(root, `${first}/codex/.codex/agents/athena.toml`, first),
			).toEqual({
				sha256: expect.any(String),
				sources: expect.arrayContaining([
					"source/agents/athena.json",
					"source/agents/prompts/athena.md",
					"source/prompts/shared/operating-mode.md",
				]),
			});
			expect(
				explain(root, `${first}/codex/.codex/model-instructions.md`, first),
			).toEqual({
				sha256: expect.any(String),
				sources: expect.arrayContaining([
					"source/workflows/rpers.json",
					"source/prompts/shared/operating-mode.md",
				]),
			});
			expect(
				explain(root, `${first}/codex/.agents/skills/oal/SKILL.md`, first),
			).toEqual({
				sha256: expect.any(String),
				sources: expect.arrayContaining([
					"source/skills/oal.json",
					"source/skills/oal.md",
				]),
			});
		});
	});
});

function listJsonFiles(root: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(root).sort()) {
		const path = join(root, entry);
		if (statSync(path).isDirectory()) {
			files.push(...listJsonFiles(path));
		} else if (path.endsWith(".json")) {
			files.push(relative(root, path).split(sep).join("/"));
		}
	}
	return files.map((path) => resolve(root, path));
}
