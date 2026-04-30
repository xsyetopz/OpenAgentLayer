# v4 validation plan

Purpose: validation gates for docs now and implementation later.

Authority: Atalanta execution plan.

## Documentation validation

- [x] Sealed — Run root `rtk --ultra-compact err bun run biome:check`; docs are ignored by Biome and audited by source validation.
- [x] Sealed — Confirm every `specs/*.md` links to `specs/openagentlayer-v4.md`.
- [x] Sealed — Confirm every v3 doc cites `v3_to_be_removed/...`.
- [x] Sealed — Confirm `specs/` does not define old implementation behavior.
- [x] Sealed — Confirm status marker spellings are consistent.

## Source validation

- [x] Sealed — Validate source graph IDs are unique.
- [x] Sealed — Validate records have body files.
- [x] Sealed — Validate route kinds are known.
- [x] Sealed — Validate surface keys are known.
- [x] Sealed — Validate model IDs are managed.

## Render validation

- [x] Sealed — Render to temporary output.
- [x] Sealed — Render again and assert no drift.
- [x] Sealed — Validate each adapter emits required files.
- [x] Sealed — Validate generated configs parse.
- [x] Sealed — Validate generated hook scripts execute on synthetic payloads.

## Install validation

- [x] Sealed — Install to temp home.
- [x] Sealed — Verify manifest.
- [x] Sealed — Verify managed blocks.
- [x] Sealed — Verify edited managed config keeps manifest and returns uninstall issue.
- [x] Sealed — Verify `--surface all` preflights config conflicts before writing.
- [x] Sealed — Uninstall from temp home.
- [x] Sealed — Verify no managed files remain.
