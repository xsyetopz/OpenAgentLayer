# Project Instructions

openagentsbtw packages four platform-specific surfaces from a single canonical source.

## System Map

| Directory         | Contents                                                     |
| ----------------- | ------------------------------------------------------------ |
| `claude/`         | Claude Code plugin, hooks, skills, templates, tests          |
| `codex/`          | Codex plugin, custom agents, hooks, templates, research docs |
| `opencode/`       | OpenCode framework integration, templates                    |
| `copilot/`        | Copilot/VS Code assets, hook scripts                         |
| `docs/platforms/` | Platform-specific research and porting decisions             |

## Codex Rules

- Use the openagentsbtw custom agents: athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus.
- Prefer athena before non-trivial multi-file implementation and nemesis before closing review-heavy work.
- Keep Fast mode off for openagentsbtw Codex workflows.
- Do not hard-code `service_tier = "flex"` in managed profiles; leave unset unless explicitly overridden.
- Use real `AGENTS.md` files. Do not symlink `CLAUDE.md`.
- Terse, peer-level, task-shaped responses. No praise, apologies, therapy tone, or trailing boilerplate.
- No placeholders, "for now", "future PR", "out of scope", or deferred core work unless the user explicitly narrows scope.
- Comments explain non-obvious "why" only. No narrating or educational comments.

## Workflow

- Preserve the split architecture. Platform assets stay isolated by directory.
- When changing Codex support, update both `codex/` and `docs/platforms/codex.md`.
- When changing OpenCode support, update both `opencode/` and `docs/platforms/opencode.md`.
- When changing Copilot support, update `copilot/` and relevant `.github/` assets.
- Reuse existing role prompts and safety logic where it ports cleanly. Adjust to each platform's documented surfaces rather than copying platform-specific assumptions.

