# OpenAgentLayer v4 roadmap

## Goal

Build OAL as a Bun/TypeScript/JSON-native agent layer that renders native platform surfaces from one source model.

## Progress key

- [ ] not started
- [~] in progress
- [x] done

## Phase 1/2 exit criteria

Phase 1/2 is accepted when `oal check` validates local JSON schemas, pinned upstream schema hashes, model/subscription/provider/tool policies, and renderer idempotency from the canonical `source/` graph.

Authoritative specs:

- Source graph and schemas: `specs/source-schema.md`
- Renderer manifest, managed sidecar, and explain map: `specs/platform-adapters.md`
- Validation order and policy checks: `specs/config-validation.md`

## Phase 3A exit criteria

Phase 3A is accepted when Codex adapter output includes native Codex surfaces, generated Codex config validates against the cached upstream schema, `oal doctor hooks codex` names supported and unsupported hook mappings explicitly, and `oal check` still passes.

Status policy:

- `[ ]` means no source/spec/code exists yet.
- `[~]` means partial source/spec/code exists, but the acceptance gate is not met.
- `[x]` means source/spec/code exists and validation passes.

## Phase 1: source and schema

### Source model

- [x] Create `source/oal.json`.
- [x] Create JSON schemas for agents, skills, commands, workflows, hooks, platforms, providers, tools, routes, subscriptions, and upstream schemas.
- [x] Create Greek-gods agent records for `athena`, `hermes`, `hephaestus`, `nemesis`, `atalanta`, `calliope`, and `odysseus`.
- [x] Create provider records for required and optional providers.
- [x] Add git repo URL, remote, branch, locked ref, upstream path, overlay path, and sync strategy to provider records.
- [x] Create tool records for required and optional host tools.
- [x] Create model route records for Codex, Claude Code, and OpenCode.
- [x] Create subscription records for Codex and Claude Code.
- [x] Create upstream schema manifest.
- [x] Create Codex, Claude Code, and OpenCode config source records.

### Validation

- [x] Wire schema validator into `oal check`.
- [x] Reject invalid agent names.
- [x] Reject unsupported Codex model ids.
- [x] Reject unsupported Claude Code model ids.
- [x] Reject unsupported OpenCode fallback model ids.
- [x] Reject hook ids that do not start with hook category prefix.
- [x] Reject providers without provenance.
- [x] Reject git-backed providers without repo URL, branch/ref, upstream path, and overlay path.
- [x] Reject Linux tool install records without package-manager detection.
- [x] Reject Codex subscription outside `plus`, `pro-5`, `pro-20`.
- [x] Reject Claude Code subscription outside `max-5`, `max-20`.
- [x] Reject Claude Code `plus` consumer profile.

## Phase 2: renderer core

### Core pipeline

- [x] Implement source loader.
- [x] Implement schema validator.
- [x] Implement render planner.
- [x] Implement render manifest.
- [x] Implement managed-file marker or sidecar manifest.
- [x] Implement explain map from output file to source file.
- [x] Ensure generated output never becomes source input.

### Idempotency

- [x] Render to temporary tree.
- [x] Compare render output deterministically.
- [x] Fail when two renders differ.
- [x] Preserve stable file ordering.
- [x] Preserve stable JSON formatting.
- [x] Preserve stable Markdown section ordering.

## Phase 3: platform adapters

### Codex

- [x] Implement Codex `detect`.
- [x] Implement Codex `capabilities`.
- [x] Render `AGENTS.md`.
- [x] Render Codex agents/subagents.
- [x] Render Codex skills.
- [x] Render Codex hooks.
- [x] Render Codex config.
- [x] Validate Codex config against upstream schema.
- [x] Enforce `features.fast_mode = false`.
- [x] Enforce `features.unified_exec = false`.
- [x] Enforce root `unified_exec = false`.
- [x] Enforce `features.multi_agent = false`.
- [x] Enforce `features.multi_agent_v2 = true`.
- [x] Enforce Codex subscription profile.
- [x] Implement `oal doctor hooks codex`.

### Claude Code

