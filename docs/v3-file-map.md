# v3 file map

Purpose: v3 inventory for future agents.

Authority: research map only.

## Source

- `v3_to_be_removed/source/agents/` — agent metadata and prompts.
- `v3_to_be_removed/source/skills/` — skill metadata and bodies.
- `v3_to_be_removed/source/commands/` — platform command catalogs.
- `v3_to_be_removed/source/hooks/policies/` — hook policy source records.
- `v3_to_be_removed/source/guidance/` — generated project instruction bodies.
- `v3_to_be_removed/source/shared/` — shared prompt contract text.
- `v3_to_be_removed/source/catalog/` — source loaders and catalog aggregation.

## Render and build

- `v3_to_be_removed/scripts/generate.mjs` — main generator.
- `v3_to_be_removed/scripts/build.mjs` — build output orchestration.
- `v3_to_be_removed/scripts/check-generated.mjs` — generated drift check.
- `v3_to_be_removed/scripts/generate/render/` — specialized render helpers.

## Install

- `v3_to_be_removed/scripts/install/cli.mjs` — install CLI.
- `v3_to_be_removed/scripts/install/managed-files.mjs` — config and managed file merge helpers.
- `v3_to_be_removed/scripts/install/shared.mjs` — paths, filesystem helpers, runtime utilities.
- `v3_to_be_removed/scripts/install/uninstall-cli.mjs` — uninstall path.

## Surfaces

- `v3_to_be_removed/claude/` — Claude generated surface and tests.
- `v3_to_be_removed/codex/` — Codex generated surface and tests.
- `v3_to_be_removed/opencode/` — OpenCode TypeScript package and templates.
- `v3_to_be_removed/copilot/` — Copilot generated assets.
- `v3_to_be_removed/optional-ides/` — optional IDE rule assets.

## Tests

- `v3_to_be_removed/tests/` — repo-level generated artifact and policy tests.
- `v3_to_be_removed/claude/tests/` — Claude hook tests.
- `v3_to_be_removed/codex/tests/` — Codex hook/wrapper tests.
- `v3_to_be_removed/opencode/src/*.test.ts` — OpenCode package tests.

