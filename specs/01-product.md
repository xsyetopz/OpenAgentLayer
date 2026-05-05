# Product Contract

OpenAgentLayer is a source-driven product compiler for agentic coding
environments. It loads authored OAL records, renders provider-native artifacts,
deploys them into project or global targets, records ownership, removes only
owned material, and validates the result through acceptance fixtures.

Supported providers are Codex, Claude Code, and OpenCode.

## Product Definition

OAL consists of these product surfaces:

- an authored source graph under `source/`
- provider renderers in `packages/adapter`
- artifact metadata in `packages/artifact`
- deploy, update, backup, manifest, and uninstall behavior in
  `packages/deploy` and `packages/manifest`
- executable hook runtimes in `packages/runtime`
- provider plugin payload sync in `packages/plugins`
- shared inspection in `packages/inspect`
- command-line orchestration and MCP servers in `packages/cli`
- product acceptance in `packages/accept`
- human documentation in `docs/`
- formal specifications in `specs/`

OAL is not complete when only one of these surfaces works. A change that affects
provider output, install behavior, hooks, plugin payloads, MCP tools, or release
metadata MUST update the owning package and the corresponding acceptance
evidence.

## Required Behavior

OAL MUST:

1. load all authored source records through `packages/source`
2. validate product, provider, model, route, hook, skill, support-file, and
   prompt policy before rendering
3. render real provider-native artifacts for Codex, Claude Code, and OpenCode
4. report unsupported provider capabilities explicitly instead of emitting fake
   placeholders
5. keep generated artifacts disposable and reproducible from source records
6. preserve user-owned files, marked blocks, and structured config during deploy
7. record every OAL-owned file, block, and structured key in a manifest entry
8. uninstall only manifest-owned material
9. execute hook and tool fixtures in acceptance
10. validate generated provider configs where a parser or schema exists
11. expose shared inspection through `oal inspect`, OpenCode tools, and
    `oal mcp serve oal-inspect`
12. provide OAL-owned MCP servers for Anthropic Docs and OpenCode Docs
13. keep CLI and hook messages actionable, compiler-like, and free of terminal
    periods in normal status, error, warning, note, and fix-it output
14. keep release metadata, changelog entries, package versions, Homebrew cask
    metadata, tests, and acceptance fixtures in agreement

## Non-Goals

OAL MUST NOT become:

- a prompt-card repository without executable product behavior
- a fake common abstraction that hides provider-native differences
- a demo scaffold whose generated files are shallow placeholders
- a docs-only product where specs describe behavior absent from code
- a schema collection disconnected from renderer, deploy, and acceptance paths
- an installer that mutates user configuration without manifest ownership
- a hook bundle that relies on prose instead of executable runtime decisions

## Product Invariants

The following invariants are global:

- source records are intent
- artifacts are rendered output
- manifests are installed ownership
- plugin payloads are provider packaging
- MCP servers are runtime tools exposed over stdio
- hooks are runtime policy
- acceptance is a product simulation

These concepts MUST remain separate in code and documentation. A package MAY
consume another package's public API, but it MUST NOT duplicate that package's
owned behavior.

## Source Truth

Implementation work MUST cite at least one controlling source before changing
behavior:

- current production code
- authored source records under `source/`
- provider docs, schemas, or generated config constraints
- generated artifact fixtures
- acceptance tests or runtime hook tests
- exact user-provided source snippets

When source truth is missing, unreadable, ambiguous, or contradictory, the
correct result is a blocked report with attempted work, evidence inspected, and
the specific input needed.

## Provider-Native Requirement

OAL shares intent, not output shape. Provider renderers MUST map source records
to the richest stable native surface for each provider:

- Codex receives Codex TOML, `AGENTS.md`, Codex skills, hooks, runtime files,
  and Codex plugin payloads
- Claude Code receives settings JSON, Markdown agents, skills, commands,
  `CLAUDE.md`, hook scripts, and plugin payloads
- OpenCode receives JSONC config, Markdown agents and commands, TypeScript
  tools, instructions, plugin code, hooks, and MCP config entries

If a provider does not expose a capability, OAL MUST either omit it or report an
unsupported capability with provider, capability, and reason.

## Release Identity

Each release MUST have one coherent identity:

- `source/product.json` version
- package metadata where applicable
- changelog section
- Homebrew cask metadata when release packaging changes
- acceptance release witness

Acceptance MUST detect mismatches that would allow a release to ship with stale
or contradictory metadata.
