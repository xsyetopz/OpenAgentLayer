# Provider-Native Reboot Matrix

OAL must be tooling-agnostic at the intent layer and provider-native at the output layer.

“Tooling-agnostic” does not mean identical generated files. It means OAL concepts are represented once, then rendered according to each provider’s real capabilities.

## Capability: agents/subagents

### OAL intent

An OAL agent is a production routing unit with a contract, model route, tools, skills, workflow, validation behavior, and output contract.

### Codex

- Render agent TOML where Codex supports custom agents.
- Include full developer instructions, not summary role cards.
- Use `model_reasoning_effort` naming if supported by the active Codex config schema/CLI behavior.
- Map sandbox/write behavior into Codex-supported sandbox/approval configuration.

### Claude Code

- Render agent/subagent Markdown with frontmatter and full operational prompt body.
- Use Claude-supported tools, skills, permission mode, and model names.
- Claude-specific subagent events may support richer route context.

### OpenCode

- Render OpenCode-native agents and commands.
- Respect OpenCode primary/default-agent concepts.
- Use provider/model separation as OpenCode expects.

## Capability: commands/routes

### OAL intent

Routes define what the user is asking OAL to do: plan, implement, review, test, trace, document, orchestrate, etc.

### Codex

- Render command/profile behavior into Codex-native command or wrapper surfaces only when actually supported.
- Avoid fake subagent route assumptions when Codex cannot expose the same event as Claude.

### Claude Code

- Render slash commands/subagent routes where supported.
- Use hooks to inject route context and enforce route completion.

### OpenCode

- Render commands and task/tool wiring as OpenCode supports them.
- OpenCode route behavior should not be a copy of Claude command behavior.

## Capability: hooks

### OAL intent

A hook policy defines a runtime behavior such as completion gating, context injection, branch protection, secret scanning, or generated-drift checking.

### Codex

- Render Codex-supported hook bindings only.
- Unsupported Claude-style events must be marked unsupported rather than faked.
- Hook scripts remain `.mjs` and deployable.

### Claude Code

- Render Claude hook events and matchers.
- Use `SubagentStart` where supported.
- Stop hooks can enforce completion contracts.

### OpenCode

- Render plugin/tool events or git hooks depending on capability.
- Some hook policies may map to plugin hooks; some to git hooks; some may be unsupported.

## Capability: tools

### OAL intent

Tools are runnable integrations or provider-callable capabilities.

### Codex

- Avoid naming tools that Codex cannot call.
- Prefer commands/hooks/config where appropriate.

### Claude Code

- Use Claude-supported tools and skill scripts.
- Do not assume arbitrary tool registration unless supported.

### OpenCode

- OpenCode tools are a first-class target.
- Tool code must be runnable and referenced from config/commands/agents.

## Capability: config

### OAL intent

Config output is a tailored provider config payload with model routing, hooks, permissions, and instruction references.

### Codex

- TOML output must respect Codex config schema and current supported fields.
- Model allowlist must be enforced.
- Do not emit blocked Codex models for OAL reboot.

### Claude Code

- Settings JSON output must respect Claude Code settings schema and current supported fields.
- Do not emit blocked Claude model family models for OAL reboot.

### OpenCode

- JSON/JSONC output must respect OpenCode config shape.
- Respect default agent and permission semantics.

## Capability: deployment

### OAL intent

Deploy should apply rendered output into project/user roots with manifest ownership.

### All providers

- Dry-run/diff should show writes and merges.
- Apply should preserve user-owned config.
- Manifest should record files, blocks, structured keys, checksums, and generated source refs.
- Uninstall should remove only OAL-owned material.
