# v4 validation plan

Purpose: validation gates for docs now and implementation later.

Authority: Atalanta execution plan.

## Documentation validation

- [ ] Queued — Run `rtk --ultra-compact bunx biome check plans specs docs --error-on-warnings --max-diagnostics 16384`.
- [ ] Queued — Confirm every `specs/*.md` links to `specs/openagentlayer-v4.md`.
- [ ] Queued — Confirm every v3 doc cites `v3_to_be_removed/...`.
- [ ] Queued — Confirm `specs/` does not define old implementation behavior.
- [ ] Queued — Confirm status marker spellings are consistent.

## Source validation

- [ ] Queued — Validate source graph IDs are unique.
- [ ] Queued — Validate records have body files.
- [ ] Queued — Validate route kinds are known.
- [ ] Queued — Validate surface keys are known.
- [ ] Queued — Validate model IDs are managed.

## Render validation

- [ ] Queued — Render to temporary output.
- [ ] Queued — Render again and assert no drift.
- [ ] Queued — Validate each adapter emits required files.
- [ ] Queued — Validate generated configs parse.
- [ ] Queued — Validate generated hook scripts execute on synthetic payloads.

## Install validation

- [ ] Queued — Install to temp home.
- [ ] Queued — Verify manifest.
- [ ] Queued — Verify managed blocks.
- [ ] Queued — Uninstall from temp home.
- [ ] Queued — Verify no managed files remain.

