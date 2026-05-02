# OpenCode `opencode.json/jsonc`, Tools, Plugins, and Commands Research for OAL

Sources studied:

- OpenCode config docs.
- OpenCode permissions/tools docs.
- OpenCode custom tools docs.
- OpenCode plugin docs.
- OpenCode agents docs.

## Native OpenCode surfaces OAL should render

OpenCode is not a Codex or Claude clone. OAL must render OpenCode-native artifacts:

- `opencode.json` or `opencode.jsonc`.
- `.opencode/agents/*.md` and/or config `agent` records.
- `.opencode/commands/*.md` and/or config `command` records.
- `.opencode/tools/*.ts` or `.js` custom tools.
- `.opencode/plugins/*.ts` or package plugin references.
- `.opencode/skills/*/SKILL.md` where skill support is used.
- instructions files referenced by `instructions`.
- `permission` policy.
- `mcp` servers where useful.
- model/provider fields.
- config entries for `default_agent`, `small_model`, compaction, snapshot, formatter, watcher.

## Config file locations and merging

OpenCode supports JSON and JSONC. Config files are merged, not replaced. Relevant locations include:

- global: `~/.config/opencode/opencode.json` or `.jsonc`
- project: `opencode.json` / `opencode.jsonc`
- `.opencode` directory content
- `OPENCODE_CONFIG`
- `OPENCODE_CONFIG_DIR`
- managed settings at highest precedence

OAL should use project config for project installs and global config for explicit user installs. It must preserve user-owned keys and track OAL-owned writes/merges in a manifest.

## Config keys OAL should use

Use:

- `$schema`
- `provider`
- `model`
- `small_model`
- `agent`
- `default_agent`
- `command`
- `permission`
- `plugin`
- `mcp`
- `instructions`
- `compaction`
- `formatter`
- `snapshot`
- `watcher`
- `autoupdate` only if user/installer policy chooses it.

Avoid:

- deprecated `tools` boolean config when `permission` is the current tool-control mechanism.
- putting TUI settings such as keybind/theme in `opencode.json` when docs say to use `tui.json`.
- fake provider parity keys that OpenCode does not support.

## Agents

OpenCode distinguishes primary agents and subagents. `default_agent` must be a primary agent; invalid subagent defaults fall back to built-in behavior. OAL must render this correctly.

OAL mapping to exploit available surface area:

- primary agents: build, plan, plus OAL primary agents only if they are intended to own normal sessions.
- subagents: explore, review, test, trace, docs, safety, integration, performance, etc.

Each OpenCode agent should include:

- description with routing triggers.
- model in `provider/model` format when needed.
- permission overrides.
- prompt/instructions body.
- distinction between primary and subagent behavior.

Do not render shallow role cards that only say `Purpose`, `Triggers`, and `Workflow`.

## Commands

OpenCode supports config `command` entries and command markdown files in command directories. OAL commands should be provider-native and actionable:

- template with `$ARGUMENTS` only where useful.
- description.
- owning agent.
- model override when useful.
- permission expectations.
- validation/completion contract.

A command like `Output: Decision and rationale` is not enough. Commands must guide the model through the actual route behavior and validation requirements.

## Permissions and built-in tools

Current OpenCode tool control uses `permission` values such as `allow`, `ask`, and `deny`. Relevant built-in tools include:

- `bash`
- `edit`
- `write` behavior controlled by edit/write semantics depending docs version
- `read`
- `grep`
- `glob`
- `list`
- `lsp`
- `task`
- `skill`
- `todoread` / `todowrite`
- `webfetch`
- `websearch`
- `apply_patch` in current docs; older docs may reference `patch`
- `question`
- MCP-prefixed tools

OAL should render permissions per route and per agent:

- readonly agents: deny edit/write/bash unless command needs safe bash.
- test agents: ask/allow bash for test commands, deny edit unless fixture/test writes are explicitly part of route.
- implementation agents: allow edit/write; ask for bash; deny destructive shell.
- review agents: read/search/lsp/web as needed, no edit.
- tools/plugins may add namespaced permissions.

## Custom tools

OpenCode custom tools are TypeScript or JavaScript files. They can execute arbitrary scripts in any language, but the tool definition is TS/JS. Locations:

- project `.opencode/tools/`
- global `~/.config/opencode/tools/`

Tools use the `tool()` helper from `@opencode-ai/plugin`. Filename controls tool name. Named exports become `<filename>_<exportname>`. Tool context can include agent, session ID, message ID, directory, and worktree.

OAL should use custom tools for things that are productively better than prompt text, such as:

- repo map tool
- changed files tool
- generated artifact diff tool
- manifest inspection tool
- route state tool
- hook fixture runner
- model policy explanation tool
- project command discovery tool

A tool is invalid if it is only listed in metadata and cannot be invoked by OpenCode.

## Plugins and events

OpenCode plugins extend the runtime with tools, hooks, and integrations. Plugin files can live in `.opencode/plugins/` or global plugin dirs, or be loaded from npm via the `plugin` config key.

Observed OpenCode plugin/event surface includes:

- `command.executed`
- `file.edited`
- `file.watcher.updated`
- `installation.updated`
- `lsp.client.diagnostics`
- `lsp.updated`
- `message.part.removed`
- `message.part.updated`
- `message.removed`
- `message.updated`
- `permission.asked`
- `permission.replied`
- `server.connected`
- `session.created`
- `session.compacted`
- `session.deleted`
- `session.diff`
- `session.error`
- `session.idle`
- `session.status`
- `session.updated`
- `todo.updated`
- `shell.env`
- `tool.execute.before`
- `tool.execute.after`
- `tui.prompt.append`
- `tui.command.execute`
- `tui.toast.show`

OAL plugins should provide real runtime behavior, not descriptive policy files. Useful OpenCode plugin behaviors:

- block `.env` reads/edits.
- inject route context for `task` subagents.
- run completion gate on `session.idle` or relevant message/session events.
- inspect `tool.execute.before` for destructive commands.
- inspect `tool.execute.after` for failures or generated drift.
- add shell env context.
- append TUI prompts only where user-visible UX is intentional.

For `tool.execute.before/after` plugin hooks, check the installed tool name. Current docs mention `apply_patch`; older docs mention `patch`. OAL should use the installed version’s supported tool name and validate it.

## OAL OpenCode rendering outputs

Project install should render:

```text
opencode.jsonc or structured merge into opencode.json/jsonc
.opencode/agents/*.md
.opencode/commands/*.md
.opencode/tools/*.ts
.opencode/plugins/openagentlayer.ts
.opencode/skills/*/SKILL.md
.opencode/instructions/*.md
.oal/manifest/opencode-project.json
```

Global install should render analogous `~/.config/opencode` paths only by explicit user choice.
