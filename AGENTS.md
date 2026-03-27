# Project Instructions

This repo packages openagentsbtw for three systems: Claude Code, OpenCode, and Codex.

## System Map

- `claude/` contains the Claude Code plugin, hooks, skills, templates, and tests.
- `opencode/` contains the OpenCode framework import and installer-facing templates.
- `codex/` contains the Codex-native plugin, custom agents, hooks, templates, and research docs.
- `docs/openai/` is the source of truth for Codex/OpenAI research and porting decisions.

## Codex Rules

- Use the openagentsbtw custom Codex agents: `athena`, `hephaestus`, `nemesis`, `atalanta`, `calliope`, `hermes`, and `odysseus`.
- Prefer `athena` before non-trivial multi-file implementation and `nemesis` before closing review-heavy work.
- Keep Fast mode off for openagentsbtw Codex workflows.
- Use real `AGENTS.md` files for Codex guidance. Do not symlink `CLAUDE.md`.
- Keep Codex responses terse, peer-level, and task-shaped. No praise, apologies, therapy tone, or trailing "if you want..." boilerplate.
- Do not leave placeholders, "for now", "future PR", "out of scope", or deferred core work unless the user explicitly narrows scope.
- Internal code comments must explain non-obvious why only. Do not add narrating or educational comments.

## Workflow

- Preserve the split architecture. Claude, OpenCode, and Codex assets should stay isolated by directory.
- When changing Codex support, update both the implementation under `codex/` and the research notes under `docs/openai/`.
- Reuse existing role prompts and safety logic where it ports cleanly, but adjust wording and behavior to Codex’s documented surfaces rather than copying Claude-specific assumptions.
