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
- generic recovered command scaffold detection;
- active skill metadata that cites `v3-evidence` as source-package detection;
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

Runtime parity validation also covers source-policy drift:

- every source policy id must resolve to a separate generated runtime script;
- every source policy surface mapping must evaluate through a synthetic payload;
- every source policy must compare router output against the rendered `.mjs`
  script output for a representative payload;
- async runtime policies must be exposed through async router APIs;
- generated runtime scripts must emit normalized decision JSON and exit nonzero
  only for `deny`.
- unsupported runtime policy ids must return the stable
  `unsupported-runtime-policy` decision identity with requested policy context,
  not a generic unknown-policy fallback.

Model and provider-default validation covers shortcut removal:

- missing surface model plans are adapter diagnostics;
- missing role assignments inside selected model plans are adapter diagnostics;
- generated Codex profiles come only from source model-plan records;
- OpenCode default agent selection comes only from source agent `primary`
  metadata and requires exactly one OpenCode-capable primary agent.

## Documentation validation

- specs link to top-level spec;
- research docs cite concrete evidence paths;
- external-source synthesis labels anecdotes;
- plans use status markers consistently.

Documentation validation is executable through source graph validation. `oal check` and `bun run check:source` must report diagnostics for missing top-level spec links, missing v3 evidence paths, invalid plan status markers, and normative v3 implementation requirements in specs.

Capability recovery validation must prevent v4 from becoming narrower than v3:

- command and skill coverage must be tracked against `docs/v3-capability-recovery-matrix.md`;
- recovered capabilities must render to all supported provider surfaces;
- v3 behavior may be used as evidence, but v4 source records remain authoritative.
- recovered hook policies must compare router decisions against rendered `.mjs` scripts for representative payloads.

Native-surface completeness validation covers the active source graph:

- every surface-capable agent, command, skill, policy, and support file must
  render to each declared provider-native directory shape;
- rendered policy metadata must be parseable and tied to the same source policy
  id, hook category, and provider surface;
- rendered source artifacts must carry source record ownership for install
  manifests;
- headless e2e scripts must probe real binary/model/auth availability before
  scenario execution and must inspect concrete generated native files.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