- [x] Implement Claude Code `detect`.
- [x] Implement Claude Code `capabilities`.
- [x] Render `CLAUDE.md`.
- [x] Render `.claude/agents/*.md`.
- [ ] Render Claude Code skills.
- [ ] Render Claude Code custom commands.
- [x] Render Claude Code hooks.
- [x] Render Claude Code settings.
- [x] Validate Claude Code settings against SchemaStore schema.
- [x] Enforce `disableAllHooks = false`.
- [x] Enforce `fastMode = false`.
- [x] Enforce `fastModePerSessionOptIn = false`.
- [x] Enforce Claude Code subscription profile.
- [x] Implement `oal doctor hooks claude`.

### OpenCode

- [ ] Implement OpenCode `detect`.
- [ ] Implement OpenCode `capabilities`.
- [ ] Render OpenCode agents.
- [ ] Render OpenCode skills.
- [ ] Render OpenCode commands.
- [ ] Render OpenCode permissions.
- [ ] Render OpenCode MCP config.
- [ ] Render OpenCode config.
- [ ] Validate OpenCode config against upstream schema.
- [ ] Enforce Greek-gods `default_agent`.
- [ ] Enforce OpenCode free fallback model set.
- [ ] Implement `oal doctor hooks opencode`.

### Additional adapters

- [ ] Implement Kilo adapter.
- [ ] Render Kilo rules.
- [ ] Render Kilo workflows.
- [ ] Render Kilo modes/agents where supported.
- [ ] Render Kilo MCP config.
- [ ] Implement Windsurf adapter.
- [ ] Render Windsurf rules.
- [ ] Render Windsurf workflows.
- [ ] Render Windsurf MCP config.
- [ ] Keep Windsurf learned memories user-owned.
- [ ] Implement Cline adapter.
- [ ] Render Cline rules.
- [ ] Render Cline workflows.
- [ ] Render Cline hooks.
- [ ] Render Cline ignore config where sourced.
- [ ] Implement Gemini CLI adapter.
- [ ] Render `GEMINI.md`.
- [ ] Render Gemini extension/config surfaces where supported.
- [ ] Implement Cursor adapter.
- [ ] Render `.cursor/rules/*.mdc`.
- [ ] Render Cursor MCP config where supported.

## Phase 4: hook engine

### Hook source

- [x] Implement category-first hook schema.
- [x] Implement platform event maps.
- [x] Require unsupported-platform reasons.
- [x] Require hook id prefix to match category.
- [x] Require input adapter per supported platform event.
- [x] Require output adapter per supported platform event.
- [x] Treat hook JSON as OAL policy records, not platform runtime hook files.
- [x] Require command/script/plugin hook runtime paths to exist.

### Required hooks

- [x] Implement `tool-pre-shell-rtk`.
- [ ] Implement `tool-pre-destructive-command`.
- [ ] Implement `tool-post-write-quality`.
- [ ] Implement `tool-fail-circuit`.
- [ ] Implement `prompt-submit-contract`.
- [ ] Implement `session-start-env`.
- [ ] Implement `agent-start-route-context`.
- [ ] Implement `compact-pre-budget`.

### Hook doctors

- [x] `oal doctor hooks codex` checks Codex mapping.
- [x] `oal doctor hooks claude` checks Claude Code mapping.
- [ ] `oal doctor hooks opencode` checks OpenCode mapping.
- [x] Hook doctor names unsupported events explicitly.
- [x] Hook doctor rejects fake parity.

## Phase 5: provider sync

### Required providers

- [ ] Sync `caveman` exact upstream.
- [ ] Clone `caveman` upstream when missing.
- [ ] Fetch `caveman` upstream when present.
- [ ] Record `caveman` commit SHA.
- [ ] Configure `caveman` overlay.
- [ ] Configure `rtk` external binary provider.
- [ ] Clone `rtk` upstream for provenance when missing.
- [ ] Fetch `rtk` upstream for provenance when present.
- [ ] Record `rtk` commit SHA.
- [ ] Probe `rtk --version`.
- [ ] Probe `rtk gain`.
- [ ] Probe `rtk rewrite <command>`.
- [ ] Extract `bmad-method` from upstream.
- [ ] Clone `bmad-method` upstream when missing.
- [ ] Fetch `bmad-method` upstream when present.
- [ ] Record `bmad-method` commit SHA.
- [ ] Record extracted upstream paths.
- [ ] Configure `bmad-method` overlay.
- [ ] Sync `taste-skill` exact upstream.
- [ ] Clone `taste-skill` upstream when missing.
- [ ] Fetch `taste-skill` upstream when present.
- [ ] Record `taste-skill` commit SHA.
- [ ] Configure `taste-skill` overlay.

