# OpenAgentLayer v4 master roadmap

Purpose: full reboot roadmap for OpenAgentLayer.

Authority: execution plan. Normative behavior lives in `../specs/openagentlayer-v4.md`.

Owner role: Athena for architecture, Hephaestus for implementation, Nemesis for review, Atalanta for validation, Calliope for documentation.

## Goal

OpenAgentLayer is a portable agent behavior layer. It distributes agent roles, commands, skills, policies, runtime guards, and installer-managed files to each supported agentic surface in that surface's own format.

OpenAgentLayer is not a harness and not a framework. It does not own model execution. It does not force applications to build inside it. It compiles a canonical source graph into native surfaces and installs the resulting layer.

## Phase 0: planning corpus

- [x] Sealed — Define `plans/`, `specs/`, and `docs/` authority split.
- [x] Sealed — Define status markers: `[ ] Queued`, `[~] Active`, `[x] Sealed`.
- [x] Sealed — Write v3 research docs as evidence, not implementation instruction.
- [x] Sealed — Write v4-only specs that do not reference prior behavior as required behavior.

## Phase 1: source model

- [x] Sealed — Create package-module workspace with `packages/types/`, `packages/diagnostics/`, `packages/source/`, `packages/render/`, `packages/adapter-contract/`, `packages/adapters/`, `packages/runtime/`, `packages/install/`, `packages/cli/`, and `packages/testkit/`.
- [x] Sealed — Define agent record: metadata, prompt body, role ownership, permission intent, model intent.
- [x] Sealed — Define expanded Greek role taxonomy as source records, not hardcoded role names.
- [x] Sealed — Define role families, role modes, model classes, effort ceilings, and handoff contracts.
- [x] Sealed — Define model-plan records for Codex Plus/Pro and Claude Max subscription routing.
- [x] Sealed — Define surface-config records for native config allowlists and default project values.
- [x] Sealed — Define skill record: metadata, invocation triggers, body, references, scripts, assets.
- [x] Sealed — Define command record: route, owner role, prompt template, argument contract, result contract.
- [x] Sealed — Define policy record: category, event intent, severity, script, surface mapping.
- [x] Sealed — Define guidance record: target surface, authority, body sections.
- [x] Sealed — Add validation for duplicate IDs, invalid status, missing body files, unsupported surface keys.

## Phase 2: compiler pipeline

- [x] Sealed — Implement source loader for TOML and Markdown.
- [x] Sealed — Implement normalized in-memory source graph.
- [x] Sealed — Implement deterministic render context.
- [x] Sealed — Implement adapter registry.
- [x] Sealed — Implement write plan that reports added/changed/removed generated artifacts.
- [x] Sealed — Implement dry-run render mode.
- [x] Sealed — Keep CLI package thin; source/render/install behavior must live in package modules.

## Phase 3: surface adapters

- [x] Sealed — Codex adapter renders agents, skills, commands, config fragments, hooks, and CLI wrappers.
- [x] Sealed — Claude adapter renders agents, skills, commands, hooks, and settings fragments.
- [x] Sealed — OpenCode adapter renders TypeScript plugin, agents, skills, commands, instructions, project/global install assets.

## Phase 4: policy runtime

- [x] Sealed — Implement shared `.mjs` runtime library for hook scripts.
- [x] Sealed — Split runtime package into focused policy, script, payload, and type modules.
- [x] Sealed — Implement command safety guard.
- [x] Sealed — Implement route contract completion gate.
- [x] Sealed — Implement prompt injection/context hook.
- [x] Sealed — Implement source drift guard.
- [x] Sealed — Implement policy test harness with synthetic hook payloads.

## Phase 5: installer

- [x] Sealed — Implement Bun CLI.
- [x] Sealed — Implement global install.
- [x] Sealed — Implement project install.
- [x] Sealed — Implement managed-file manifest.
- [x] Sealed — Implement uninstall from manifest.
- [x] Sealed — Implement config merge with marked managed blocks.
- [x] Sealed — Implement all-surface install preflight before writes.
- [x] Sealed — Preserve manifest ownership when uninstall finds edited managed content.
- [x] Sealed — Split installer package into focused modules with a barrel public entrypoint.
- [x] Sealed — Implement install verification.

## Phase 6: validation

- [x] Sealed — Validate source graph.
- [x] Sealed — Validate render determinism.
- [x] Sealed — Validate generated artifacts against snapshots or structural assertions.
- [x] Sealed — Validate installed hook scripts are self-contained.
- [x] Sealed — Validate docs match specs.
- [x] Sealed — Validate no spec contains v3 implementation requirements.

## Phase 7: adapter maintainability

- [x] Sealed — Split provider monoliths into provider-local bundle, config, record, constants, and install-plan modules.
- [x] Sealed — Split shared adapter helpers into focused modules with barrel-only public entrypoint.
- [x] Sealed — Validate provider indexes stay small and providers do not import from each other.

## Phase 8: implementation hygiene

- [x] Sealed — Define 1500-line split threshold for package code and test files.
- [x] Sealed — Validate package `.ts` and `.mjs` files stay below split threshold.
- [x] Sealed — Document split-by-ownership rule for large implementation files.

## Phase 9: CLI maintainability

- [x] Sealed — Split CLI binary entrypoint from command dispatch and command handlers.
- [x] Sealed — Move option parsing, output helpers, surface resolution, and hook verification into focused CLI modules.
- [x] Sealed — Validate CLI entrypoint stays thin and package modules do not import CLI internals.

## Done criteria

- [x] Sealed — `oal check` validates source graph; `bun run check:source` may wrap it.
- [x] Sealed — `oal render --out <dir>` creates deterministic generated output; `bun run render` may wrap it.
- [x] Sealed — `oal install --surface <surface> --scope <scope>` installs from managed manifest.
- [x] Sealed — `oal uninstall --surface <surface> --scope <scope>` reverses managed install.
- [x] Sealed — `oal doctor` reports runtime and install health.
- [x] Sealed — `bun test` covers source, adapters, runtime, installer, docs audits.
- [x] Sealed — No `*.test.ts` files live under `packages/*/src/`; tests mirror package source under `packages/*/__tests__/`.
- [x] Sealed — v4 specs define all behavior needed by implementers.
