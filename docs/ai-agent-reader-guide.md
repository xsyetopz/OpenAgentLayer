# AI agent reader guide

Purpose: tell future AI agents how to read this corpus.

Authority: operating guide.

## Authority order

1. `specs/`
2. `plans/`
3. `docs/`
4. raw external captures
5. v3 source study

If a spec and doc disagree, follow the spec.

## Reading flow

For architecture work:

1. Read `specs/openagentlayer-v4.md`.
2. Read the specific spec for the subsystem.
3. Read `plans/v4-master-roadmap.md`.
4. Read v3 study only if the plan asks for evidence.

For implementation:

1. Read the target spec.
2. Read validation requirements.
3. Inspect current code.
4. Edit source, not generated output.
5. Run validation.

For docs:

1. Preserve authority boundaries.
2. Link to specs for normative behavior.
3. Cite paths for evidence.
4. Do not move anecdotes into specs without concrete translation.

## Status markers

- `[ ] Queued`: not started.
- `[~] Active`: under work.
- `[x] Sealed`: complete and evidence-linked.

