# OpenAgentLayer Roadmap

This roadmap turns the plan pack into a complete OpenAgentLayer v4 release. Every item is source-backed or explicitly blocked by `UNKNOWN` evidence.

## Phase 0: Plan Pack and v3 Quarantine

- [x] `/plans/` exists with core specs, platform specs, source dives, ADRs, and Mermaid flows.
- [x] Product name is locked as OpenAgentLayer / OAL.
- [x] Old v3 implementation is moved out of the active product tree.
- [x] `v3_to_be_removed/` is gitignored.
- [x] v4 implementation does not mutate v3 in place.
- [ ] Add a short plan-pack status table that shows which platform claims are sourced, partial, prompt-only, unsupported, or `UNKNOWN`.

## Phase 1: Source Model and Evidence Gates

- [x] Create `source/harness/` as the canonical TypeScript source model.
- [x] Define schemas for product metadata, adapters, model policy, and evidence gates.
- [x] Add an adapter registry keyed by stable platform IDs.
- [x] Add a source-evidence manifest that links core platform support claims to official docs, source paths, or user-provided runtime output.
- [x] Add a docs evidence checker that rejects unsourced required paths and forbidden active terms.
- [x] Encode model policy: Codex utility routing uses `gpt-5.4-mini`; OAL emits only policy-listed Codex routes.
- [x] Encode OpenCode fallback model defaults: `opencode/big-pickle`, `opencode/minimax-m2.5-free`, `opencode/ling-2.6-flash-free`, `opencode/hy3-preview-free`, and `opencode/nemotron-3-super-free`.
- [x] Pin Kilo support to `Kilo-Org/kilocode-legacy` v5 behavior; do not target v7 without a new decision record.
- [ ] Extend schemas to prompts, skills, commands, hooks, permissions, install targets, uninstall targets, and validation result wire formats.
- [ ] Extend docs evidence checker to reject stale verified dates.

## Phase 2: CLI and Workspace Foundation

- [x] Create the `oal` CLI entrypoint.
- [x] Split packages under `packages/` using the `@openagentlayer/*` scope.
- [ ] Keep shell and PowerShell files as launchers only.
- [x] Add workspace-level config for TypeScript, tests, lint, formatting, and schema validation.
- [x] Add `oal plan`, `oal render`, `oal install`, `oal uninstall`, `oal check`, and `oal doctor` command surfaces.
- [x] Add dry-run output for every command that would write files.
- [x] Add machine-readable JSON output for automation and concise text output for humans.

## Phase 3: Command Core and `oal-runner`

- [x] Create Rust crate `oal-runner`.
- [ ] Implement typed command intents for `status`, `diff`, `search`, `read`, `list`, `tree`, `test`, `build`, `lint`, and `logs`.
- [ ] Enforce output budgets before data enters agent context.
- [ ] Preserve exact errors while summarizing high-volume output.
- [x] Emit structured JSON summaries.
- [ ] Emit optional raw artifact paths.
- [ ] Add raw-shell escape with justification, approval classification, and telemetry.
- [ ] Add token-saving regression tests against noisy output fixtures.
- [ ] Replace RTK-memory dependency in generated guidance with harness command routing.

## Phase 4: Generator and Renderer Split

- [x] Build platform renderer modules from the canonical source model.
- [x] Render managed markers into every generated artifact.
- [ ] Render tiny always-on instruction files and lazy-loaded skills/workflows.
- [ ] Remove v3 generated assumptions from active output.
- [x] Add generated contract tests for initial renderers.
- [ ] Add snapshot tests for important platform artifacts.
- [ ] Add stale-output checks that fail when generated artifacts drift from source.

## Phase 5: Native Adapter Completion

