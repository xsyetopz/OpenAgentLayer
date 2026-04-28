# OAL v4 Roadmap

## Definition of Done

OAL v4 beta is ready when Codex and OpenCode adapters install cleanly, route to current supported models, enforce task contracts through hooks/permissions, run commands through OAL runner, and pass temp-home validation.

## 0. Planning and Source-of-Truth

- [x] Create OAL planning index.
- [x] Document Rust-first language/runtime decision.
- [x] Document native adapter strategy.
- [x] Document fresh-start product boundary.
- [x] Document behavior-policy replacement for regex-only advice blocking.
- [x] Document RTK/OAL runner efficiency strategy.
- [x] Document current Codex/OpenCode model routing policy.
- [ ] Convert planning docs into checked schemas under `source/`.
- [ ] Add doc lints: every platform spec must list references, native surfaces, adapter plan, validation.
- [ ] Add source checks for platform references, native surfaces, install paths, and validation fixtures.

## 1. Product Foundation

- [ ] Add product constants: `OpenAgentLayer`, `OAL`, `oal`, `oal-runner`.
- [ ] Remove native Windows scripts from active product surface.
- [ ] Add unsupported Windows-native error: `OAL supports Windows through WSL2 only.`
- [ ] Add WSL2 install note under Linux path.

## 2. Rust Workspace Foundation

- [ ] Add `oal-core` crate.
- [ ] Add `oal-cli` crate.
- [ ] Add `oal-runner` crate.
- [ ] Add adapter trait and platform capability types.
- [ ] Add typed error model with exact user-facing blockers.
- [ ] Add config loader for TOML/JSON source specs.
- [ ] Add install manifest type.
- [ ] Add validation result type.
- [ ] Add workspace tests for source parsing.

## 3. CLI Commands

- [ ] `oal --version` prints OAL version and runtime target.
- [ ] `oal render <platform>` writes generated artifacts to temp/output dir.
- [ ] `oal check <platform>` validates source and generated artifacts.
- [ ] `oal install <platform>` writes managed files and manifest.
- [ ] `oal uninstall <platform>` removes manifest-owned files.
- [ ] `oal doctor` checks OS, paths, tool availability, and source/config validity.
- [ ] `oal doctor rtk` probes RTK capability map.
- [ ] `oal hook <platform> <event>` handles platform payloads.
- [ ] `oal run -- <command...>` executes through runner policy.

## 4. Canonical Source Specs

- [ ] `source/product` defines name, support policy, version, docs URLs.
- [ ] `source/models` defines allowed models, routes, fallbacks, benchmark metadata.
- [ ] `source/platforms` defines native surfaces, generated paths, install paths.
- [ ] `source/agents` defines roles, model routes, allowed tools, evidence requirements.
- [ ] `source/skills` defines skill metadata and platform mappings.
- [ ] `source/hooks` defines task contracts, events, gates, failure messages.
- [ ] `source/validation` defines golden fixtures and smoke scenarios.
- [ ] All source specs have schema validation.

## 5. Codex Adapter

- [ ] Render `AGENTS.md` as short map, not long manual.
- [ ] Render Codex config with current supported model IDs only.
- [ ] Render custom agents mapped to OAL role contracts.
- [ ] Render skills as Codex skills with concise frontmatter.
- [ ] Render hooks for prompt, pre-tool, stop, and subagent-stop where supported.
- [ ] Render slash/custom commands only through native supported surface.
- [ ] Set tool-output budget fields when supported by Codex config.
- [ ] Fail `oal check codex` if hooks are required but disabled.
- [ ] Add temp-home install smoke.
- [ ] Add uninstall smoke.

## 6. OpenCode Adapter

- [ ] Render OpenCode config from source model routes.
- [ ] Render agents/modes from OAL roles.
- [ ] Render skills into native OpenCode path.
- [ ] Render permissions that allow `oal-runner` and gate raw shell.
- [ ] Avoid package plugin installs by default.
- [ ] Add local plugin only if needed for hook-equivalent behavior and source-proven.
- [ ] Add skill collision fixture for `.opencode`, `.claude`, `.agents` discovery overlap.
- [ ] Add config precedence fixture.
- [ ] Add temp-home install/uninstall smoke.

## 7. OAL Runner and RTK Strategy

- [ ] Parse command into structured command plan.
- [ ] Segment safe shell chains.
- [ ] Preserve shell semantics for redirection/substitution by falling back safely.
- [ ] Detect destructive commands and require request/approval evidence.
- [ ] Probe RTK version and supported filters.
- [ ] Use RTK for high-yield supported commands.
- [ ] Use OAL generic compaction when RTK has no good filter.
- [ ] Track raw tokens, kept tokens, saved tokens, unsupported count, low-yield count.
- [ ] Add fixtures for cargo, test, grep, read, git, npm/bun, generic logs.
- [ ] Target >= 60% project-level savings on supported loops.

## 8. Task Contract Engine

- [ ] Classify task kind from prompt and route metadata.
- [ ] Detect explicit advice request escape hatch.
- [ ] Detect execution request and required evidence.
- [ ] Store task contract in session-local OAL state.
- [ ] Validate final answer against contract.
- [ ] Block advice-only answer for code-change contract.
- [ ] Block unsolicited scripts/advice for no-advice emotional/interpersonal/hypothetical contract.
- [ ] Allow scripts/advice when explicitly requested.
- [ ] Require exact `BLOCKED` format when completion impossible.
- [ ] Record false-positive and false-negative fixtures.

## 9. Hook Validation

- [ ] Prompt fixture: code task creates `code_change` contract.
- [ ] Prompt fixture: advice request creates advice-allowed contract.
- [ ] Prompt fixture: emotional interpretation creates no-advice direct-answer contract.
- [ ] Pre-tool fixture: raw supported shell command routes through runner.
- [ ] Pre-tool fixture: destructive command blocks without request evidence.
- [ ] Stop fixture: code task with edits/tests passes.
- [ ] Stop fixture: code task with advice-only final fails.
- [ ] Stop fixture: no-advice task with suggested scripts fails.
- [ ] Stop fixture: explicit advice request with wording passes.
- [ ] Malformed payload fixture fails closed with exact message.

## 10. Model Benchmarks

- [ ] Add Codex route benchmark fixture set.
- [ ] Add OpenCode free fallback benchmark fixture set.
- [ ] Record model success/fail by route.
- [ ] Record hallucinated path/file rate.
- [ ] Record unsolicited-advice rate.
- [ ] Record validation evidence rate.
- [ ] Promote fallback order changes only with fixture evidence.
- [ ] Add `oal check models` to reject stale/default old model IDs.

## 11. Effectiveness Gates

- [ ] Project-level token savings >= 60% on supported loops.
- [ ] Zero RTK/hook recursion incidents in fixture suite.
- [ ] Zero regex-only blocker decisions.
- [ ] Code-task final answers include edit/test/blocker evidence >= 95% in fixtures.
- [ ] No Windows-native path appears in active install docs.
- [ ] Codex and OpenCode install/uninstall leave no unmanaged generated files.
- [ ] Adapter docs stay source-linked and pass stale-reference lint.

## 12. Release Gate

- [ ] `cargo fmt --all` passes.
- [ ] `cargo test --workspace` passes.
- [ ] `cargo clippy --locked --workspace -- -D warnings` passes.
- [ ] `oal check codex` passes.
- [ ] `oal check opencode` passes.
- [ ] macOS temp-home install/uninstall smokes pass.
- [ ] Linux temp-home install/uninstall smokes pass.
- [ ] WSL2 documented as Linux, not native Windows.
- [ ] Roadmap checkboxes match shipped behavior.
