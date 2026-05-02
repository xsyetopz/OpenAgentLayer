# Claude Code `settings.json` Research for OAL

Sources studied:

- Claude Code settings docs.
- Claude Code hooks reference.
- SchemaStore `claude-code-settings.json`.
- Claude Code skills docs.
- Claude Code subagents docs.
- Claude Code slash commands docs.

## Native Claude Code surfaces OAL should render

Claude Code supports these OAL-relevant surfaces:

- `~/.claude/settings.json`, project `.claude/settings.json`, local `.claude/settings.local.json`, managed settings.
- `CLAUDE.md`, `.claude/CLAUDE.md`, `~/.claude/CLAUDE.md` memory/instruction files.
- subagents in `.claude/agents/*.md` and `~/.claude/agents/*.md`.
- skills as directories containing `SKILL.md` plus optional scripts/references/templates.
- slash commands as Markdown commands.
- hooks in settings JSON.
- plugins and marketplaces.
- permissions allow/deny/ask/default mode.
- environment variables.
- status line and UI settings where project-safe.
- model and effort controls.

## `settings.json` locations and merge model

Claude settings are hierarchical:

- user: `~/.claude/settings.json`
- project shared: `.claude/settings.json`
- project local: `.claude/settings.local.json`
- managed policy settings

OAL should prefer project shared settings for project behavior and user settings only for explicit user-scope installs. Local settings are personal and should not be generated except for local-only workflows with user consent.

OAL must preserve user-owned settings and track OAL-owned values in an install manifest.

## Model policy

OAL should only render these Claude models:

- `claude-opus-4-7` -- CC aliases this as `opus`
- `claude-opus-4-7[1m]` -- CC aliases this as `opus[1m]`
- `claude-sonnet-4-6` -- CC aliases this as `sonnet`
- `claude-haiku-4-5` -- CC aliases this as `haiku`

NOTE: `opusplan` is another "model" that essentially auto-switches `opus` in Plan mode, and `sonnet` in Edit mode.

Do not render:

- `blocked Claude model`
- `blocked Claude long-context model`
- stale baseline behavior `opusplan`/`opus[1m]` aliases unless the installed CLI explicitly needs aliases and the renderer maps them outside product source.

Avoid `[1m]` unless a route explicitly needs large-context behavior.

## Subagents

Claude Code subagents are Markdown files with frontmatter. OAL should generate subagents that are more than persona blurbs. Each must include:

- name
- description with exact trigger conditions
- tools
- model
- optional color/other supported metadata if verified
- operational prompt body
- explicit do-not-use boundaries
- output/validation contract

Project subagents override user subagents. OAL should render project subagents for project installs and user subagents only for global install mode.

## Skills

Claude Code skills are directories with `SKILL.md`. Skills may include:

- frontmatter `description`
- optional `allowed-tools`
- scripts
- templates
- references

OAL should generate skills as durable product assets. A skill must include operational instructions, examples where useful, and support files if the task depends on scripts or reference material. It is invalid for OAL to generate a two-line skill that merely names a concept.

Skill rendering must preserve provider-specific syntax and not rewrite code blocks, exact errors, commands, or config snippets through prose reducers.

## Slash commands

Claude slash commands can use arguments/placeholders, subdirectories/namespaces, bash integration, file references, and MCP commands. OAL should render slash commands for repeated user-invoked workflows, not for every internal route. Commands should:

- call a specific OAL route/agent behavior.
- state required input shape.
- name expected output.
- include safety/validation requirements.
- avoid duplicating the entire agent prompt when a subagent/skill owns the behavior.

## Permissions

Claude settings support `permissions` with allow/deny/ask/defaultMode patterns. OAL should render conservative project permissions:

- deny reading `.env`, private keys, credential files.
- deny destructive shell commands in the baseline.
- allow common read/search/test commands where project-safe.
- require ask for git push, rm, chmod/chown, package publish, deploy, secrets, network-sensitive actions.

Do not treat permissions as a substitute for hooks. Permissions reduce tool access; hooks provide contextual enforcement and completion gates.

## Hooks

Claude Code has a rich hook surface. OAL should take full advantage of it while keeping hooks executable `.mjs`.

Observed/official events include:

- `PreToolUse`
- `PostToolUse`
- `PostToolUseFailure`
- `PermissionRequest`
- `PermissionDenied`
- `Notification`
- `UserPromptSubmit`
- `UserPromptExpansion`
- `Stop`
- `StopFailure`
- `SubagentStart`
- `SubagentStop`
- `TaskCreated`
- `TaskCompleted`
- `PreCompact`
- `PostCompact`
- `SessionStart`
- `SessionEnd`
- `TeammateIdle`
- `PostToolBatch`
- additional schema events such as config/worktree/file/session events where supported by installed version.

Claude supports more hook handler types than Codex. Hook docs identify command/http/mcp_tool/prompt/agent support for several events, but OAL should start with command hooks for portability and add prompt/agent hooks only when there is a concrete product advantage.

OAL Claude hook surfaces to exploit:

- `SessionStart`: context boot, project memory, model/route summary.
- `UserPromptSubmit`: route context, prompt guard, context injection.
- `SubagentStart`: subagent route-context injection. This was a baseline behavior strength.
- `PreToolUse`: destructive command guard, generated-file edit guard, secret read guard.
- `PermissionRequest`: policy/risk review.
- `PostToolUse`: changed-file tracking and tool-result classification.
- `PostToolUseFailure`: repeated failure circuit.
- `Stop` and `SubagentStop`: completion, validation evidence, no-placeholder/no-demo gates.
- `PreCompact`/`PostCompact`: continuation-safe compaction summaries.
- `SessionEnd`: handoff artifacts and cleanup.

## Plugin settings

Claude settings expose plugin enablement through `enabledPlugins` and marketplace settings. OAL should use plugins only if the generated plugin contains real skills/hooks/tools and is installable. Do not render plugin toggles for nonexistent plugin payloads.

## OAL Claude rendering outputs

Project install should render:

```text
.claude/settings.json
.claude/agents/*.md
.claude/skills/*/SKILL.md
.claude/skills/*/{scripts,references,templates}
.claude/hooks/*.mjs or .claude/hooks/scripts/*.mjs
CLAUDE.md or .claude/CLAUDE.md managed block
.claude/commands/*.md where useful
.oal/manifest/claude-project.json
```

User install should render analogous `~/.claude` paths, with explicit user approval.

## Avoid

- `includeCoAuthoredBy` if schema marks it deprecated in favor of a newer attribution object.
- stale blocked Claude model family models.
- local settings writes without user consent.
- hooks that are descriptions instead of executable commands.
- marketplace/plugin toggles for missing plugin payloads.
