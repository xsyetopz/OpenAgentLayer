import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAdapters } from "../packages/core/src/adapters.mjs";
import {
	assertModelPolicy,
	loadModelPolicy,
} from "../packages/core/src/model-policy.mjs";
import { loadProduct } from "../packages/core/src/product.mjs";
import {
	planInstall,
	planUninstall,
} from "../packages/installer/src/index.mjs";
import { renderArtifacts } from "../packages/renderers/src/index.mjs";
import {
	runChecks,
	summarizeResults,
} from "../packages/validation/src/checks.mjs";

const managedMarkerPattern = /BEGIN MANAGED BY OpenAgentLayer/;
const utilityModelPattern = /gpt-5\.4-mini/;

test("product identity is OpenAgentLayer", async () => {
	const product = await loadProduct();
	assert.equal(product.name, "OpenAgentLayer");
	assert.equal(product.cli, "oal");
	assert.equal(product.runner, "oal-runner");
});

test("adapter registry covers roadmap platforms", async () => {
	const adapters = await loadAdapters();
	assert.equal(adapters.length, 10);
	assert.ok(adapters.some((adapter) => adapter.id === "codex-cli"));
	assert.ok(adapters.some((adapter) => adapter.id === "kilo-code-v5"));
});

test("model policy rejects forbidden routing", async () => {
	const policy = await loadModelPolicy();
	assert.equal(assertModelPolicy(policy), true);
	assert.equal(policy.codex.routes.utility, "gpt-5.4-mini");
	assert.equal(
		JSON.stringify(policy.codex.routes).toLowerCase().includes("spark"),
		false,
	);
	assert.equal(
		JSON.stringify(policy.codex.allowedModels).toLowerCase().includes("spark"),
		false,
	);
});

test("renderer emits managed dry-run artifacts", async () => {
	const artifacts = await renderArtifacts("codex-cli");
	assert.equal(artifacts.length, 1);
	assert.equal(artifacts[0].platformId, "codex-cli");
	assert.match(artifacts[0].contents, managedMarkerPattern);
	assert.match(artifacts[0].contents, utilityModelPattern);
});

test("installer and uninstaller plan dry-run by default", async () => {
	const install = await planInstall({ platform: "opencode" });
	const uninstall = planUninstall({ all: true });
	assert.equal(install.dryRun, true);
	assert.equal(uninstall.dryRun, true);
	assert.equal(uninstall.removeKnownV3Residue, true);
});

test("all checks pass", async () => {
	const results = await runChecks("all");
	const summary = summarizeResults(results);
	assert.deepEqual(summary.failures, []);
	assert.equal(summary.ok, true);
});
