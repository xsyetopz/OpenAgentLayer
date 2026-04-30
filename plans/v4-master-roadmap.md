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

## Phase 10: source compiler maintainability

- [x] Sealed — Split source graph loading into definition, filesystem, record-loader, graph-builder, and orchestration modules.
- [x] Sealed — Split source validation into identity, field, model, surface-config, and reference validation modules.
- [x] Sealed — Validate source loader and validator entrypoints stay small and package modules do not import source internals by path.

## Phase 11: test maintainability

- [x] Sealed — Split CLI tests into command, install, and failure-atomicity scenario modules with shared helpers.
- [x] Sealed — Split installer tests into install, uninstall, and verification scenario modules with shared helpers.
- [x] Sealed — Split source validation tests into graph, docs, record, model-plan, and surface-config scenario modules.

## Phase 12: type contract maintainability

- [x] Sealed — Split primitive, diagnostic, source record, graph, and render-target type contracts into focused modules.
- [x] Sealed — Preserve `@openagentlayer/types` compatibility through a barrel public entrypoint.
- [x] Sealed — Add explicit type subpath exports and validate packages do not import types internals by path.

## Phase 13: render maintainability

- [x] Sealed — Split render write-plan internals into desired-artifact generation, existing-file scanning, stable JSON, and write application modules.
- [x] Sealed — Split adapter registry normalization and model-plan option validation from registry factory.
- [x] Sealed — Add render package barrel public entrypoint.
- [x] Sealed — Validate render orchestration files stay small and packages do not import render internals by path.

## Phase 14: contract foundation maintainability

- [x] Sealed — Split adapter-contract package into identity, artifact, install-plan, surface-adapter, and validation modules.
- [x] Sealed — Preserve adapter-contract root compatibility through a barrel public entrypoint and focused subpath exports.
- [x] Sealed — Split diagnostics package into factory, severity query, and coercion modules while preserving root and coercion exports.
- [x] Sealed — Validate adapter-contract and diagnostics entrypoints stay focused and packages do not import their internals by path.

## Phase 15: testkit boundary-suite maintainability

- [x] Sealed — Split package-boundary tests into workspace, entrypoint, internal-import, split-ownership, and layout-threshold scenario modules.
- [x] Sealed — Move package-boundary fixture helpers into a shared test helper module.
- [x] Sealed — Validate package-boundary scenario files stay below a smaller split threshold and the old monolith does not return.

## Phase 16: runtime test maintainability

- [x] Sealed — Split runtime tests into script, completion-gate, destructive-command-guard, prompt-context-injection, runtime-router, and source-drift scenario modules.
- [x] Sealed — Move repeated runtime script and manifest helpers into a shared test helper module.
- [x] Sealed — Validate runtime scenario files stay below a smaller split threshold and the old monolith does not return.

## Phase 17: render registry test maintainability

- [x] Sealed — Split render registry tests into registry-order, Codex bundle, Claude bundle, OpenCode bundle, and hook bundle scenario modules.
- [x] Sealed — Move repeated render registry graph, bundle, artifact, and hook helpers into a shared test helper module.
- [x] Sealed — Validate render registry scenario files stay below a smaller split threshold and the old monolith does not return.

## Phase 18: CLI install test maintainability

- [x] Sealed — Split CLI install tests into all-surface install, doctor, global install, and edited-content uninstall scenario modules.
- [x] Sealed — Move repeated CLI install command and manifest helpers into a shared test helper module.
- [x] Sealed — Validate CLI install scenario files stay below a smaller split threshold and the old monolith does not return.

## Phase 19: CLI failure-atomicity test maintainability

- [x] Sealed — Split CLI failure-atomicity tests into render, single-surface install, and all-surface install scenario modules.
- [x] Sealed — Move repeated CLI failure fixture and atomicity assertion helpers into a shared test helper module.
- [x] Sealed — Validate CLI failure-atomicity scenario files stay below a smaller split threshold and the old monolith does not return.

## Phase 20: installer uninstall test maintainability

