import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepo(relativePath) {
	return readFileSync(path.join(ROOT, relativePath), "utf8");
}

const CONTRAST_REFERENCE_FILES = [
	"source/skills/errors/body.md",
	"source/skills/security/reference/api-attacks.md",
	"source/skills/security/reference/owasp-checklist.md",
	"source/skills/perf/reference/bottleneck-patterns.md",
	"source/skills/review/reference/anti-patterns.md",
	"source/skills/review/reference/refactoring-catalog.md",
	"source/security/reference/api-attacks.md",
	"source/security/reference/owasp-checklist.md",
	"source/perf/reference/bottleneck-patterns.md",
	"source/review/reference/anti-patterns.md",
	"source/review/reference/refactoring-catalog.md",
];

const FORBIDDEN_PATTERNS = [
	/^\s*(?:#|\/\/)\s*(?:Bad|Good|Vulnerable|Fixed|Before|After|Problem|Fix)\b/m,
	/^(?:Bad|Good|Before|After):/m,
	/\|\s*(?:Bad|Good|Vulnerable|Fixed)\s*\|/,
];

describe("canonical contrastive examples", () => {
	it("uses diff fences instead of split bad/good style examples", () => {
		for (const relativePath of CONTRAST_REFERENCE_FILES) {
			const content = readRepo(relativePath);
			assert.match(
				content,
				/```diff/,
				`${relativePath} should contain diff examples`,
			);
			for (const pattern of FORBIDDEN_PATTERNS) {
				assert.doesNotMatch(
					content,
					pattern,
					`${relativePath} should not use legacy paired-example markers`,
				);
			}
		}
	});
});
