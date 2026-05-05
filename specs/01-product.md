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
4. report provider capability gaps explicitly with the supported provider path
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

## Product Focus

OAL is strongest when each surface stays connected to executable product
behavior:

- prompts are backed by rendered artifacts, hooks, tools, or acceptance checks
- shared source intent renders through provider-native adapters
- generated files contain substantial provider behavior
- specs describe behavior present in source, renderer, deploy, or acceptance
- schemas stay connected to renderer, deploy, and acceptance paths
- installers mutate only manifest-owned material
- hooks make executable runtime decisions

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
consume another package's public API, while the owner package remains the single
implementation source for that behavior.

## Source Truth

Implementation work MUST cite at least one controlling source before changing
behavior:

- current production code
- authored source records under `source/`
- provider docs, schemas, or generated config constraints
- generated artifact fixtures
- acceptance tests or runtime hook tests
- exact user-provided source snippets

When source truth needs more evidence, the correct result is a completion-ready
handoff with attempted work, evidence inspected, and the specific input needed.

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
capability-gap entry with provider, capability, and reason.

## Release Identity

Each release MUST have one coherent identity:

- `source/product.json` version
- package metadata where applicable
- changelog section
- Homebrew cask metadata when release packaging changes
- acceptance release witness

Acceptance MUST detect release metadata divergence and keep shipped metadata
current and coherent.