- [x] Sealed — Split installer uninstall tests into managed-file, marked-block, missing-manifest, forged-manifest, and edited-config scenario modules.
- [x] Sealed — Move repeated installer uninstall fixture, forged manifest, and manifest read helpers into a shared test helper module.
- [x] Sealed — Validate installer uninstall scenario files stay below a smaller split threshold and the old monolith does not return.

## Phase 21: full Agent Skills source contract

- [x] Sealed — Extend skill source records to carry Agent Skills frontmatter: canonical `id` as `name`, `description`, `license`, `compatibility`, `metadata`, `allowed_tools`, invocation controls, and provider-specific native fields.
- [x] Sealed — Validate Agent Skills naming and metadata constraints: directory name matches `id`, lowercase kebab-case IDs, no consecutive hyphens, bounded description and compatibility length, and non-empty use guidance.
- [x] Sealed — Treat `scripts/`, `references/`, `assets/`, and `supporting_files` as first-class skill support files tracked by source graph and validated before render/install work.
- [x] Sealed — Require progressive-disclosure authoring: concise `SKILL.md`, deeper reference files linked from the body, and no barebones one-line skill bodies.
- [x] Sealed — Add skill-quality validation for support-file reachability, placeholder sections, procedural guidance, and complete tool-permission intent.

## Phase 22: native skill rendering parity

- [x] Sealed — Render Codex skills as valid plugin skills with `SKILL.md`, support directories, optional `agents/openai.yaml`, native invocation metadata, and generated config that can disable model invocation where requested.
- [x] Sealed — Render Claude skills under `.claude/skills/<id>/` with supported frontmatter, support files, user invocation policy, tool grants, and model/effort routing where the surface supports it.
- [x] Sealed — Render OpenCode skills under `.opencode/skills/<id>/` with OpenCode config permission entries and support-file paths resolved from managed install roots.
- [x] Sealed — Add fixtures for complex skills with references, scripts, assets, metadata, and disabled implicit invocation.
- [x] Sealed — Validate rendered skills structurally against Agent Skills shape, not only by artifact existence or snapshots.

## Phase 23: command system expansion

- [x] Sealed — Split command source into metadata, prompt template, argument schema, examples, route contract, required skills, hook policies, model policy, and optional support files.
- [x] Sealed — Render commands natively per surface: Codex plugin command skill, Claude slash command shape, and OpenCode command Markdown/config entries.
- [x] Sealed — Define argument interpolation for `$ARGUMENTS`, positional arguments, named arguments, missing arguments, examples, and provider-native argument hints.
- [x] Sealed — Preserve command ownership metadata: owner role, side-effect level, route contract, required skills, hook policies, and model/effort assignment.
- [x] Sealed — Validate command parity across Codex, Claude, and OpenCode with fixture commands that cover rich metadata, support files, and placeholder preservation.
- [x] Sealed — Render Codex agent `developer_instructions` as TOML multiline strings and validate that generated agent TOML does not collapse multiline prompts into escaped one-line strings.

## Phase 24: hook parity and policy coverage

- [x] Sealed — Expand policy catalog with secret path guard, placeholder/prototype guard, RTK enforcement guard, diff-state gate, context-budget guard, permission escalation guard, and stale-generated-artifact guard.
- [x] Sealed — Map each OAL policy category to current Codex hooks, Claude hooks, and OpenCode plugin events with provider-owned conversion modules.
- [x] Sealed — Add normalized payload adapters for prompt, session, tool, permission, file, subagent, compaction, stop, and plugin event families.
- [x] Sealed — Define blocking, warn-only, fail-open, and fail-closed semantics per policy and surface event.
- [x] Sealed — Validate every policy with synthetic payload tests for every supported event mapping and every generated runtime script.

## Phase 25: prompt and instruction architecture

- [ ] Queued — Split prompting into global guidance, surface guidance, role prompt, command prompt, skill instructions, hook-injected context, and completion contract layers.
- [ ] Queued — Define prompt-layer precedence, merge order, conflict behavior, and surface-specific placement for Codex, Claude, and OpenCode.
- [ ] Queued — Add route contracts that require output shape, validation evidence, handoff shape, completion-gate evidence, and escalation behavior.
- [ ] Queued — Validate rendered prompt layers are deterministic and include required high-authority guidance on every supported surface.
- [ ] Queued — Prefer runtime and hook enforcement over prose-only prompting when a behavior can be checked deterministically.

