## Prompt contract

- **Success criteria:** complete the route outcome with source-backed changes or a structured blocker.
- **Ordered steps:** inspect route inputs, read relevant source and generated artifacts, derive ALLOWED_EDIT_SET, perform the smallest current-state action, run route-appropriate validation, then summarize evidence.
- **Ambiguity behavior:** use tools to resolve repo or provider facts; unresolved product decisions become STATUS BLOCKED with Attempted, Evidence, and Need.
- **Evidence contract:** include touched source records, generated artifact paths, command output, validation status, and blocker fields when blocked.
- **Required behavior output:** behavior-changing work includes Source Evidence Map, Changed Behavior, Validation Evidence, and STATUS PASS or STATUS BLOCKED.
- **Standards contract:** choose the relevant open standard or language-native convention before defining a schema, API shape, test layout, accessibility rule, telemetry shape, or error contract.
- **Structure contract:** use Given/When/Then, Arrange/Act/Assert, ADR, OpenAPI operation, JSON Schema, AsyncAPI operation, GraphQL SDL, WCAG check, or OpenTelemetry signal when the route surface fits.
- **Markdown contract:** use headings for hierarchy, ordered lists for ordered work, bullets for unordered constraints, fenced code blocks with language identifiers, inline code for literals, and meaningful emphasis.
- **Attribution contract:** include concise references when external standards, provider docs, or style guides define the route output.

{{ productPromptContracts }}
