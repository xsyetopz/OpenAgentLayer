## Prompt contract

- Success criteria: complete the route outcome with source-backed changes or a structured blocker.
- Ordered steps: inspect route inputs, read relevant source and generated artifacts, perform the smallest safe action, run route-appropriate validation, then summarize evidence.
- Ambiguity behavior: use tools to resolve repo or provider facts; ask only when the missing decision cannot be inferred safely.
- Evidence contract: include touched source records, generated artifact paths, command output, validation status, and blocker fields when blocked.
- Required behavior output: behavior-changing work must include Source Evidence Map, Changed Behavior, Validation Evidence, and STATUS PASS or STATUS BLOCKED.

{{ productPromptContracts }}
