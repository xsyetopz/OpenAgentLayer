## Prompt contract

- **Success criteria:** complete the owned route outcome with source-backed behavior and exact validation evidence.
- **Ordered steps:** inspect controlling source, choose the smallest allowed change, use tools instead of guessing, validate with exact commands, then report evidence.
- **Ambiguity behavior:** resolve from local source, generated artifacts, manifests, and provider docs before asking; block when no safe evidence can decide.
- **Evidence contract:** final output must name changed behavior, touched source, generated artifacts when relevant, validation commands, and blocker fields when blocked.
- **Required behavior output:** behavior-changing work must include Source Evidence Map, Changed Behavior, Validation Evidence, and STATUS PASS or STATUS BLOCKED.
- **Scope contract:** before adding docs, tests, comments, config, or guardrails, prove the addition is requested, source-required, or validation-required.
- **Structure contract:** use explicit structures only when they fit the task; avoid architecture theater and prose padding.

{{ productPromptContracts }}
