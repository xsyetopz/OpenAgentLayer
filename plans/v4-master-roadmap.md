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

- [ ] Queued — Create `packages/oal/src/schema/` for typed source records.
- [ ] Queued — Define agent record: metadata, prompt body, role ownership, permission intent, model intent.
- [ ] Queued — Define expanded Greek role taxonomy as source records, not hardcoded role names.
- [ ] Queued — Define role families, role modes, model classes, effort ceilings, and handoff contracts.
- [ ] Queued — Define skill record: metadata, invocation triggers, body, references, scripts, assets.
- [ ] Queued — Define command record: route, owner role, prompt template, argument contract, result contract.
- [ ] Queued — Define policy record: category, event intent, severity, script, surface mapping.
- [ ] Queued — Define guidance record: target surface, authority, body sections.
- [ ] Queued — Add validation for duplicate IDs, invalid status, missing body files, unsupported surface keys.

## Phase 2: compiler pipeline

- [ ] Queued — Implement source loader for TOML and Markdown.
- [ ] Queued — Implement normalized in-memory source graph.
- [ ] Queued — Implement deterministic render context.
- [ ] Queued — Implement adapter registry.
- [ ] Queued — Implement write plan that reports added/changed/removed generated artifacts.
- [ ] Queued — Implement dry-run render mode.

## Phase 3: surface adapters

- [ ] Queued — Codex adapter renders agents, skills, commands, config fragments, hooks, and CLI wrappers.
- [ ] Queued — Claude adapter renders agents, skills, plugin metadata, hooks, settings fragments.
- [ ] Queued — OpenCode adapter renders TypeScript plugin, agents, skills, commands, instructions, project/global install assets.
- [ ] Queued — Copilot adapter renders prompts, instructions, MCP/config surfaces where supported.
- [ ] Queued — Optional IDE adapter renders rule files only where a native surface is understood.

## Phase 4: policy runtime

- [ ] Queued — Implement shared `.mjs` runtime library for hook scripts.
- [ ] Queued — Implement command safety guard.
- [ ] Queued — Implement route contract completion gate.
- [ ] Queued — Implement prompt injection/context hook.
- [ ] Queued — Implement source drift guard.
- [ ] Queued — Implement policy test harness with synthetic hook payloads.

## Phase 5: installer

- [ ] Queued — Implement Bun CLI.
- [ ] Queued — Implement global install.
- [ ] Queued — Implement project install.
- [ ] Queued — Implement managed-file manifest.
- [ ] Queued — Implement uninstall from manifest.
- [ ] Queued — Implement config merge with marked managed blocks.
- [ ] Queued — Implement install verification.

## Phase 6: validation

- [ ] Queued — Validate source graph.
- [ ] Queued — Validate render determinism.
- [ ] Queued — Validate generated artifacts against snapshots or structural assertions.
- [ ] Queued — Validate installed hook scripts are self-contained.
- [ ] Queued — Validate docs match specs.
- [ ] Queued — Validate no spec contains v3 implementation requirements.

## Done criteria

- [ ] Queued — `bun run check:source` validates source graph.
- [ ] Queued — `bun run render` creates deterministic generated output.
- [ ] Queued — `bun test` covers source, adapters, runtime, installer, docs audits.
- [ ] Queued — v4 specs define all behavior needed by implementers.
