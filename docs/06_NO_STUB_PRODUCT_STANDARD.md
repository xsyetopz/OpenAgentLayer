# No-Stub Product Standard

This standard applies to the entire OAL product, not only agent prompts.

## Invalid artifact types

### Agents/subagents

Invalid:

- one-paragraph persona cards.
- `Purpose/Triggers/Workflow` fragments with no operating depth.
- decorative Greek-role prose.
- prompts not consumed by generation.
- generated agent TOML that lacks real developer instructions.

Valid:

- source-authored operating contract.
- provider-native generated artifact.
- model route.
- tool/write/sandbox contract.
- route/skill/hook expectations.
- validation/final-output behavior.

### Skills

Invalid:

- title + description only.
- generic “do X” skill cards.
- skill source not rendered to provider skill surfaces.
- support files that are not copied/deployed.

Valid:

- operational procedure.
- examples/references where useful.
- provider-specific metadata only when provider consumes it.
- rendered into Codex/Claude/OpenCode as supported.

### Commands/routes

Invalid:

- two-line descriptors like `Output: Decision and rationale`.
- route names not wired into provider command surfaces.
- missing route kind/permissions/owner/validation contract.

Valid:

- actionable execution contract.
- provider-native command rendering.
- permissions and route kind.
- hook/guard expectations.
- output and validation behavior.

### Hooks

Invalid:

- hook descriptions without executable runtime.
- non-executable generated scripts.
- hooks that rely on source repo paths after deployment.
- same behavior assumed across all providers.

Valid:

- executable `.mjs` runtime.
- fixture coverage.
- provider event mapping.
- standalone runtime packaging.
- explicit unsupported-provider behavior.

### Tools

Invalid:

- tool names in metadata only.
- toy examples.
- generated tool file that is not importable/runnable.
- OpenCode config that mentions a tool but does not wire it.

Valid:

- runnable provider tool integration.
- config/command/agent wiring.
- tests or fixture execution.

### Configs

Invalid:

- placeholder configs.
- unsupported model names.
- provider keys not allowed by provider schema.
- overwriting user-owned config.

Valid:

- provider-native config shape.
- structured merge.
- manifest ownership.
- model allowlist validation.
- preservation of user-owned settings.

### Docs

Invalid:

- speculative architecture as implementation.
- roadmap files used to avoid building code.
- docs that describe behavior not present in code.

Valid:

- docs for behavior that exists.
- install/deploy instructions backed by commands.
- audit docs used as reference, not product completion.

## Universal file rule

Every non-reference file must be one of:

- executed.
- imported.
- rendered.
- deployed.
- uninstalled.
- validated.
- used by runtime hooks.
- generated output.
- documentation of actual behavior.

If it is none of those, it should not exist.
