import type { CommandDefinition } from "./types.ts";

export const COMMAND_DEFINITIONS: CommandDefinition[] = [
  {
    name: "openagents-review",
    description: "Perform code review on a file or path",
    agent: "nemesis",
    promptTemplate: "Perform a comprehensive code review on the following file or path. Check for correctness, security vulnerabilities, performance issues, and style problems.\n\nTarget:",
  },
  {
    name: "openagents-test",
    description: "Execute test suite, analyze results",
    agent: "atalanta",
    promptTemplate: "Run the test suite and analyze results. If tests fail, identify the root cause and propose specific fixes.\n\nScope:",
  },
  {
    name: "openagents-implement",
    description: "Implement a feature from a spec",
    agent: "hephaestus",
    promptTemplate: "Implement the following feature or change according to the specification. Read existing code first and follow project conventions.\n\nSpec:",
  },
  {
    name: "openagents-docs",
    description: "Generate or update documentation",
    agent: "calliope",
    promptTemplate: "Generate or update documentation for the following target. Documentation must accurately reflect actual code behavior.\n\nTarget:",
  },
  {
    name: "openagents-deps",
    description: "Analyze dependencies of a module",
    agent: "hermes",
    promptTemplate: "Analyze the dependencies of the following module. Report direct imports, consumers, and any circular dependencies.\n\nModule:",
  },
  {
    name: "openagents-explain",
    description: "Explain architecture or code structure",
    agent: "hermes",
    promptTemplate: "Explain the architecture and code structure of the following target. Describe how it works, key abstractions, and data flow.\n\nTarget:",
  },
  {
    name: "openagents-plan-feature",
    description: "Break down a feature into tasks",
    agent: "athena",
    promptTemplate: "Break down the following feature into concrete implementation tasks. Include dependencies, risks, and complexity assessment.\n\nFeature:",
  },
  {
    name: "openagents-plan-refactor",
    description: "Plan a refactoring with impact analysis",
    agent: "athena",
    promptTemplate: "Plan the following refactoring. Analyze impact, identify affected files, and outline a migration path with rollback strategy.\n\nRefactoring:",
  },
  {
    name: "openagents-audit",
    description: "Security audit of a file, module, or API surface",
    agent: "nemesis",
    promptTemplate: "Perform a security-focused audit of the following target. Prioritize: authentication gaps, input validation failures, injection vulnerabilities, secret exposure, authorization bypasses, and dependency CVEs. Every finding requires file:line citation and a specific fix. Flag BLOCKING issues that must be resolved before production deployment.\n\nTarget:",
  },
  {
    name: "openagents-ship",
    description: "End-to-end: implement, test, review, document",
    agent: "odysseus",
    promptTemplate: "End-to-end delivery of the following feature or fix:\n1. Read current state and confirm understanding of the specification\n2. Implement using @hephaestus\n3. Run tests using @atalanta — do not proceed if tests fail\n4. Review code using @nemesis — resolve all BLOCKING findings before proceeding\n5. Update documentation using @calliope\n6. Report: files changed, test status, review verdict, and any remaining manual steps\n7. Remind the user to commit manually — auto-commit is forbidden\n\nFeature or fix:",
  },
];
