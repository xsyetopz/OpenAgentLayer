# ADR-0004: Rust Runtime, Data Specs, POSIX Bootstrap

## Status
Accepted

## Context

OAL must normalize shell commands, run hooks safely, compact output, track token savings, render native adapter artifacts, and validate install state. Those jobs need deterministic command parsing, token accounting, and cross-platform process behavior.

Native Windows support created extra code paths without improving the primary macOS/Linux agent loop. OAL should target the environments where Codex/OpenCode automation is strongest: macOS and Linux, including Windows through WSL2.

## Decision

Use this split:

- Rust: shipped runtime, CLI, runner, hook engine, command parser, output filters, validation, install/uninstall manifests.
- TOML/JSON: canonical specs for models, routes, adapters, permissions, hook policies, install targets.
- Markdown: ADRs, platform research, architecture, roadmap, operating rules.
- POSIX shell: thin bootstrap only.

Do not ship Go, Python, MJS, or TypeScript runtime components in v4. They can be used for one-off local research only when not installed as OAL.

## Consequences

Easier:

- one portable binary for macOS/Linux
- stronger process control
- schema-first adapter output
- fast output compaction
- lower hook dependency risk

Harder:

- Rust implementation cost is higher upfront
- native package distribution must be solved
- adapters need explicit serialization tests
