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

## Phase 32: provider parity gates

- [x] Sealed — Add provider parity render checks for Codex, Claude, and OpenCode configs so emitted keys stay schema-allowlisted, blocked keys stay absent, and replacement-source keys are not generated.
- [x] Sealed — Add provider-native artifact checks for Codex agents/plugin skills/hooks, Claude agents/commands/skills/settings, and OpenCode config/plugin/events/runtime paths.
- [x] Sealed — Add install manifest ownership checks for structured provider configs, marked user instruction blocks, and generated runtime hook files.
- [x] Sealed — Keep provider parity structural and behavioral; tests do not assert arbitrary agent, command, or skill prose.

## Phase 25: prompt and instruction architecture

- [x] Sealed — Split prompting into global guidance, surface guidance, role prompt, command prompt, skill instructions, hook-injected context, and completion contract layers.
- [x] Sealed — Define prompt-layer precedence, merge order, conflict behavior, and surface-specific placement for Codex, Claude, and OpenCode.
- [x] Sealed — Add route contracts that require output shape, validation evidence, handoff shape, completion-gate evidence, and escalation behavior.
- [x] Sealed — Validate rendered prompt layers are deterministic and include required high-authority guidance on every supported surface.
- [x] Sealed — Prefer runtime and hook enforcement over prose-only prompting when a behavior can be checked deterministically.

## Phase 26: taste and caveman skill integration

- [x] Sealed — Add source records for caveman, caveman-commit, caveman-compress, caveman-review, taste, taste-output, taste-redesign, taste-images, taste-imagegen, and taste family variants.
- [x] Sealed — Preserve upstream-style skill metadata, invocation rules, full body depth, pinned source attribution, and support-file structure from `third_party/` upstream submodules instead of manual source copies.
- [x] Sealed — Add OAL overlays only for routing, surface-native metadata, and model/tool policy; do not dilute skill bodies or convert them into generic guidance.
- [x] Sealed — Add canonical third-party sync for caveman and taste-skill upstream submodules.
- [x] Sealed — Validate caveman skills affect assistant response style only and taste skills affect frontend/UI/design tasks only.
- [x] Sealed — Test generated skills for complete instructions, no missing sections, no placeholder prose, and correct user invocation behavior.

## Phase 27: role and subagent orchestration depth

- [x] Sealed — Expand Greek-god role records where useful for design polish, docs, security, performance, install health, source sync, prompt QA, hook QA, and provider schema QA.
- [x] Sealed — Add role-to-skill, role-to-command, and role-to-policy affinity metadata so adapters can render native subagent skill/tool access.
- [x] Sealed — Add subscription-aware model and effort defaults for Codex Plus, Codex Pro 5x/20x, Claude Max 5x/20x, and provider-specific long-context variants.
- [x] Sealed — Default to low/medium effort for routine work, medium/high for planning and review, and reserve high/xhigh for explicit architecture, audit, or rare mini/codex cases.
- [x] Sealed — Validate rendered subagents include native model, effort, tools, skills, prompt, and handoff metadata without hardcoded role assumptions.

## Phase 28: external-source sync studies

- [x] Sealed — Refresh docs for Codex config/schema, hooks, subagents, AGENTS.md, skills, and command behavior with retrieval date and official-source URLs.
- [x] Sealed — Refresh docs for Claude settings schema, hooks, slash commands, agents, skills, permissions, Max subscription model routing, and current binary name `claude`.
- [x] Sealed — Refresh docs for OpenCode config, plugins, events, commands, skills, permissions, and provider model routing.
- [x] Sealed — Extract only non-deprecated, non-legacy, non-compatibility fields into OAL specs and source schemas.
- [x] Sealed — Enforce no-false-authority rules: no fake schema URLs, no inferred native keys, no stale provider claims, and no copied schema fragments without source provenance.

## Phase 29: extensiveness validation suite

- [x] Sealed — Add tests for full skill package completeness, command render parity, hook event coverage, prompt-layer coverage, provider config validity, and install manifest support-file tracking.
- [x] Sealed — Add boundary tests preventing barebones skills, unsupported command aliases, missing support-file installs, missing hook mappings, and prose-only guards where runtime checks are possible.
- [x] Sealed — Add render smoke fixtures for complex graphs that include many agents, commands, skills, support files, policies, prompt layers, and model-plan variants.
- [x] Sealed — Add install and doctor checks that managed skills, commands, hooks, runtime scripts, and support files are reversible and drift-detectable.
- [x] Sealed — Add roadmap/docs/spec consistency audit for new phases so plans, specs, and docs cannot disagree about supported surfaces or source concepts.

## Phase 30: prompt and OAL skill quality

- [x] Sealed — Rewrite OAL-owned agent prompts with concrete mission, use, operating, evidence, and output sections.
- [x] Sealed — Rewrite core OAL guidance around source authority, reboot rules, provider-native rendering, upstream sync, runtime enforcement, and dirty-tree discipline.
- [x] Sealed — Rewrite planning command prompt as a decision-complete route with grounding, intent lock, implementation spec, acceptance gates, and blocker rules.
- [x] Sealed — Rewrite OAL-owned review-policy skill with warranted-finding review standard, severity rules, evidence requirements, non-goals, and output shape.
- [x] Sealed — Keep prompt/body markdown author-owned: validation may reject missing files and placeholders, but unit tests must not assert role-prose lines or enforce style sections.

## Phase 31: provider structure, hook categories, and headless e2e

