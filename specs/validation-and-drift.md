# Validation and drift

Purpose: prevent source, render, install, and doc drift.

Authority: normative.

## Source validation

- duplicate ID detection;
- missing file detection;
- unknown surface detection;
- unknown route contract detection;
- unknown policy category detection;
- invalid model detection;
- invalid status marker detection in plan docs.

## Render validation

- deterministic render;
- generated output parses;
- adapter bundle has required files;
- unsupported surface capabilities are reported;
- no generated file depends on source checkout paths after install.

## Runtime validation

- synthetic hook payload tests;
- command guard tests;
- completion gate tests;
- context injection tests;
- manifest install/uninstall tests.

## Documentation validation

- specs link to top-level spec;
- research docs cite concrete evidence paths;
- external-source synthesis labels anecdotes;
- plans use status markers consistently.

Documentation validation is executable through source graph validation. `oal check` and `bun run check:source` must report diagnostics for missing top-level spec links, missing v3 evidence paths, invalid plan status markers, and normative v3 implementation requirements in specs.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
