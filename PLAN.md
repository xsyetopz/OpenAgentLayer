# OpenAgentLayer v4 Plan

## Summary

OpenAgentLayer v4 is a clean rebuild of the agent-surface compiler. It compiles
authored OAL source records into provider-native Codex, Claude Code, and
OpenCode artifacts, then deploys those artifacts safely with manifests, conflict
handling, rollback, and undeploy.

This is not a v3 migration. `v3_legacy/` is reference-only and must not be read
as source, migration input, or deploy input.

## Architecture

Package names must be short, boring, and self-documenting. Each package owns one
product concept and one primary reason to change.

```text
packages/graph
packages/routes
packages/models
packages/render
packages/deploy
packages/cli
```

### `packages/graph`

Owns authored OAL source records becoming a checked source graph.

Changes when source record shape, graph assembly, provenance, graph references,
or graph-level invariants change.

Does not change when provider artifact formats, model budget rules, deploy
behavior, or CLI syntax change.

### `packages/routes`

Owns route contracts, permission compatibility, and completion semantics.

Changes when route contract meaning changes, permission policy changes, or route
completion requirements change.

Does not change when source files move, provider output changes, or deploy
mechanics change.

### `packages/models`

Owns model plans, model/effort/verbosity resolution, budget posture, and
escalation guards.

Changes when subscription plans, effort policies, model IDs, budget states, or
escalation rules change.

Does not change when prompt prose, provider file paths, or deploy behavior
changes.

### `packages/render`

Owns generated provider artifacts.

Contains provider modules internally:

```text
packages/render/src/codex.ts
packages/render/src/claude.ts
packages/render/src/opencode.ts
```

Changes when Codex, Claude Code, or OpenCode artifact shapes, schema checks,
generated file layout, or provider-specific rendering rules change.

Does not change when deploy apply/rollback changes or model plans change beyond
the resolved input contract.

### `packages/deploy`

Owns safe placement and removal of rendered artifacts.

Changes when manifest format, conflict policy, marked block handling, structured
merge behavior, apply, rollback, or undeploy changes.

Does not change when route contracts, model plans, or provider rendering
internals change.

### `packages/cli`

Owns CLI parsing, terminal output, command dispatch, and process exit codes.

Changes when user-facing command syntax or output conventions change.

Does not contain compiler, renderer, model, route, or deploy business logic.

## Internal File Rules

- `index.ts` is export-only.
- CLI entrypoints stay thin and dispatch to command handlers.
- Files may be up to 1000 LOC, but size is not the goal.
- Split files by responsibility, cognitive load, and testability.
- Do not split into tiny helper files just to appear modular.
- Do not allow unrelated behavior to accumulate in one file just because it is
  under 1000 LOC.
- A file approaching 1000 LOC needs a clear reason to remain whole.

Suggested starting shape:

```text
packages/graph/src/
  index.ts
  graph.ts
  checks.ts

packages/routes/src/
  index.ts
  contracts.ts

packages/models/src/
  index.ts
  models.ts

packages/render/src/
  index.ts
  artifacts.ts
  codex.ts
  claude.ts
  opencode.ts

packages/deploy/src/
  index.ts
  deploy.ts
  manifest.ts
  blocks.ts
  merge.ts

packages/cli/src/
  main.ts
  args.ts
  commands.ts
  output.ts
```

## Source Graph

Use authored source records under `source/` as the only source of truth.

```text
source/
  agents/
  skills/
  routes/
  commands/
  policies/
  model-plans/
  surfaces/
  integrations/
  prompt-layers/
  schemas/
```

Source records may reference Markdown prompt/skill bodies, but prompt prose is
product content, not test oracle text.

Greek-god agent IDs remain part of the product.

Prompts may use explicit roleplay framing such as "You are Athena...", but this
is authoring guidance, not something tests should assert through prose matching.

## Stub Policy

Meaningful WIP stubs are allowed only for stable public command positions.

A WIP command must:

- parse its intended flags where practical;
- exit nonzero;
- print `not implemented yet: <phase and capability>`;
- include a specific `MARK:` comment naming the phase and capability.

Stubs must not create placeholder packages, placeholder source records, fake
renderers, fake generated files, or success-looking no-ops.

## Build Phases

