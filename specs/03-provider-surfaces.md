# Provider Surfaces

OAL is shared at the intent layer and provider-native at the output layer.
Provider differences are product behavior, not accidental implementation detail.

## Provider Matrix

| Surface | Codex | Claude Code | OpenCode |
| --- | --- | --- | --- |
| Primary config | `.codex/config.toml` | `.claude/settings.json` | `opencode.jsonc` |
| Agents | `.codex/agents/*.toml` | `.claude/agents/*.md` | `.opencode/agents/*.md` plus config references |
| Skills | `.codex/openagentlayer/skills/*/SKILL.md` | `.claude/skills/*/SKILL.md` | `.opencode/skills/*/SKILL.md` when rendered or plugin-synced |
| Commands/routes | `AGENTS.md` route text | `.claude/commands/*.md` | `.opencode/commands/*.md` |
| Instructions | `AGENTS.md` | `CLAUDE.md` | `.opencode/instructions/openagentlayer.md` |
| Hooks | `.codex/openagentlayer/hooks/*.mjs` | `.claude/hooks/scripts/*.mjs` | `.opencode/openagentlayer/hooks/*.mjs` plus plugin mediation |
| Custom tools | no native OAL custom tool surface | no native OAL custom tool surface | `.opencode/tools/*.ts` |
| Plugin payload | Codex marketplace and cache roots | Claude marketplace and cache roots | OpenCode plugin and cache roots |
| MCP install | not currently OAL-managed config | provider CLI command for Anthropic Docs | OAL writes OpenCode MCP config |

## Shared Provider Rules

Every provider renderer MUST:

- filter source records by `providers`
- preserve source ids in artifact metadata
- render only capabilities with a real provider surface
- report unsupported capabilities with provider, capability, and reason
- preserve executable mode for runtime scripts
- keep generated artifacts reproducible from `source/`
- keep provider-native config parseable where possible

Renderers MUST NOT:

- emit placeholder support for missing provider features
- copy another provider's file shape to simulate parity
- hide provider limitations in generic prose
- place provider-specific behavior in shared helpers unless the behavior and
  output shape are actually shared

## Codex

Codex renderer ownership lives in `packages/adapter/src/codex.ts`.

### Codex Files

Codex output MAY include:

- `.codex/config.toml`
- `.codex/agents/*.toml`
- `.codex/openagentlayer/skills/*/SKILL.md`
- `.codex/openagentlayer/skills/*` support files
- `.codex/openagentlayer/hooks/*.mjs`
- `.codex/openagentlayer/runtime/*.mjs`
- `.codex/openagentlayer/privileged/*.mjs`
- `AGENTS.md`
- Codex plugin marketplace payload files

### Codex Config Contract

`.codex/config.toml` MUST contain only schema-supported keys accepted by current
Codex validation fixtures. Deprecated or invented keys MUST fail acceptance.

Codex model routing MUST use valid Codex effort values:

- `none`
- `low`
- `medium`
- `high`
- `xhigh`

`minimal` MUST NOT be emitted for Codex. Plan-mode effort and edit-mode model
effort are separate controls. A model plan MAY choose different values for lead,
implementation, review, and utility agents when the plan specification and
tests cover the choice.

### Codex Agent Contract

Codex agents MUST render as TOML files. Agent color values MUST NOT be emitted
when the Codex schema does not support them. Agent prompts MUST include OAL
source-backed contracts and route/skill references relevant to that agent.

### Codex Hooks

Codex hooks MUST render executable `.mjs` runtime files under the OAL-managed
Codex hook directory. Hook output MUST use Codex-compatible JSON envelopes for
pre-tool denies, stop-event blocks, and session context where supported.

### Codex Plugin Payload

Codex plugin sync MUST write:

- local plugin payload root
- versioned cache payload root
- marketplace entry under `.agents/plugins/marketplace.json`
- best-effort native marketplace activation when the Codex CLI exists

Missing Codex CLI MUST NOT block payload sync.

## Claude Code

