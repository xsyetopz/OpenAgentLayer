# Research and Attributions

This file tracks sources used for v4 planning. Official docs override community lists.

## Primary References

| Source                  | Link                                                       | Use                                                              |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Codex docs              | https://developers.openai.com/codex/                       | Codex native surfaces: AGENTS, config, hooks, skills, subagents. |
| Claude Code docs        | https://docs.claude.com/en/docs/claude-code/overview       | Claude Code memory, hooks, slash commands, skills, subagents.    |
| OpenCode docs           | https://opencode.ai/docs/                                  | Agents, skills, config, permissions, plugins.                    |
| Gemini CLI docs         | https://github.com/google-gemini/gemini-cli/tree/main/docs | GEMINI.md, extensions, commands, hooks, MCP.                     |
| Amp manual              | https://ampcode.com/manual                                 | AGENTS.md, threads, toolboxes, skills, subagents, MCP.           |
| Cursor docs             | https://docs.cursor.com/                                   | Rules, AGENTS.md support, MCP, context controls.                 |
| Cline docs              | https://docs.cline.bot/                                    | Rules, workflows, hooks, MCP, `.clineignore`.                    |
| Windsurf docs           | https://docs.windsurf.com/                                 | Rules, workflows, memories, MCP, editor agent surfaces.          |
| Augment docs            | https://docs.augmentcode.com/                              | Guidelines, rules, memories, MCP/context services.               |
| Kilo Code docs          | https://kilo.ai/docs/                                      | Rules, workflows, modes, MCP-compatible surfaces.                |
| AGENTS.md               | https://agents.md/                                         | Cross-agent instruction file convention.                         |
| BMAD Method             | https://docs.bmad-method.org/                              | Phase model, project context, progress docs, install discipline. |
| Awesome Codex CLI       | https://github.com/RoggeOhta/awesome-codex-cli             | Ecosystem taxonomy and adjacent tool survey.                     |
| Awesome Codex Skills    | https://github.com/ComposioHQ/awesome-codex-skills         | Skill packaging patterns and progressive disclosure examples.    |
| Codex source            | https://github.com/openai/codex                            | Source-backed config, AGENTS, hooks, skills, MCP, sandbox.       |
| OpenCode source         | https://github.com/anomalyco/opencode                      | Source-backed config, agents, skills, plugins, MCP, compaction.  |
| OpenCode Models docs    | https://opencode.ai/docs/models/                           | OpenCode model/provider selection references.                    |
| OpenCode Zen docs       | https://opencode.ai/docs/zen                               | OpenCode-hosted model IDs and Zen provider defaults.             |
| Claude Code sourcemap   | https://github.com/xsyetopz/claude-code-sourcemap          | Unofficial 2.1.88 sourcemap research; use paths only.            |
| Kilo Code legacy source | https://github.com/Kilo-Org/kilocode-legacy                | v5-era rules, workflows, modes, MCP, task protocol.              |
| Windsurf site           | https://windsurf.com/                                      | Product reality: Windsurf Editor and extension/plugin surface.   |

## Accepted Ideas

- Native surface taxonomy: rules, agents, skills, commands, hooks, MCP, workflows, memories, install manifests.
- Progressive disclosure: always-on instructions stay small; detailed procedures load only when selected.
- Adapter contracts per platform instead of one generic prompt dump.
- Phase-based workflows: research, plan, implement, validate, review, ship.
- Project context files and progress docs as explicit control plane.
- Skills as folders with metadata, `SKILL.md`, optional references, scripts, and assets.
- Tool-specific install/uninstall verification.
- Command budget enforcement through wrappers and hooks, not reminders.
- User-provided runtime output can be direct evidence when the user explicitly corrects a plan fact.
- User correction evidence updates the current plan or artifact directly; agents must not start unsolicited verification, log inspection, browsing, or side tasks.
- Emotional, interpersonal, imagined, dream, memory, trauma, and hypothetical scenarios require direct answers or interpretation only unless the user explicitly asks for advice, guidance, action steps, or wording.

## Runtime Evidence

- 2026-04-28 Codex CLI model evidence provided by user: OAL accepts `gpt-5.5`. `gpt-5.4-mini`, `gpt-5.3-codex`; OAL rejects low-intelligence utility routing and uses `gpt-5.4-mini` instead.
- 2026-04-28 OpenCode `opencode models` output provided by user includes free fallback IDs: `opencode/big-pickle`, `opencode/minimax-m2.5-free`, `opencode/ling-2.6-flash-free`, `opencode/hy3-preview-free`, `opencode/nemotron-3-super-free`.

## Rejected Ideas

- Link-farm documentation as product surface.
- Badge-heavy README clutter.
- Marketing claims like "best" or "comprehensive" without proof.
- Copying platform-specific assumptions across tools.
- Backwards compatibility layers for v3 names, flags, or generated layouts.
- Prompt bloat as enforcement.
- Long-lived catch-all orchestrator prompts.

## Attribution Policy

- Public README and docs links may be cited directly.
- Verbatim source text must stay short and unnecessary copying avoided.
- Derived implementation ideas must be rewritten into openagentsbtw contracts.
- Platform claims need a source link or `UNKNOWN` marker.
- Unofficial sourcemap research must be labeled as unofficial and must not copy proprietary source text.
- Source paths are evidence for architecture; official docs still define public support promises.
