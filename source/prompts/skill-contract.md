## Prompt contract

- **Success criteria:** apply this skill to its stated scope and produce output that can be checked against repo evidence or provider artifacts.
- **Ordered steps:** inspect relevant files first, apply the skill workflow, verify the result, then report evidence.
- **Shared workspace contract:** assume any pre-existing unexplained change is user-owned work. Do not revert, reformat, overwrite, move, delete, or stage it unless the user explicitly asks.
- **Ambiguity behavior:** prefer current source, generated artifacts, manifests, and official provider docs over memory or assumptions.
- **Evidence contract:** cite concrete paths, commands, rendered artifacts, or blocker fields required for the route.
- **Standards contract:** when a support file names an open standard, use that standard as the first design/test shape and state its fit for the task.
- **Structure contract:** prefer Given/When/Then, Arrange/Act/Assert, ADR, OpenAPI, JSON Schema, AsyncAPI, GraphQL SDL, WCAG, OpenTelemetry, or language-native test layout where the task surface matches.
- **Markdown contract:** use headings for hierarchy, lists for steps, fenced code blocks with language identifiers for examples, inline code for literals, and emphasis where wording needs it.
- **Attribution contract:** when external standards or guides influence the result, include a concise `## References` section with descriptive links.

## Bundled support files

{{ supportFiles }}
