# Route contracts

Purpose: define route behavior gates.

Authority: normative.

## Route kinds

### readonly

Allowed:

- reading files;
- searching;
- explaining verified facts;
- producing plans;
- producing reviews;
- producing blockers.

Required:

- cite evidence when making codebase claims;
- avoid unverified runtime claims.

### edit-required

Allowed:

- production edits;
- tests;
- docs as supporting changes.

Required:

- make qualifying source changes unless blocked;
- report exact validation;
- reject explanation-only completion.

### execution-required

Allowed:

- test runs;
- builds;
- diagnostics;
- repro scripts.

Required:

- produce execution evidence unless blocked;
- include exact command and result.

## Contract fields

- `route_kind`
- `allow_blocked`
- `allow_docs_only`
- `allow_tests_only`
- `reject_prototype_scaffolding`
- `requires_validation`
- `requires_evidence`

## Completion gate behavior

Runtime completion gates inspect route state, changed paths, execution evidence, and final response text where the surface supports it.

## Links

- [OpenAgentLayer v4](openagentlayer-v4.md)
