# Cross-Provider Surface Matrix

OAL should model capabilities, not assume identical provider surfaces. The source graph can be shared; rendered output must be provider-native.

## Artifact matrix

| OAL surface                 | Codex                                                                | Claude Code                       | OpenCode                                               |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| global/project instructions | `AGENTS.md`, `model_instructions_file`                               | `CLAUDE.md`, `.claude/CLAUDE.md`  | `instructions` array and `.opencode/instructions/*.md` |
| agents/subagents            | `[agents]`, role config files, custom agent TOML                     | `.claude/agents/*.md`             | `.opencode/agents/*.md` and config `agent`             |
| skills                      | plugin skills / `SKILL.md` where supported                           | skill directories with `SKILL.md` | `.opencode/skills/*/SKILL.md` where supported          |
| commands/routes             | wrapper modes, prompt routes, possible plugin commands               | slash commands                    | config `command` and `.opencode/commands/*.md`         |
| tools                       | built-in tools, app/connectors/MCP, no simple custom TS tool surface | Claude tools + MCP + plugins      | built-in tools, custom TS/JS tools, MCP, plugins       |
| hooks                       | config TOML or `hooks.json`, command hooks currently reliable        | rich settings hooks               | plugin event hooks, git hooks if installed by OAL      |
| config                      | `.codex/config.toml`                                                 | `.claude/settings.json`           | `opencode.json/jsonc`                                  |
| deploy ownership            | OAL manifest                                                         | OAL manifest                      | OAL manifest                                           |

## Product requirement

Each OAL source record must specify supported providers. If a provider lacks an equivalent surface, the renderer must either:

1. map to a provider-native alternative; or
2. mark the feature unsupported with a reason; or
3. omit the feature from that provider.

Do not fake support by emitting a meaningless stub.

## Example: subagent route context

Claude Code can use `SubagentStart`. OpenCode can map to `tool.execute.before` when the `task` tool starts a subagent. Codex does not expose a Claude-style `SubagentStart` in observed v3 evidence. Therefore OAL must render different provider policies rather than pretend all three have the same lifecycle event.

## Example: custom tools

OpenCode has direct custom tool files in `.opencode/tools/*.ts`. Claude and Codex should not receive fake “tools” with the same shape. For Claude/Codex, OAL can use skills/scripts, MCP, hooks, or commands where native support exists.

## Example: completion gates

- Codex: `Stop` command hook.
- Claude: `Stop` and `SubagentStop` hooks, potentially richer structured JSON.
- OpenCode: plugin events such as `session.idle`, `message.updated`, or `tool.execute.after`, depending desired behavior.

## Rule

One OAL policy can have multiple provider render strategies. The provider render strategy is part of the product. It is not an implementation detail to hide behind fake parity.