### Phase 1 - Graph, Routes, Models, CLI Check

- Create `graph`, `routes`, `models`, and `cli`.
- Add real source record schemas and loaders.
- Assemble the source graph from authored source records.
- Enforce graph references and route/permission/model invariants.
- Implement `oal check`.
- Add WIP CLI stubs only for agreed future commands.

### Phase 2 - Codex Render

- Create `render`.
- Implement Codex artifact rendering inside `render/src/codex.ts`.
- Render `.codex/config.toml`, Codex agents, commands, skills, policy
  references, and managed `AGENTS.md` blocks.
- Validate Codex artifacts against pinned schema or explicit allowlist.
- Implement `oal render --surface codex`.

### Phase 3 - Deploy Lifecycle

- Create `deploy`.
- Implement dry-run planning, apply, manifest writing, conflict detection,
  rollback, and undeploy.
- Support full-file ownership, marked text blocks, and structured merges.
- Implement `oal deploy --surface codex --scope project --dry-run`.
- Implement `oal deploy --surface codex --scope project`.
- Implement `oal undeploy --surface codex --scope project`.

### Phase 4 - Claude Code Render

- Add Claude Code rendering inside `render/src/claude.ts`.
- Render `.claude/settings.json`, agents, skills, hooks, and managed
  `CLAUDE.md`.
- Validate settings keys, hook events, permissions, and generated artifacts.
- Enable Claude render and deploy only when the renderer is complete.

### Phase 5 - OpenCode Render

- Add OpenCode rendering inside `render/src/opencode.ts`.
- Render `opencode.json`, agents, commands, skills, permissions, plugins, and
  valid `default_agent`.
- Validate provider/model IDs, command references, permissions, and
  primary/subagent constraints.
- Enable OpenCode render and deploy only when the renderer is complete.

### Phase 6 - Runtime Policies And Eval

- Add runtime policy execution only after provider render/deploy is stable.
- Add smoke evals that check route behavior and provider integration safety.
- Keep evals behavioral, not prompt prose snapshots.

## Roadmap

### Phase 1 - Graph, Routes, Models, CLI Check

- [ ] Create `packages/graph` with export-only `index.ts`.
- [ ] Create `packages/routes` with export-only `index.ts`.
- [ ] Create `packages/models` with export-only `index.ts`.
- [ ] Create `packages/cli` with a thin entrypoint and command dispatch.
- [ ] Add root `source/` layout for authored v4 records.
- [ ] Add source schemas for agents, skills, routes, commands, policies,
      model plans, surfaces, integrations, and prompt layers.
- [ ] Implement source graph loading without reading `v3_legacy/`.
- [ ] Implement graph assembly with provenance for every source record.
- [ ] Implement route contracts and permission compatibility checks.
- [ ] Implement model-plan completeness checks.
- [ ] Implement budget guards for default `xhigh` and Claude `max`.
- [ ] Implement `oal check`.
- [ ] Add explicit WIP stubs only for agreed future commands.
- [ ] Add tests for source parse errors, missing references, contract/permission
      mismatches, model-plan gaps, budget guards, CLI exit codes, and WIP stub
      errors.

### Phase 2 - Codex Render

- [ ] Create `packages/render` with export-only `index.ts`.
- [ ] Add common artifact set types in `render`.
- [ ] Implement Codex rendering in `render/src/codex.ts`.
- [ ] Render `.codex/config.toml`.
- [ ] Render Codex agent artifacts.
- [ ] Render Codex command artifacts.
- [ ] Render Codex skill artifacts.
- [ ] Render Codex policy references only for supported Codex behavior.
- [ ] Render managed `AGENTS.md` blocks.
- [ ] Validate Codex output against pinned schema or explicit allowlist.
- [ ] Implement `oal render --surface codex`.
- [ ] Add tests for deterministic Codex output, invalid model plan handling,
      unsupported Codex feature diagnostics, and provider artifact parsing.

### Phase 3 - Deploy Lifecycle

- [ ] Create `packages/deploy` with export-only `index.ts`.
- [ ] Implement rendered artifact deploy planning.
- [ ] Implement dry-run output with create, update, unchanged, delete, and
      conflict actions.
