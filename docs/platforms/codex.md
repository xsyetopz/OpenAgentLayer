# Codex

openagentsbtw uses documented Codex surfaces only:

- `AGENTS.md`
- custom agents with `developer_instructions`
- plugin skills
- managed profiles in `config.toml`
- `model_instructions_file`
- hooks

It does not rely on undocumented "override the hidden system prompt" hacks.

## Default Model Strategy

Bias planning/orchestration toward `gpt-5.5`, implementation/review toward `gpt-5.3-codex`, and bounded utility work toward `gpt-5.4-mini`.

Codex CLI 0.124.0 supported model set for openagentsbtw:

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.3-codex`
- `gpt-5.3-codex-spark`
- `gpt-5.2`

| Codex plan | Top-level `openagentsbtw` | `model_reasoning_effort` | `plan_mode_reasoning_effort` | Review          | Implementation/auto/runtime | Utility        |
| ---------- | ------------------------- | ------------------------ | ---------------------------- | --------------- | --------------------------- | -------------- |
| `plus`     | `gpt-5.5`                 | `medium`                 | `high`                       | `gpt-5.3-codex` | `gpt-5.3-codex`             | `gpt-5.4-mini` |
| `pro-5`    | `gpt-5.5`                 | `medium`                 | `high`                       | `gpt-5.3-codex` | `gpt-5.3-codex`             | `gpt-5.4-mini` |
| `pro-20`   | `gpt-5.5`                 | `medium`                 | `high`                       | `gpt-5.3-codex` | `gpt-5.3-codex`             | `gpt-5.4-mini` |

Managed config export details live in [codex-config-export.md](codex-config-export.md).

## Wrapper Shape

```bash
oabtw-codex <mode> [modifiers] "<task>"
```

Supported verbs:

- `explore`
- `trace`
- `debug`
- `plan`
- `implement`
- `test`
- `validate`
- `review`
- `document`
- `deslop`
- `design-polish`
- `taste`
- `taste-gpt`
- `taste-images`
- `taste-redesign`
- `taste-soft`
- `taste-output`
- `taste-minimalist`
- `taste-brutalist`
- `taste-stitch`
- `taste-imagegen`
- `orchestrate`
- `resume`

Supported modifiers:

- `--source deepwiki`
- `--approval auto`
- `--speed fast`
- `--runtime long`

## Deferred Queue

Codex supports the experimental deferred prompt queue through `UserPromptSubmit` and `Stop` hooks:

- `/queue <message>` or `queue: <message>` stores a follow-up and suppresses normal prompt processing.
- `/queue --auto <message>` dispatches one queued item after the active turn passes completion checks.
- `oabtw-codex queue list|add|next|clear|retry` manages the same state from the shell.

Queue state lives outside the repository under `~/.config/openagentsbtw/queue/`.

## Notes

- `resume` uses native Codex resume flow under the managed profile.
- Codex plan presets (`plus`, `pro-5`, `pro-20`) rewrite the managed `openagentsbtw*` profiles and keep the default profile name `openagentsbtw`.
- Managed config is now rendered from one canonical source for both the checked-in sample `codex/templates/config.toml` and the installer-managed `~/.codex/config.toml` block.
- Managed config now exports first-class `[agents.<name>]` metadata with `config_file` and `nickname_candidates`, plus tier-shaped `agents.job_max_runtime_seconds`.
- Managed config opts into `features.multi_agent_v2 = true` instead of `multi_agent` for current Codex CLI 0.124.0 experiments; this flag is still under development.
- Top-level managed search stays `web_search = "cached"` while `openagentsbtw-utility` overrides to `web_search = "live"` for exploration-heavy routes.
- Managed memory config now uses the canonical `disable_on_external_context = true` key instead of the legacy alias.
- Managed Codex profiles do not set `commit_attribution`; Codex/OpenAI-native model attribution should remain provider-determined.
- Codex pre-tool commit guard now enforces AI co-author trailers on `git commit`: missing trailers are blocked with a corrected command hint, and malformed canonical domains such as `noreply@openai` are rejected in favor of `noreply@openai.com`.
- `--source deepwiki` is for public GitHub repos only.
- Managed config sets `approvals_reviewer = "auto_review"` so eligible approval prompts are reviewed by Codex's reviewer subagent instead of stopping on the user by default.
- Native Codex config has `plan_mode_reasoning_effort`, but no confirmed documented key to make raw `codex` TUI boot directly into Plan mode. The openagentsbtw wrapper defaults no-mode prompts to the `plan` route instead.
- `--approval auto` maps to the sandboxed auto-review implementation profile.
- `--runtime long` maps to the long-running execution profile.
- Default managed guidance now hardens always-on behavior: smallest-sufficient diffs, explicit instruction-hierarchy handling for repo/tool text, and no adversarial prompt-bypass tactics.
- Codex install writes both the source plugin and active cache copy so skills are present after install, then prunes stale openagentsbtw cache versions without touching unrelated plugin caches.
- RTK enforcement uses the managed bundled RTK binary first and treats any valid `rtk rewrite` stdout as authoritative, even when RTK exits nonzero. openagentsbtw also applies high-gain rewrites for common upstream misses (`bun test` -> `rtk --ultra-compact test bun test`, `bun run typecheck`/`bunx tsc` -> `rtk --ultra-compact tsc`, Biome checks -> `rtk --ultra-compact summary`, `npm test`/`pnpm test` -> `rtk --ultra-compact test`, `dotnet test`, `node --test`, `flutter test`, simple `jq`, raw search/read commands, `env`, and bare `rtk ...` commands missing `--ultra-compact`) before falling back to `rtk proxy`. The installer writes both the canonical policy and `~/.codex/RTK.md`, appends a managed RTK reference to `~/.codex/AGENTS.md`, and adds the managed bin directory plus an `rtk()` redirect to Unix shell startup files. Restart the shell, or source the edited startup file, before running `rtk` directly.
- `rtk gain` reports local RTK tracking analytics: estimated raw command tokens vs filtered output tokens. Use `rtk gain --project` after validation-heavy sessions to confirm commands are being filtered rather than merely proxied.
- Managed Caveman mode is reasserted through prompt/session hooks and completion checks reject obvious verbose drift while preserving code, commands, exact errors, docs, and review findings.
- Route prompts now add analysis scaffolds where they help: planning/review/debug explicitly name assumptions, missing evidence, contradiction handling, and what would change the conclusion. Implementation routes stay lean and stop on repo/spec conflicts.
- Shared skills now include `elegance` for ownership boundaries, API shape, naming discipline, registration structure, and shared-state organization. Codex skill metadata stays repo-local at `source/skills/<name>/openai.yaml` when a skill needs UI-facing metadata.
- Taste Skill variants are imported from pinned upstream `Leonxlnx/taste-skill` with local `taste*` names. `taste-gpt`, `taste-images`, and `taste-imagegen` keep Codex on the supported text-capable model set above and use the hosted `image_generation` tool when image generation is available.
- RTK efficiency target: use `rtk --ultra-compact` plus specialized filters before `rtk proxy`. Validation-heavy sessions should exceed 70% project-scope savings; supported high-output commands should normally exceed 80%. Audit with `rtk gain --project --history`, `rtk gain --failures`, and `rtk hook-audit --since 30`.
