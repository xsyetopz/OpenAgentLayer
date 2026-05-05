# OAL Provider Config, Tooling, Hooks, and Surface Research Pack

Purpose: provide source-backed implementation research for an OpenAgentLayer reboot that fully uses the supported provider surfaces of Codex, Claude Code, and OpenCode.

This pack is not a goal prompt. It is a product-surface research pack. It is meant to guide implementation of a real generator/deployer that emits working provider-native artifacts, not stub catalogs or toy prompt cards.

## Files

1. `01_CODEX_CONFIG_TOML_RESEARCH.md` — Codex `config.toml`, agents, profiles, features, hooks, skills, and what OAL should render.
2. `02_CLAUDE_SETTINGS_JSON_RESEARCH.md` — Claude Code `settings.json`, subagents, skills, slash commands, permissions, hooks, plugins.
3. `03_OPENCODE_CONFIG_TOOLS_PLUGINS_RESEARCH.md` — OpenCode `opencode.json/jsonc`, agents, commands, custom tools, plugins, permissions, hooks/events.
4. `04_CROSS_PROVIDER_SURFACE_MATRIX.md` — canonical surface matrix for agents, skills, commands, tools, hooks, configs, instructions.
5. `05_HOOK_CAPABILITY_MATRIX.md` — all supported hook/event types that matter for OAL and their provider-specific behavior.
6. `06_AGENT_SKILLS_COMMANDS_TOOLS_SPEC.md` — product standard for OAL agents/subagents, skills, commands/routes, OpenCode tools, plugins.
7. `07_CONFIG_KEYS_TO_USE_AVOID_REPLACE.md` — fields OAL should use, avoid, or replace because they are deprecated, no-op, or provider-local.
8. `08_OAL_RENDER_DEPLOY_MAPPING.md` — how the OAL generator/deployer should map source records to rendered provider artifacts.
9. `09_ACCEPTANCE_TEST_REQUIREMENTS.md` — product acceptance suite to prevent stubbed generated output.
10. `10_SOURCE_REFERENCES.md` — primary source URLs and observed evidence.
11. `11_CODEX_FEATURE_FLAGS_TESTED_PROFILE.md` — field-tested Codex native-capability profile and canonical/deprecated key handling.
12. `12_SURFACE_EXPLOITATION_POSTURE.md` — naming and product posture for using every stable provider surface OAL can back with real behavior.
13. `.codex/README.md` — how to use this research pack with a Codex worker without making it invent stubs.

## Capability-exploitation posture

The pack does not use “recommended” in the conservative-default sense. OAL’s config posture is: take advantage of every supported provider surface that improves the generated/deployed product, and disable only features that conflict with OAL-owned orchestration, wrappers, manifests, version control, or user workflow.

## Non-negotiable implementation interpretation

OAL must generate provider-native artifacts. A file is only useful if it is consumed by source loading, rendering, deployment, uninstall, runtime hooks, or validation. Provider capability differences must be represented explicitly; no fake parity layer.

baseline behavior is reference-only. The reboot must not mention `deprecated product wording`, `deprecated product wording`, or `OAL` in product code or generated end-user artifacts.

## Added user-researched Codex surface-exploitation profile

`11_CODEX_FEATURE_FLAGS_TESTED_PROFILE.md` records the researched Codex feature flags OAL should exploit in managed profiles, with corrections for `shell_snapshot` and `tools_view_image` placement.
