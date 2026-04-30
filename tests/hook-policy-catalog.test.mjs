import { describe, it } from "bun:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const POLICIES_DIR = path.join(ROOT, "source", "hooks", "policies");

const CATEGORIES = new Set([
	"session_context",
	"input_guard",
	"execution_guard",
	"output_safety",
	"completion_gate",
	"delegation",
	"vcs_gate",
]);

describe("hook policy catalog", () => {
	it("requires a valid category for each policy", () => {
		for (const filename of readdirSync(POLICIES_DIR)) {
			if (!filename.endsWith(".json")) continue;
			const payload = JSON.parse(
				readFileSync(path.join(POLICIES_DIR, filename), "utf8"),
			);
			assert.ok(payload.category, `${filename} missing category`);
			assert.ok(
				CATEGORIES.has(payload.category),
				`${filename} has invalid category: ${payload.category}`,
			);
		}
	});

	it("keeps Copilot fallback events explicit when defined", () => {
		for (const filename of readdirSync(POLICIES_DIR)) {
			if (!filename.endsWith(".json")) continue;
			const payload = JSON.parse(
				readFileSync(path.join(POLICIES_DIR, filename), "utf8"),
			);
			if (!payload.copilot?.fallbackEvents) continue;
			assert.equal(
				Array.isArray(payload.copilot.fallbackEvents),
				true,
				`${filename} fallbackEvents must be an array`,
			);
			assert.ok(
				payload.copilot.fallbackEvents.length > 0,
				`${filename} fallbackEvents must not be empty`,
			);
			for (const event of payload.copilot.fallbackEvents) {
				assert.equal(
					typeof event,
					"string",
					`${filename} fallback event must be string`,
				);
				assert.ok(event.length > 0, `${filename} fallback event is empty`);
			}
		}
	});
});
