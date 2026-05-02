import { FORBIDDEN_CLAUDE, FORBIDDEN_CODEX } from "./models";
import type { PolicyIssue } from "./types";

export function validateGeneratedText(
	artifactPath: string,
	content: string,
): PolicyIssue[] {
	const issues: PolicyIssue[] = [];
	for (const model of [...FORBIDDEN_CODEX, ...FORBIDDEN_CLAUDE]) {
		const escapedModel = model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const modelPattern = new RegExp(
			`(^|[^A-Za-z0-9_.-])${escapedModel}([^A-Za-z0-9_.-]|$)`,
		);
		if (modelPattern.test(content))
			issues.push({
				severity: "error",
				code: "forbidden-model",
				message: `${artifactPath} contains forbidden model: ${model}`,
			});
	}
	return issues;
}
