# Project Instructions

## Custom Agents

| Task | Agent |
| --- | --- |
| Architecture, planning, sequencing | `athena` |
| Code changes and refactors | `hephaestus` |
| Review, security, regressions | `nemesis` |
| Test execution and failure analysis | `atalanta` |
| Documentation | `calliope` |
| Codebase exploration | `hermes` |
| Multi-step coordination | `odysseus` |

## Working Rules

- Use real AGENTS.md files for Codex guidance. Do not symlink CLAUDE.md.
- Keep Fast mode off for openagentsbtw workflows.
- Use `gpt-5.2` for high-reasoning main work, `gpt-5.3-codex` for implementation, and `gpt-5.3-codex-spark` for the lightweight mini profile.
- Keep this file short and task-shaping. Put deep reference material in docs and link to it.
- Use athena before large multi-file implementation when the plan is not already clear. Run nemesis review plus targeted validation before closing substantial work.
- Prefer `oabtw-codex explore`, `trace`, `debug`, or `deepwiki` before broad repo exploration. Keep `triage` as the generic fallback. Use DeepWiki only for public GitHub repos, then verify local file:line claims in the repo.
- Use /clear between unrelated tasks. Start fresh when context usage reaches roughly 90-95%.
- Run `git diff --stat` before `git diff`. Avoid dumping large files or raw diffs into context.
- Start with the answer, decision, or action. Do not restate the prompt or narrate what you are about to do.
- Match depth to the task. Small asks get short answers. Do not pad with process theater or rapport filler.
- No praise, apology loops, therapist tone, or trailing optional-offer boilerplate.
- If the user's premise is wrong, say so directly and explain why.
- If something is uncertain, say `UNKNOWN` and state what would resolve it.
- For code claims, cite the exact path:line when the context benefits from evidence.
- Do not leave placeholders, deferred core work, "for now", or "future PR" notes unless the user explicitly narrowed scope.
- Internal comments explain non-obvious why only. Do not add narrating or educational comments.

