import type { CommandDefinition } from "./types.ts";

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
	{
		name: "openagents-review",
		description: "Perform code review on a file or path",
		agent: "nemesis",
		routeKind: "readonly",
		promptTemplate:
			"Perform a comprehensive code review on the following file or path. Check for correctness, security vulnerabilities, performance issues, and style problems.\n\nTarget:",
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
		name: "openagents-implement",
		description: "Implement a feature from a spec",
		agent: "hephaestus",
		routeKind: "edit-required",
		promptTemplate:
			"Implement the following feature or change according to the specification. Read existing code first and follow project conventions.\n\nSpec:",
	},
	{
		name: "openagents-docs",
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
		name: "openagents-trace",
		description: "Trace a symbol, dependency edge, or data flow",
		agent: "hermes",
		routeKind: "readonly",
		promptTemplate:
			"Trace the following symbol, file, or interface end-to-end. Report upstream callers or dependencies, downstream consumers or effects, and the main impact points.\n\nTarget:",
	},
	{
		name: "openagents-debug",
		description: "Investigate a failure without drifting into implementation",
		agent: "hermes",
		routeKind: "readonly",
		promptTemplate:
			"Debug the following failure or symptom. Reproduce the likely path from available evidence, narrow the root cause, and report the strongest verified or suspected explanation without changing code.\n\nFailure:",
	},
	{
		name: "openagents-plan-feature",
		description: "Break down a feature into tasks",
		agent: "athena",
		routeKind: "readonly",
		promptTemplate:
			"Break down the following feature into concrete implementation tasks. Include dependencies, risks, and complexity assessment.\n\nFeature:",
	},
	{
		name: "openagents-plan-refactor",
		description: "Plan a refactoring with impact analysis",
		agent: "athena",
		routeKind: "readonly",
		promptTemplate:
			"Plan the following refactoring. Analyze impact, identify affected files, and outline a migration path with rollback strategy.\n\nRefactoring:",
	},
	{
		name: "openagents-audit",
		description: "Security audit of a file, module, or API surface",
		agent: "nemesis",
		routeKind: "readonly",
		promptTemplate:
			"Perform a security-focused audit of the following target. Prioritize: authentication gaps, input validation failures, injection vulnerabilities, secret exposure, authorization bypasses, and dependency CVEs. Every finding requires file:line citation and a specific fix. Flag BLOCKING issues that must be resolved before production deployment.\n\nTarget:",
	},
	{
		name: "openagents-ship",
		description: "End-to-end: implement, test, review, document",
		agent: "odysseus",
		routeKind: "edit-required",
		promptTemplate:
			"End-to-end delivery of the following feature or fix:\n1. Read current state and confirm understanding of the specification\n2. Implement using @hephaestus\n3. Run tests using @atalanta — do not proceed if tests fail\n4. Review code using @nemesis — resolve all BLOCKING findings before proceeding\n5. Update documentation using @calliope\n6. Report: files changed, test status, review verdict, and any remaining manual steps\n7. Remind the user to commit manually — auto-commit is forbidden\n\nFeature or fix:",
	},
];
