# OAL surfaces

OAL owns authored source records and renders provider-native artifacts.

Source inputs:

- `source/product.json`
- `source/agents/*.json`
- `source/routes/*.json`
- `source/skills/*.json`
- `source/hooks/*.json`
- `source/tools/*.json`
- provider renderers in `packages/adapter/src`
- deploy and manifest logic in `packages/deploy` and `packages/manifest`

Artifact outputs:

- Codex: `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`, hooks, shims, skills
- Claude Code: `CLAUDE.md`, `.claude/agents/*.md`, commands, hooks, skills, settings
- OpenCode: `opencode.jsonc`, `.opencode/agents/*.md`, commands, plugin, tools, hooks, skills

Agent use:

- Prefer provider-native subagent or agent launch when the active provider exposes it.
- Codex renders custom OAL agents in `.codex/config.toml` and `.codex/agents/*.toml`; Codex does not infer this roster automatically, so prompts and parent agents must explicitly spawn rendered agent names or aliases when splitting work.
- Spawn `hermes` for exploration/tracing, `hephaestus` for implementation, `atalanta` for validation, `nemesis` for review/security, `athena` for architecture/planning, and other rendered OAL agents when their route or role matches the subtask.
- For significant or separable Codex coding implementation, prefer rendered GPT-5.3-Codex implementation workers such as `hephaestus`, `daedalus`, `demeter`, `hecate`, or `prometheus` instead of having the GPT-5.5 parent perform all edits.
- Parent sessions own task split, agent launch, wait/merge, and final decision. Merge only final summaries, changed paths, validation output, and precise blockers into the parent context.
- Use CSV/batch subagents for many similar row-shaped tasks when the provider exposes that surface.
- If native Codex subagents are unavailable or an external control plane is explicitly needed, use `oal codex peer batch <task>`, `oal opendex`, `opendex`, or Symphony workflow commands for bounded OpenDex/Symphony orchestration.
- `oal codex peer batch` creates a `.openagentlayer/codex-peer/<run-id>/` handoff directory with orchestrator, validate, worker, and review passes.

Source-to-artifact chain must be complete for new behavior: source record, renderer, deploy ownership, acceptance check.