## Phase 26: taste and caveman skill integration

- [ ] Queued — Add source records for caveman, caveman-commit, caveman-compress, caveman-review, taste, taste-output, taste-redesign, taste-images, taste-imagegen, and taste family variants.
- [ ] Queued — Preserve upstream-style skill metadata, invocation rules, full body depth, pinned source attribution, and support-file structure instead of compressing them into short summaries.
- [ ] Queued — Add OAL wrappers only for routing, surface-native metadata, and model/tool policy; do not dilute skill bodies or convert them into generic guidance.
- [ ] Queued — Validate caveman skills affect assistant response style only and taste skills affect frontend/UI/design tasks only.
- [ ] Queued — Test generated skills for complete instructions, no missing sections, no placeholder prose, and correct user invocation behavior.

## Phase 27: role and subagent orchestration depth

- [ ] Queued — Expand Greek-god role records where useful for design polish, docs, security, performance, install health, source sync, prompt QA, hook QA, and provider schema QA.
- [ ] Queued — Add role-to-skill, role-to-command, and role-to-policy affinity metadata so adapters can render native subagent skill/tool access.
- [ ] Queued — Add subscription-aware model and effort defaults for Codex Plus, Codex Pro 5x/20x, Claude Max 5x/20x, and provider-specific long-context variants.
- [ ] Queued — Default to low/medium effort for routine work, medium/high for planning and review, and reserve high/xhigh for explicit architecture, audit, or rare mini/codex cases.
- [ ] Queued — Validate rendered subagents include native model, effort, tools, skills, prompt, and handoff metadata without hardcoded role assumptions.

## Phase 28: external-source sync studies

- [ ] Queued — Refresh docs for Codex config/schema, hooks, subagents, AGENTS.md, skills, and command behavior with retrieval date and official-source URLs.
- [ ] Queued — Refresh docs for Claude settings schema, hooks, slash commands, agents, skills, permissions, Max subscription model routing, and current binary name `claude`.
- [ ] Queued — Refresh docs for OpenCode config, plugins, events, commands, skills, permissions, and provider model routing.
- [ ] Queued — Extract only non-deprecated, non-legacy, non-compatibility fields into OAL specs and source schemas.
- [ ] Queued — Enforce no-false-authority rules: no fake schema URLs, no inferred native keys, no stale provider claims, and no copied schema fragments without source provenance.

## Phase 29: extensiveness validation suite

- [ ] Queued — Add tests for full skill package completeness, command render parity, hook event coverage, prompt-layer coverage, provider config validity, and install manifest support-file tracking.
- [ ] Queued — Add boundary tests preventing barebones skills, unsupported command aliases, missing support-file installs, missing hook mappings, and prose-only guards where runtime checks are possible.
- [ ] Queued — Add render smoke fixtures for complex graphs that include many agents, commands, skills, support files, policies, prompt layers, and model-plan variants.
- [ ] Queued — Add install and doctor checks that managed skills, commands, hooks, runtime scripts, and support files are reversible and drift-detectable.
- [ ] Queued — Add roadmap/docs/spec consistency audit for new phases so plans, specs, and docs cannot disagree about supported surfaces or source concepts.

## Done criteria

- [x] Sealed — `oal check` validates source graph; `bun run check:source` may wrap it.
- [x] Sealed — `oal render --out <dir>` creates deterministic generated output; `bun run render` may wrap it.
- [x] Sealed — `oal install --surface <surface> --scope <scope>` installs from managed manifest.
- [x] Sealed — `oal uninstall --surface <surface> --scope <scope>` reverses managed install.
- [x] Sealed — `oal doctor` reports runtime and install health.
- [x] Sealed — `bun test` covers source, adapters, runtime, installer, docs audits.
- [x] Sealed — No `*.test.ts` files live under `packages/*/src/`; tests mirror package source under `packages/*/__tests__/`.
- [x] Sealed — v4 specs define all behavior needed by implementers.