### Optional providers

- [ ] Probe Context7 CLI through `context7 --version`.
- [ ] Probe Context7 CLI through `ctx7 --version`.
- [ ] Keep Context7 CLI optional and non-MCP.
- [ ] Probe Playwright CLI.
- [ ] Keep Playwright CLI optional and non-MCP.
- [ ] Probe DeepWiki CLI.
- [ ] Keep DeepWiki optional.

### Provider validation

- [ ] Required providers sync or report exact blocker.
- [ ] Dirty upstream checkout blocks sync with exact path.
- [ ] Upstream content and overlay content stay separate.
- [ ] Sync never mutates overlay directory.
- [ ] Provider provenance appears in generated explain map.
- [ ] Provider sync dry-run works without mutating upstream cache.
- [ ] `oal provider sync --all` runs required providers in deterministic order.

## Phase 6: installer

### Host detection

- [ ] Detect macOS.
- [ ] Detect Linux.
- [ ] Detect Homebrew on macOS.
- [ ] Install Homebrew only when missing and user allowed install.
- [ ] Detect apt.
- [ ] Detect dnf.
- [ ] Detect pacman.
- [ ] Detect apk.
- [ ] Detect zypper.

### Tool install planner

- [ ] Require Bun.
- [ ] Install Bun through Homebrew on macOS.
- [ ] Install Bun through upstream script on Linux.
- [ ] Use Node only when upstream CLI requires Node.
- [ ] Use Rust only when upstream provider build path requires Rust.
- [ ] Install RTK through upstream path.
- [ ] Install required search/JSON tools through host package manager.
- [ ] Keep optional tools non-blocking unless requested.

### Managed install

- [ ] Install generated platform files.
- [ ] Preserve unmanaged user files.
- [ ] Merge user config safely.
- [ ] Fail with exact path when merge unsafe.
- [ ] Write managed manifest.
- [ ] Support uninstall of managed files only.

## Phase 7: checks

### `oal check`

- [x] Run local schema checks.
- [x] Run upstream schema hash checks.
- [x] Run generated config schema checks.
- [x] Run OAL config policy checks.
- [x] Run render idempotency check.
- [ ] Run stale branding check.
- [ ] Run banned wording check.
- [ ] Run source citation check for research docs.
- [x] Run useful CLI tool/source consistency check.
- [ ] Run provider sync dry-run.

### Failure quality

- [x] Error names platform.
- [x] Error names generated file.
- [x] Error names source file.
- [x] Error names JSON path.
- [x] Error names bad value.
- [x] Error names required value.
- [x] Error avoids generic “validation failed” wording.

## Phase 8: install smoke

### Fixtures

- [ ] Add macOS smoke fixture.
- [ ] Add Linux apt smoke fixture.
- [ ] Add Linux dnf smoke fixture.
- [ ] Add Linux pacman smoke fixture.
- [ ] Add Linux apk smoke fixture.
- [ ] Add Linux zypper smoke fixture.
- [ ] Add Codex fixture.
- [ ] Add Claude Code fixture.
- [ ] Add OpenCode fixture.

### Smoke commands

- [ ] `oal install` renders and installs managed files.
- [x] `oal doctor tools` checks required tools.
- [ ] `oal doctor hooks codex` passes with Codex fixture.
- [ ] `oal doctor hooks claude` passes with Claude Code fixture.
- [ ] `oal doctor hooks opencode` passes with OpenCode fixture.
- [ ] `oal check` passes after install.

## Phase 9: acceptance gate

- [ ] No old branding in active source, docs, specs, plans, scripts.
- [ ] No invented authority domains.
- [ ] No command aliases.
- [ ] No unavailable model ids.
- [ ] No fake hook parity.
- [ ] No generated output treated as source.
- [ ] No bundled RTK.
- [ ] No Rust runtime path.
- [ ] No Go runtime path.
- [ ] Greek-gods agent names preserved across all supported platforms.
- [ ] Codex `plus` default profile works.
- [ ] Codex `pro-5` profile works.
- [ ] Codex `pro-20` profile works.
- [ ] Claude Code `max-5` profile works.
- [ ] Claude Code `max-20` profile works.
- [ ] Claude Code `plus` profile fails.
- [ ] Required providers sync cleanly.
- [ ] Optional providers skip cleanly when missing.