- [x] Sealed — Add explicit policy hook event categories for prompt submit, pre-tool, post-tool, permission request, completion, compaction, file-change, and session-status families.
- [x] Sealed — Resolve generated Codex, Claude, and OpenCode hook events through category-aware helpers before provider rendering.
- [x] Sealed — Validate policy surface mappings stay inside the declared hook event category.
- [x] Sealed — Convert provider tests toward native structure/config assertions instead of agent-body prose assertions.
- [x] Sealed — Add opt-in headless e2e scripts for Codex, OpenCode, and Claude that run only after binary, model, and auth are proven by a real prompt response.
- [x] Sealed — Do not add e2e force overrides; unavailable binaries, unavailable models, or missing auth skip with a concrete reason.
- [x] Sealed — Remove generic OpenAgentLayer mentions from role prompts unless the prompt is specifically about layer mechanics, generated surfaces, skills, commands, or provider invocation.

## Phase 33: runtime policy parity

- [x] Sealed — Export async runtime policy evaluation for policies that need filesystem or manifest IO while preserving the existing sync runtime router.
- [x] Sealed — Route `source-drift-guard` through async runtime evaluation and keep the sync router explicit about the async-only path.
- [x] Sealed — Validate every source policy id resolves to a separate runtime script file.
- [x] Sealed — Validate every source policy surface mapping evaluates through synthetic runtime payloads for Codex, Claude, and OpenCode.
- [x] Sealed — Validate every generated runtime script emits decision JSON and exits nonzero only for deny decisions.

## Phase 34: fallback removal and shortcut audit

- [x] Sealed — Remove adapter fallback from missing role assignments to role `model_class`, role `effort_ceiling`, or plan defaults; generated agent and command model fields must come from explicit source model-plan assignments or command model policy.
- [x] Sealed — Report missing model plans and missing per-role model assignments as adapter diagnostics before generated artifacts can be treated as valid.
- [x] Sealed — Remove hardcoded Codex fallback profile generation; Codex profiles are emitted only from source model-plan records.
- [x] Sealed — Select OpenCode `default_agent` only from source agent metadata with exactly one OpenCode-capable `primary = true` agent, and emit diagnostics for zero or multiple candidates.
- [x] Sealed — Keep runtime policy-router misses explicit through `unsupported-runtime-policy` diagnostics instead of generic unknown-policy fallbacks.

## Phase 35: v3 capability recovery gate

- [x] Sealed — Add v3 recovery matrix so command, skill, and hook behavior is tracked as capability evidence rather than legacy compatibility.
- [x] Sealed — Restore broad shared command coverage for debug, explore, implement, orchestrate, review, test, trace, validate, document, deslop, design-polish, plan variants, resume, audit, and taste/design routes.
- [x] Sealed — Restore missing v3 skill families for debug, decide, document, elegance, errors, explore, git-workflow, handoff, onboard, openagentsbtw, perf, plain-language, review, security, style, test, and trace.
- [x] Sealed — Render recovered commands and skills through Codex, Claude, and OpenCode native surfaces with structural tests.
- [x] Sealed — Recover useful v3 hook behaviors for failure circuits, prompt git context, protected branch confirmation, staged secret scanning, subagent route context, and write-quality checks as source-native runtime policies.

## Phase 36: recovered capability quality gate

- [x] Sealed — Replace scaffold recovered command prompts with route-specific procedures, acceptance gates, and evidence output.
- [x] Sealed — Convert copied v3 skill metadata and bodies into OAL v4-local skill source while retaining v3 only as evidence.
- [x] Sealed — Add source validation rejecting generic recovered command prompts and active `v3-evidence` skill source metadata.
- [x] Sealed — Add runtime parity tests comparing recovered policy router decisions with generated `.mjs` hook scripts.
- [x] Sealed — Update recovery matrix, specs, and roadmap with quality status and validation evidence.

## Phase 37: native-surface completeness and operational hardening

- [x] Sealed — Add full source-graph render coverage proving every surface-capable agent, command, skill, support file, policy runtime script, and policy metadata artifact renders to each declared native provider surface.
- [x] Sealed — Extend runtime parity so every source policy compares router decisions with rendered `.mjs` script decisions for representative payloads and deny exit semantics.
- [x] Sealed — Harden all-surface install tests so every rendered artifact is manifest-owned with source ownership, SHA-256 tracking, runtime script executability, and native install modes.
- [x] Sealed — Strengthen headless e2e harness prompts so provider probes inspect concrete generated native files, while unit tests cover binary-skip and auth/model probe gating without real provider binaries.
- [x] Sealed — Keep Phase 37 structural and behavioral: no prompt prose assertions, no generated artifact reliance, no new runner/filter layer, and no active implementation authority from retired snapshots.

## Done criteria

- [x] Sealed — `oal check` validates source graph; `bun run check:source` may wrap it.
- [x] Sealed — `oal render --out <dir>` creates deterministic generated output; `bun run render` may wrap it.
- [x] Sealed — `oal install --surface <surface> --scope <scope>` installs from managed manifest.
- [x] Sealed — `oal uninstall --surface <surface> --scope <scope>` reverses managed install.
- [x] Sealed — `oal doctor` reports runtime and install health.
- [x] Sealed — `bun test` covers source, adapters, runtime, installer, docs audits.
- [x] Sealed — No `*.test.ts` files live under `packages/*/src/`; tests mirror package source under `packages/*/__tests__/`.
- [x] Sealed — v4 specs define all behavior needed by implementers.
