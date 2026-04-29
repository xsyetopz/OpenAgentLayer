# Platform surface study

## Adapter principle

OAL renders native surfaces. `AGENTS.md` is useful cross-tool anchor, but it is not enough. Each platform gets the surfaces it actually supports.

## Codex

Sources:

- <https://developers.openai.com/codex/config-reference>
- <https://developers.openai.com/codex/hooks>
- <https://developers.openai.com/codex/skills>
- <https://developers.openai.com/codex/subagents>
- <https://github.com/openai/codex>

Native surfaces:

- `AGENTS.md`
- skills
- subagents
- config
- hooks
- MCP/connectors where supported

OAL adapter:

- render `AGENTS.md` as primary instruction anchor
- render Greek-gods subagents in native Codex shape
- render skills from source/provider records
- render hook policy records into inline Codex `[hooks]` config plus repo-local `.codex/hooks/*.mjs` command scripts
- render model routes only inside allowed Codex model set

Codex priorities:

- source-backed instructions
- strict model set
- hook checks through `oal doctor hooks codex`
- hook JSON stays OAL policy source; Codex runtime output stays native TOML/script shape
- no unavailable model ids

## Claude Code

Sources:

- <https://docs.claude.com/en/docs/claude-code/overview>
- <https://docs.claude.com/en/docs/claude-code/memory>
- <https://docs.claude.com/en/docs/claude-code/hooks>
- <https://docs.claude.com/en/docs/claude-code/sub-agents>
- <https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview>
- <https://github.com/xsyetopz/claude-code-sourcemap>

Native surfaces:

- `CLAUDE.md`
- memory files
- `.claude/agents/*.md`
- skills
- custom commands
- hooks
- settings
- MCP

OAL adapter:

- render `CLAUDE.md` as Claude-native wrapper around shared project rules
- render Greek-gods subagents into `.claude/agents`
- render skills and commands using Claude Code shapes
- render hook policy records into `.claude/settings.json` hooks plus repo-local `.claude/hooks/*.mjs` command scripts
- run `oal doctor hooks claude`

Claude priorities:

- keep subagent names canonical
- use native hook events
- hook JSON stays OAL policy source; Claude runtime output stays native settings/script shape
- do not copy Codex config concepts into Claude settings

## OpenCode

Sources:

- <https://opencode.ai/docs/>
- <https://opencode.ai/docs/config/>
- <https://opencode.ai/docs/models/>
- <https://opencode.ai/docs/agents/>
- <https://opencode.ai/docs/skills/>
- <https://opencode.ai/docs/zen>
- <https://github.com/anomalyco/opencode>

Native surfaces:

- config
- agents
- skills
- commands
- permissions
- MCP servers
- plugins

OAL adapter:

- render Greek-gods agents into OpenCode agent config
- render commands into OpenCode command surface
- render skills into OpenCode skill surface
- render free fallback routes from source model
- run `oal doctor hooks opencode`

OpenCode priorities:

- free model route order stays source-controlled
- no Codex/Claude assumptions
- permissions and hooks stay native

## Kilo Code

Sources:

- <https://kilo.ai/docs/>
- <https://kilo.ai/docs/customize/rules>
- <https://kilo.ai/docs/customize/workflows>
- <https://kilo.ai/docs/features/mcp>
- <https://github.com/Kilo-Org/kilocode>
- <https://github.com/Kilo-Org/kilocode-legacy>

Native surfaces:

- rules
- workflows
- modes/agents
- skills where supported
- MCP configuration
- project config

OAL adapter:

- render OAL rules to Kilo rule surfaces
- render workflow intents to Kilo workflows
- render Greek-gods roles to Kilo modes/agents where supported
- render MCP config only through Kilo-supported config

Kilo priorities:

- native workflows, not command prose dumps
- explicit gaps for unsupported agent or hook features

## Windsurf

Sources:

- <https://windsurf.com/>
- <https://docs.windsurf.com/>
- <https://docs.windsurf.com/windsurf/cascade/memories>
- <https://docs.windsurf.com/windsurf/cascade/mcp>
- <https://docs.windsurf.com/windsurf/cascade/workflows>
- <https://docs.windsurf.com/windsurf/cascade/hooks>

Native surfaces:

- Cascade memories
- rules
- workflows
- MCP
- hooks where supported

OAL adapter:

- render rules to Windsurf rule surface
- render workflows to Cascade workflows
- render MCP entries using Windsurf format
- represent memories conservatively; do not overwrite user-learned memory

Windsurf priorities:

- distinguish generated rules from learned memories
- do not fake agent/subagent support if not native

## Cline

Sources:

- <https://docs.cline.bot/>
- <https://docs.cline.bot/customization/cline-rules>
- <https://docs.cline.bot/customization/workflows>
- <https://docs.cline.bot/features/hooks/hook-reference>
- <https://docs.cline.bot/customization/clineignore>

Native surfaces:

- Cline rules
- workflows
- hooks
- ignore file
- memory bank
- MCP

OAL adapter:

- render rules and workflows separately
- render hook policies only to documented hook events
- render ignore guidance only from explicit source records

Cline priorities:

- use hook reference as authority
- no undocumented pseudo-hooks

## Gemini CLI

Sources:

- <https://github.com/google-gemini/gemini-cli>
- <https://github.com/google-gemini/gemini-cli/tree/main/docs>
- <https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md>
- <https://github.com/google-gemini/gemini-cli/blob/main/docs/extensions/reference.md>

Native surfaces:

- `GEMINI.md`
- settings
- extensions
- commands
- hooks
- MCP/tools where supported

OAL adapter:

- render `GEMINI.md` from shared instruction model
- render extension package where supported
- keep Greek-gods roles in instruction/command layer unless native agents exist

Gemini priorities:

- respect `GEMINI.md` semantics
- keep extensions source-backed

## Cursor

Sources:

- <https://docs.cursor.com/>
- <https://docs.cursor.com/context/rules>
- <https://docs.cursor.com/en/context>

Native surfaces:

- `.cursor/rules/*.mdc`
- project/user rules
- context settings
- MCP configuration

OAL adapter:

- render Cursor rules as MDC files
- use rule metadata for always/manual/path-scoped behavior
- do not encode unsupported agent/subagent behavior as fake agents

Cursor priorities:

- rules are first-class
- agent concepts stay instruction-level unless platform exposes native agents

## Cross-platform matrix

| Platform    | Instructions | Agents               | Skills               | Commands/workflows  | Hooks                | MCP | Model routes      |
| ----------- | ------------ | -------------------- | -------------------- | ------------------- | -------------------- | --- | ----------------- |
| Codex       | yes          | yes                  | yes                  | limited/native      | yes                  | yes | yes               |
| Claude Code | yes          | yes                  | yes                  | yes                 | yes                  | yes | yes               |
| OpenCode    | yes          | yes                  | yes                  | yes                 | platform-specific    | yes | yes               |
| Kilo        | yes          | modes/agents         | yes                  | workflows           | platform-specific    | yes | platform-specific |
| Windsurf    | yes          | platform-specific    | platform-specific    | workflows           | yes where documented | yes | platform-specific |
| Cline       | yes          | platform-specific    | yes                  | workflows           | yes                  | yes | platform-specific |
| Gemini CLI  | yes          | platform-specific    | extensions           | commands/extensions | yes where documented | yes | platform-specific |
| Cursor      | rules        | no native OAL target | no native OAL target | rules/commands only | no OAL hook target   | yes | editor-managed    |

`platform-specific` means adapter must prove current native support before rendering.