- [ ] Implement manifest format for project-scope deploys.
- [ ] Implement full-file ownership writes.
- [ ] Implement marked text block insert/update/remove.
- [ ] Implement structured merge support for JSON/TOML where needed.
- [ ] Implement conflict detection before writes.
- [ ] Implement apply with no partial writes after conflicts are detected.
- [ ] Implement rollback from manifest data.
- [ ] Implement undeploy from manifest data.
- [ ] Implement `oal deploy --surface codex --scope project --dry-run`.
- [ ] Implement `oal deploy --surface codex --scope project`.
- [ ] Implement `oal undeploy --surface codex --scope project`.
- [ ] Add tests for dry-run no-mutation, apply, manifest ownership, conflict
      abort, rollback, undeploy, marked blocks, and preservation of user-owned
      content.

### Phase 4 - Claude Code Render

- [ ] Implement Claude Code rendering in `render/src/claude.ts`.
- [ ] Render `.claude/settings.json`.
- [ ] Render Claude agent artifacts.
- [ ] Render Claude skill artifacts.
- [ ] Render Claude hook artifacts only for supported hook events.
- [ ] Render managed `CLAUDE.md` blocks.
- [ ] Validate Claude settings keys and hook events.
- [ ] Enable `oal render --surface claude`.
- [ ] Enable Claude deploy only after render validation is complete.
- [ ] Add tests for Claude artifact parsing, hook event validation, permission
      compatibility, deterministic output, and unsupported feature diagnostics.

### Phase 5 - OpenCode Render

- [ ] Implement OpenCode rendering in `render/src/opencode.ts`.
- [ ] Render `opencode.json` or `opencode.jsonc`.
- [ ] Render OpenCode agent artifacts.
- [ ] Render OpenCode command artifacts.
- [ ] Render OpenCode skill artifacts.
- [ ] Render OpenCode permission configuration.
- [ ] Render plugin configuration only when source-owned.
- [ ] Validate exactly one primary `default_agent`.
- [ ] Validate command references and provider/model IDs.
- [ ] Enable `oal render --surface opencode`.
- [ ] Enable OpenCode deploy only after render validation is complete.
- [ ] Add tests for OpenCode artifact parsing, permission validation,
      `default_agent` constraints, deterministic output, and unsupported feature
      diagnostics.

### Phase 6 - Runtime Policies And Eval

- [ ] Add runtime policy execution only after all provider render/deploy paths
      are stable.
- [ ] Add policy fixture tests for direct function behavior.
- [ ] Add rendered-policy tests for provider-specific wrappers.
- [ ] Add smoke evals for route behavior and provider integration safety.
- [ ] Add `oal eval` only when it runs real behavioral checks.
- [ ] Add `oal doctor` only when it checks real local prerequisites.
- [ ] Ensure evals do not snapshot prompt prose.
- [ ] Ensure runtime policies do not import from source-tree-only paths after
      deploy.

## Testing Policy

Test behavior that protects users and maintainers.

Do test:

- source record parsing failures;
- missing graph references;
- contract versus permission compatibility;
- model-plan completeness;
- budget guards such as no default `xhigh` or Claude `max`;
- provider artifact parse/validation;
- deploy dry-run/apply/rollback/undeploy safety;
- manifest ownership;
- CLI exit codes and explicit WIP errors;
- deterministic output where drift would break users.

Do not test:

- prompt prose wording;
- prompt headings;
- "You are ..." string presence;
- exact Markdown formatting unless a provider parser depends on it;
- exhaustive snapshots of generated files;
- private helper implementation;
- irrelevant whitespace;
- source record field ordering.

Golden tests are allowed only for stable provider artifacts whose exact shape is
a user-facing contract.

## Acceptance Criteria

- `PLAN.md` reflects this architecture and testing policy.
- No package exists without a clear product concept and reason to change.
- No package imports against the intended dependency direction.
- `oal check` validates source records without reading `v3_legacy/`.
- `oal render --surface codex` emits valid Codex artifacts.
- `oal deploy --surface codex --scope project --dry-run` mutates nothing.
- `oal deploy --surface codex --scope project` writes manifest-owned artifacts
  only.
- `oal undeploy --surface codex --scope project` removes only manifest-owned
  content.
- No tests assert prompt prose content.
- No v3 migration logic exists.
