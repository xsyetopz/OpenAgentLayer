import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
	installSelectionToRtkReferences,
	removeRtkSurfaces,
	renderRtkPolicy,
	rtkCodexDatabasePath,
	rtkConfigPath,
	rtkPolicyPathMap,
	selectedRtkPolicyTargets,
	writeRtkCodexTrackingConfig,
	writeRtkPolicyFiles,
	writeRtkReferences,
} from "../scripts/install/rtk-surfaces.mjs";
import {
	resolvePaths,
	resolveWorkspacePaths,
} from "../scripts/install/shared.mjs";

function tempContext() {
	const root = mkdtempSync(path.join(os.tmpdir(), "oabtw-rtk-surfaces-"));
	const paths = resolvePaths({
		platform: "linux",
		env: { XDG_CONFIG_HOME: path.join(root, ".config") },
		homeDir: root,
	});
	const workspacePaths = resolveWorkspacePaths(
		path.join(root, "repo"),
		"linux",
	);
	return {
		root,
		paths,
		workspacePaths,
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

describe("managed RTK surfaces", () => {
	it("renders one canonical policy body for every platform-local RTK.md", () => {
		assert.match(renderRtkPolicy(), /# RTK - Rust Token Killer/);
		assert.match(renderRtkPolicy(), /rtk --ultra-compact cargo test/);
		assert.match(renderRtkPolicy(), /rtk --ultra-compact test bun test/);
		assert.match(renderRtkPolicy(), /rtk --ultra-compact tsc --noEmit/);
		assert.match(renderRtkPolicy(), /rtk --ultra-compact test npm test/);
		assert.match(renderRtkPolicy(), /rtk --ultra-compact dotnet test/);
		assert.match(renderRtkPolicy(), /rtk --ultra-compact json package\.json/);
		assert.match(
			renderRtkPolicy(),
			/rtk proxy` only when no specialized filter/,
		);
	});

	it("selects generated tooling config locations for RTK.md", () => {
		const { root, paths, cleanup } = tempContext();
		try {
			const targets = selectedRtkPolicyTargets(
				{
					installClaude: true,
					installCodex: true,
					installCopilot: true,
					installOpenCode: true,
				},
				paths,
			);
			const map = rtkPolicyPathMap(paths);
			assert.deepEqual(new Set(targets), new Set(Object.values(map)));
			assert.equal(map.claude, path.join(root, ".claude", "RTK.md"));
			assert.equal(map.codex, path.join(root, ".codex", "RTK.md"));
			assert.equal(map.copilot, path.join(root, ".copilot", "RTK.md"));
			assert.equal(
				map.opencode,
				path.join(root, ".config", "opencode", "RTK.md"),
			);
		} finally {
			cleanup();
		}
	});

	it("writes Claude @RTK.md reference at the managed global instruction surface", async () => {
		const { paths, workspacePaths, cleanup } = tempContext();
		try {
			const targets = selectedRtkPolicyTargets({ installClaude: true }, paths);
			await writeRtkPolicyFiles(targets);
			const references = installSelectionToRtkReferences(
				{ installClaude: true },
				workspacePaths,
				paths,
			);
			await writeRtkReferences(references, paths);
			await writeRtkReferences(references, paths);

			const policy = path.join(paths.claudeHome, "RTK.md");
			const globalInstructions = path.join(paths.claudeHome, "CLAUDE.md");
			assert.equal(existsSync(policy), true);
			const text = readFileSync(globalInstructions, "utf8");
			assert.match(text, /<!-- >>> openagentsbtw rtk >>> -->/);
			assert.equal((text.match(/@RTK\.md/g) || []).length, 1);
			assert.ok(text.trimEnd().endsWith("<!-- <<< openagentsbtw rtk <<< -->"));
		} finally {
			cleanup();
		}
	});

	it("writes and removes managed RTK references without touching user text", async () => {
		const { paths, workspacePaths, cleanup } = tempContext();
		try {
			await mkdir(path.join(paths.codexHome), { recursive: true });
			await writeRtkPolicyFiles(
				selectedRtkPolicyTargets({ installCodex: true }, paths),
			);
			const references = installSelectionToRtkReferences(
				{ installCodex: true },
				workspacePaths,
				paths,
			);
			await writeRtkReferences(references, paths);
			const agents = path.join(paths.codexHome, "AGENTS.md");
			assert.match(readFileSync(agents, "utf8"), /RTK\.md/);
			assert.match(readFileSync(agents, "utf8"), /Always use rtk/);

			await removeRtkSurfaces({
				policyTargets: [rtkPolicyPathMap(paths).codex],
				referenceTargets: references,
			});
			assert.equal(existsSync(path.join(paths.codexHome, "RTK.md")), false);
			assert.doesNotMatch(
				readFileSync(agents, "utf8"),
				/openagentsbtw rtk|RTK\.md/,
			);
		} finally {
			cleanup();
		}
	});
	it("writes RTK tracking DB config into the Codex-writable memory tree", async () => {
		const { root, paths, cleanup } = tempContext();
		try {
			const result = await writeRtkCodexTrackingConfig(paths);
			assert.equal(
				rtkConfigPath({
					platform: "linux",
					env: { XDG_CONFIG_HOME: path.join(root, ".config") },
					homeDir: root,
				}),
				path.join(root, ".config", "rtk", "config.toml"),
			);
			assert.equal(result.databasePath, rtkCodexDatabasePath(paths));
			assert.equal(
				result.databasePath,
				path.join(root, ".codex", "memories", "rtk", "history.db"),
			);
			const config = readFileSync(result.configPath, "utf8");
			assert.match(config, /\[tracking\]/);
			assert.match(config, /database_path = /);
		} finally {
			cleanup();
		}
	});
});
