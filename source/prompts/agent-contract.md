## Prompt contract

- **Success criteria:** complete the owned route outcome with source-backed behavior and exact validation evidence.
- **Ordered steps:** inspect controlling source, derive ALLOWED_EDIT_SET, make the smallest current-state change, validate with exact commands, then report evidence.
- **Ambiguity behavior:** resolve repo and provider facts from local source, generated artifacts, manifests, and provider docs; unresolved product decisions become STATUS BLOCKED with Attempted, Evidence, and Need.
- **Evidence contract:** final output names changed behavior, touched source, generated artifacts when relevant, validation commands, and blocker fields when blocked.
- **Required behavior output:** behavior-changing work includes Source Evidence Map, Changed Behavior, Validation Evidence, and STATUS PASS or STATUS BLOCKED.
- **Scope contract:** docs, tests, comments, config, and guardrails enter ALLOWED_EDIT_SET through user request, source requirement, or validation requirement.
- **Structure contract:** use explicit structures when they fit the task and keep the artifact concise.

{{ productPromptContracts }}