Claude renderer ownership lives in `packages/adapter/src/claude.ts`.

### Claude Files

Claude output MAY include:

- `.claude/settings.json`
- `.claude/agents/*.md`
- `.claude/skills/*/SKILL.md`
- `.claude/skills/*` support files
- `.claude/commands/*.md`
- `.claude/hooks/scripts/*.mjs`
- `.claude/hooks/hooks.json` in plugin payloads
- `.claude/openagentlayer/privileged/*.mjs`
- `CLAUDE.md`
- Claude plugin marketplace and cache files

### Claude Settings Contract

`.claude/settings.json` MUST be valid JSON and MUST preserve user-owned settings
during structured config merge. Hook entries MUST map source hook records to
Claude event names declared in the hook record.

### Claude Agent and Command Contract

Claude agents MUST render as Markdown with provider-supported frontmatter.
Claude slash commands MUST render as Markdown command files. Route records MUST
map to command instructions where Claude exposes that surface.

### Claude Hooks

Claude supports richer lifecycle hooks than Codex. OAL MAY use Claude-specific
events when:

- source hook records declare the event
- runtime script exists
- fixture coverage proves the event output shape
- rendered settings or plugin hook files wire the event

Claude hook output MUST use Claude-compatible deny, block, and additional
context envelopes.

### Anthropic Docs MCP

`oal mcp serve anthropic-docs` is an OAL-owned MCP server. It is a standard MCP
server provided by OAL, not an external dependency. It exposes OAL-defined
Anthropic and Claude Code docs guidance. Claude registration MAY use:

```bash
claude mcp add oal-anthropic-docs --scope user -- oal mcp serve anthropic-docs
```

Setup MUST skip this provider-native registration when `claude` is absent.

## OpenCode

OpenCode renderer ownership lives in `packages/adapter/src/opencode.ts`.

### OpenCode Files

OpenCode output MAY include:

- `opencode.jsonc`
- `.opencode/agents/*.md`
- `.opencode/commands/*.md`
- `.opencode/tools/*.ts`
- `.opencode/plugins/openagentlayer.ts`
- `.opencode/instructions/openagentlayer.md`
- `.opencode/openagentlayer/hooks/*.mjs`
- `.opencode/openagentlayer/privileged/*.mjs`
- OpenCode plugin payload files
- OpenCode MCP config entries

### OpenCode Config Contract

`opencode.jsonc` MUST remain parseable as JSONC. OAL-managed MCP install for
OpenCode MUST write the `mcp` config object directly instead of relying on an
interactive `opencode mcp add` path.

### OpenCode Tool Contract

OpenCode custom tools MUST call shared OAL behavior where possible:

- inspect tools call `oal inspect`
- command policy tools call the same command-policy logic or shared CLI surface
- RTK report tools call shared RTK reporting guidance

Tool files MUST be TypeScript and provider-native. They MUST NOT duplicate large
renderer or inspect implementations.

### OpenCode Plugin Contract

OpenCode plugin payloads MUST include plugin code and rendered artifacts in the
provider plugin root and versioned cache root. Cache pruning MUST remove stale
OAL-owned version cache entries while preserving unrelated user material.

### OpenCode Docs and Inspect MCP

`oal mcp serve opencode-docs` and `oal mcp serve oal-inspect` are OAL-owned
standard MCP servers. OpenCode MCP install/remove is OAL-managed by writing
OpenCode config:

```bash
oal mcp install opencode-docs --provider opencode --scope global
oal mcp install oal-inspect --provider opencode --scope global
```

The generated config entry MUST use:

- `type: "local"`
- `command: ["oal", "mcp", "serve", server]`
- `enabled: true`

## Unsupported Capability Handling

Unsupported capability records MUST include:

- `provider`
- `capability`
- `reason`

Acceptance SHOULD assert known unsupported surfaces so the product does not
silently regress into fake support. Documentation MUST describe unsupported
provider behavior as a provider limitation or omitted surface, not as planned
current behavior.
