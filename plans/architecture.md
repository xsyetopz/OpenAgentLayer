# OAL Architecture

## Goal

OAL makes existing coding agents better at code work by giving them a harness: native adapters, compact command output, hook-enforced task contracts, model routing, validation, and repository-local knowledge.

OAL is not a replacement agent. Codex, OpenCode, Claude Code, and similar tools still own model execution and UI. OAL owns the layer around them.

## Principles

- Small entry files, deeper source docs. `AGENTS.md` or native equivalent is a map, not a manual.
- Repository-local system of record. No hidden dashboard state required for correctness.
- Native platform surfaces over generic prompt dumps.
- Mechanical checks over reminders.
- Evidence over reassurance. Coding tasks must end with code/test/blocker evidence.
- macOS/Linux first. Windows via WSL2 only.

## Crate Shape

| Crate                  | Responsibility                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `oal-core`             | shared types, config loading, schemas, task contracts, model registry, adapter traits         |
| `oal-cli`              | `oal install`, `oal uninstall`, `oal render`, `oal check`, `oal doctor`, `oal hook`           |
| `oal-runner`           | command normalization, process execution, output filters, token accounting, RTK integration |
| `oal-adapter-codex`    | Codex config, AGENTS.md, hooks, skills, subagents, commands                                   |
| `oal-adapter-opencode` | OpenCode config, agents, skills, permissions, plugin-free workflow surfaces                   |
| `oal-testkit`          | golden renders, temp-home install fixtures, hook fixture payloads                             |

This can start as fewer crates if needed, but module boundaries must match the table before feature work expands.

## Source Model

Canonical input lives under future `source/` data files, not under generated adapter output.

Required source groups:

- `source/product`: name, version, support policy.
- `source/models`: model registry, route policy, fallback chains.
- `source/agents`: role contracts, allowed tools, escalation behavior.
- `source/skills`: skill metadata, lazy-load docs, platform mappings.
- `source/hooks`: task-contract rules, hook events, evidence checks.
- `source/platforms`: adapter feature flags and install paths.
- `source/checks`: smoke tests and fixture expectations.

## Data Flow

1. `oal render <platform>` reads canonical source data.
2. Adapter maps OAL concepts to platform-native artifacts.
3. `oal check <platform>` validates rendered artifacts against schemas and source references.
4. `oal install <platform>` writes a manifest and only managed files.
5. Platform hook calls `oal hook <platform> <event>`.
6. Hook engine loads task contract and event payload.
7. Runner executes shell-adjacent work through command policy and compact filters.
8. Stop hook validates evidence and emits pass/block with exact reason.

## Adapter Contract

Each adapter must declare:

- supported native surfaces
- unsupported surfaces
- generated paths
- uninstall paths
- config precedence assumptions
- hook event mapping
- model field mapping
- validation fixtures

Adapters must fail closed when required native support is missing. Example: Codex hook enforcement requires hook support and hook config enabled. OpenCode cannot claim Codex-equivalent hooks until the native/plugin path is proven.

## Install State

Install writes a manifest with:

- OAL version
- platform adapter version
- managed files and content hashes
- user-modified generated files
- detected tool versions
- OS mode: `macos`, `linux`, or `wsl2-linux`

Uninstall removes only manifest-owned files. It never removes arbitrary user files by pattern.

## Validation Levels

| Level       | Gate                                                |
| ----------- | --------------------------------------------------- |
| schema      | source data parses and validates                    |
| render      | generated artifacts match goldens                   |
| install     | temp-home install/uninstall leaves expected tree    |
| hook        | fixture payloads pass/block correctly               |
| runner      | command normalization and compaction match fixtures |
| integration | real Codex/OpenCode smoke when installed            |

## Non-Goals

- No Windows-native PowerShell path.
- No generic regex chatbot personality filter.
- No package-manager plugin install unless adapter explicitly opts in.
- No generated docs as source of truth.
