import { readJson } from "./json.mjs";
import { repoPath } from "./paths.mjs";

export async function loadModelPolicy() {
	return await readJson(repoPath("source/harness/model-policy.json"));
}

export function assertModelPolicy(policy) {
	const forbidden = policy.codex.forbiddenModelPatterns;
	const models = [
		...policy.codex.allowedModels,
		...Object.values(policy.codex.routes),
	];
	const forbiddenHits = models.filter((model) =>
		forbidden.some((pattern) =>
			model.toLowerCase().includes(pattern.toLowerCase()),
		),
	);
	if (forbiddenHits.length > 0) {
		throw new Error(`forbidden Codex model route: ${forbiddenHits.join(", ")}`);
	}
	if (policy.codex.routes.utility !== "gpt-5.4-mini") {
		throw new Error(
			`Codex utility route must be gpt-5.4-mini, got ${policy.codex.routes.utility}`,
		);
	}
	for (const model of policy.opencode.zenFallbackModels) {
		if (!model.startsWith("opencode/")) {
			throw new Error(`OpenCode fallback must use opencode/ prefix: ${model}`);
		}
	}
	return true;
}
