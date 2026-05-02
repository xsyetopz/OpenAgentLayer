import type { SourceGraph } from "@openagentlayer/source";
import { validateContracts } from "./contracts";
import { validateDepth } from "./depth";

export { validateGeneratedText } from "./generated";
export { CLAUDE_MODELS, CODEX_MODELS } from "./models";

import { validateModels } from "./models";
import { validateProductName } from "./product";
import { validateReferences } from "./references";

export type { PolicyIssue, PolicyReport } from "./types";

import type { PolicyIssue, PolicyReport } from "./types";

export function validateSourceGraph(graph: SourceGraph): PolicyReport {
	const issues: PolicyIssue[] = [];
	validateProductName(graph.source, issues);
	validateReferences(graph, issues);
	validateDepth(graph.source, issues);
	validateModels(graph.source, issues);
	validateContracts(graph.source, issues);
	return { issues };
}

export function assertPolicyPass(report: PolicyReport): void {
	const errors = report.issues.filter((issue) => issue.severity === "error");
	if (errors.length > 0)
		throw new Error(
			errors.map((issue) => `${issue.code}: ${issue.message}`).join("\n"),
		);
}