- [ ] Codex CLI: render `AGENTS.md`, config, plugin skills, custom agents, hooks, MCP settings, and model policy using `gpt-5.4-mini` for bounded utility.
- [ ] OpenCode: render agents, skills, config, permissions, local plugin files, Zen fallback model policy, and collision-safe skill names.
- [ ] Claude Code: render native commands, hooks, skills, subagents, MCP, and compact project guidance.
- [ ] Gemini CLI: render `GEMINI.md`, commands, extensions, MCP, and partial agent/skill equivalents.
- [ ] Cline: render rules, workflows, MCP, hooks, and mode-compatible guidance.
- [ ] Cursor IDE: render rules, AGENTS support, MCP, context controls, and partial workflow surfaces.
- [ ] Windsurf Editor: render rules, workflows, memories, MCP, and supported hook surfaces.
- [ ] Amp: render AGENTS, skills, toolbox/MCP guidance, and supported thread/subagent surfaces.
- [ ] Augment: render guidelines, rules, memories, MCP/context service guidance, and mark unknown agent/command claims.
- [ ] Kilo Code v5 legacy: render `.kilocode/rules/`, `.kilocode/rules-<mode>/`, `.kilocode/workflows/`, `.kilocodemodes`, and MCP config only when enabled.

## Phase 6: Installer and Uninstaller Rewrite

- [ ] Implement TypeScript installer with platform detection, adapter probes, source rendering, managed markers, install manifest, runner install, and written-file validation.
- [ ] Implement uninstall from manifest first, then known v3 residue cleanup tables.
- [ ] Add `--dry-run`, `--json`, `--platform`, `--home`, `--project`, and `--all` options.
- [ ] Ensure uninstall never deletes unmarked user files.
- [ ] Log every destructive cleanup path.
- [ ] Add temp-home install smoke tests.
- [ ] Add temp-home uninstall smoke tests.
- [ ] Add v3 residue cleanup fixtures covering old Claude, Codex, OpenCode, Copilot, optional IDE, RTK, and managed config paths.

## Phase 7: Validation Hardening

- [ ] Run schema validation for all source model files.
- [ ] Run generated artifact snapshot and contract checks.
- [ ] Run adapter docs evidence checks.
- [ ] Run platform render tests.
- [ ] Run temp-home install and uninstall smokes.
- [ ] Run v3 residue cleanup fixture tests.
- [ ] Run `cargo test -p oal-runner`.
- [ ] Run token-saving regression tests.
- [ ] Run permission, sandbox, hook, and approval-gate tests.
- [ ] Run response-boundary regression checks.
- [ ] Run cross-platform path tests for macOS, Linux, and Windows path conventions.

## Phase 8: Production Readiness

- [ ] Restore CI for typecheck, lint, tests, schema checks, generated checks, Rust tests, install smokes, and uninstall smokes.
- [ ] Add release packaging for npm packages and Rust runner binaries.
- [ ] Add provenance and checksum generation.
- [ ] Add compatibility notes that v4 is not a v3 migration layer.
- [ ] Add rollback and uninstall docs.
- [ ] Rewrite README for OpenAgentLayer only.
- [ ] Rewrite architecture docs for OpenAgentLayer only.
- [ ] Regenerate platform docs from plan evidence.
- [ ] Add changelog entry for the v4 rewrite.
- [ ] Add release checklist requiring clean tree, passing validation, generated parity, and no active output under `v3_to_be_removed/`.

## Final Acceptance

- [ ] `oal doctor` reports source, renderer, adapter, runner, installer, and uninstaller health.
- [ ] `oal check --all` passes on a clean checkout.
- [ ] Fresh temp-home install creates only managed OAL artifacts.
- [ ] Fresh temp-home uninstall removes OAL artifacts and known v3 residue without deleting unmarked user files.
- [ ] Codex generated config uses only policy-listed models.
- [ ] OpenCode generated config includes documented Zen fallback defaults.
- [ ] Kilo generated output targets legacy v5 paths only.
- [ ] Public docs contain no v3 product claims except removal/cleanup notes.
