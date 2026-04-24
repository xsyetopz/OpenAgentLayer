import type { CommandDefinition } from "./types.ts";

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
	{
		name: "openagents-audit",
		description: "Security audit of a file, module, or API surface",
		agent: "nemesis",
		routeKind: "readonly",
		promptTemplate:
			"Perform a security-focused audit of the following target. Prioritize: authentication gaps, input validation failures, injection vulnerabilities, secret exposure, authorization bypasses, and dependency CVEs. Every finding requires file:line citation and a specific fix. Flag BLOCKING issues that must be resolved before production deployment.\n\nTarget:",
	},
	{
		name: "openagents-debug",
		description: "Investigate a failure without drifting into implementation",
		agent: "hermes",
		routeKind: "readonly",
		promptTemplate:
			"Debug the following failure or symptom. Reproduce the likely path from available evidence, narrow the root cause, and report the strongest verified or suspected explanation without changing code. Explicitly separate verified evidence, assumptions, contradictory signals, and the single best next check.\n\nFailure:",
	},
	{
		name: "openagents-document",
		description: "Generate or update documentation",
		agent: "calliope",
		routeKind: "readonly",
		promptTemplate:
			"Generate or update documentation for the following target. Documentation must accurately reflect actual code behavior.\n\nTarget:",
	},
	{
		name: "openagents-explore",
		description: "Map architecture, entrypoints, and ownership of a target",
		agent: "hermes",
		routeKind: "readonly",
		promptTemplate:
			"Explore the following target. Map the entrypoints, major abstractions, neighboring modules, and likely change points. Keep the result evidence-first and scoped to understanding.\n\nTarget:",
	},
	{
		name: "openagents-implement",
		description: "Implement a feature from a spec",
		agent: "hephaestus",
		routeKind: "edit-required",
		promptTemplate:
			"Implement the following feature or change according to the specification. Read existing code first and follow project conventions. If the spec conflicts with repo evidence, stop and name the contradiction before editing. If this is a migration/refactor, remove replaced legacy layers rather than leaving wrapper-only completion unless the spec explicitly requires compatibility.\n\nSpec:",
	},
	{
		name: "openagents-orchestrate",
		description: "Coordinate multi-step delivery across roles",
		agent: "odysseus",
		routeKind: "edit-required",
		promptTemplate:
			"Coordinate the following multi-step task. Keep each delegated action bounded, preserve single-responsibility boundaries, and report exact ownership, verification, and remaining blockers. Name any assumption that affects delegation shape, and stop with BLOCKED if task framing conflicts with repo evidence.\n\nTask:",
	},
	{
		name: "openagents-plan-feature",
		description: "Break down a feature into tasks",
		agent: "athena",
		routeKind: "readonly",
		promptTemplate:
			"Break down the following feature into concrete implementation tasks. Include dependencies, risks, and complexity assessment. Before the recommendation, name the key assumptions, the likeliest failure mode, and what evidence would materially change the plan.\n\nFeature:",
	},
	{
		name: "openagents-plan-refactor",
		description: "Plan a refactoring with impact analysis",
		agent: "athena",
		routeKind: "readonly",
		promptTemplate:
			"Plan the following refactoring. Analyze impact, identify affected files, and outline a migration path with rollback strategy. Before the recommendation, name the key assumptions, the likeliest failure mode, and what evidence would materially change the plan.\n\nRefactoring:",
	},
	{
		name: "openagents-review",
		description: "Perform code review on a file or path",
		agent: "nemesis",
		routeKind: "readonly",
		promptTemplate:
			"Review the following file or path. Check correctness, security, performance, and style. Before the verdict, name the main assumptions, the strongest missing evidence, and what fact would change the conclusion. If the user's premise conflicts with repo evidence, say so directly. Apply a warranted-fix filter; avoid nit padding. For migrations, check whether old layers were actually replaced or only wrapped.\n\nTarget:",
	},
	{
		name: "openagents-test",
		description: "Execute test suite, analyze results",
		agent: "atalanta",
		routeKind: "execution-required",
		promptTemplate:
			"Run the test suite and analyze results. If tests fail, identify the root cause and propose specific fixes.\n\nScope:",
	},
	{
		name: "openagents-trace",
		description: "Trace a symbol, dependency edge, or data flow",
		agent: "hermes",
		routeKind: "readonly",
		promptTemplate:
			"Trace the following symbol, file, or interface end-to-end. Report upstream callers or dependencies, downstream consumers or effects, and the main impact points.\n\nTarget:",
	},
];
