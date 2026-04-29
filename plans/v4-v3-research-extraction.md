# v3 research extraction plan

Purpose: extract useful decisions from `v3_to_be_removed/` without carrying forward old implementation behavior.

Authority: research plan. Normative v4 behavior belongs in `../specs/`.

## Extraction rules

- [x] Sealed — Treat `v3_to_be_removed/` as evidence.
- [x] Sealed — Copy concepts only after translating them into v4 source model language.
- [x] Sealed — Do not copy directory layout as a requirement.
- [x] Sealed — Do not copy names as requirements.

## Study targets

- [x] Sealed — Catalog loading: `v3_to_be_removed/source/catalog/loaders.mjs`
- [x] Sealed — Catalog aggregation: `v3_to_be_removed/source/catalog/items.mjs`
- [x] Sealed — Generator fan-out: `v3_to_be_removed/scripts/generate.mjs`
- [x] Sealed — Install merge/managed files: `v3_to_be_removed/scripts/install/managed-files.mjs`
- [x] Sealed — Install CLI orchestration: `v3_to_be_removed/scripts/install/cli.mjs`
- [x] Sealed — Hook policy records: `v3_to_be_removed/source/hooks/policies/*.json`
- [x] Sealed — Shared hook runtime: `v3_to_be_removed/claude/hooks/scripts/_lib.mjs`
- [x] Sealed — OpenCode plugin runtime: `v3_to_be_removed/scripts/generate/render/opencode-plugin.mjs`
- [x] Sealed — Generated artifact tests: `v3_to_be_removed/tests/generated-artifacts.test.mjs`

## Concept disposition

- [x] Sealed — Keep idea: one canonical source graph.
- [x] Sealed — Keep idea: native surface adapters.
- [x] Sealed — Keep idea: route contracts as behavior gates.
- [x] Sealed — Keep idea: runtime hooks as enforcement, not prose reminders.
- [x] Sealed — Keep idea: generated artifact validation.
- [x] Sealed — Redesign: command format becomes shared first, surface-specific second.
- [x] Sealed — Redesign: generator becomes package-based pipeline, not one god file.
- [x] Sealed — Redesign: hook policies become typed source records with reusable runtime.
- [x] Sealed — Redesign: docs become AI-agent-readable architecture corpus.

