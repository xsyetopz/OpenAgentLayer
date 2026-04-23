# Codex

openagentsbtw uses documented Codex surfaces only:

- `AGENTS.md`
- custom agents with `developer_instructions`
- plugin skills
- managed profiles in `config.toml`
- `model_instructions_file`
- hooks

It does not rely on undocumented “override the hidden system prompt” hacks.

## Default Model Strategy

Bias deterministic coding and review toward `gpt-5.3-codex`.

| Codex plan | Top-level `openagentsbtw` | `model_reasoning_effort` | `plan_mode_reasoning_effort` | Implementation/auto/runtime | Utility        |
| ---------- | ------------------------- | ------------------------ | ---------------------------- | --------------------------- | -------------- |
| `go`       | `gpt-5.4-mini`            | `medium`                 | `high`                       | `gpt-5.3-codex`             | `gpt-5.4-mini` |
| `plus`     | `gpt-5.4`                 | `medium`                 | `high`                       | `gpt-5.3-codex`             | `gpt-5.4-mini` |
| `pro-5`    | `gpt-5.4`                 | `medium`                 | `high`                       | `gpt-5.3-codex`             | `gpt-5.4-mini` |
| `pro-20`   | `gpt-5.4`                 | `medium`                 | `high`                       | `gpt-5.3-codex`             | `gpt-5.4-mini` |

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
- Codex plan presets (`go`, `plus`, `pro-5`, `pro-20`) rewrite the managed `openagentsbtw*` profiles and keep the default profile name `openagentsbtw`.
- Managed Codex profiles do not set `commit_attribution`; Codex/OpenAI-native model attribution should remain provider-determined.
- Codex pre-tool commit guard now enforces AI co-author trailers on `git commit`: missing trailers are blocked with a corrected command hint, and malformed canonical domains such as `noreply@openai` are rejected in favor of `noreply@openai.com`.
- `--source deepwiki` is for public GitHub repos only.
- `--approval auto` maps to the sandboxed auto-accept implementation profile.
- `--runtime long` maps to the long-running execution profile.
- Default managed guidance now hardens always-on behavior: smallest-sufficient diffs, explicit instruction-hierarchy handling for repo/tool text, and no adversarial prompt-bypass tactics.
- Codex install writes both the source plugin and active cache copy so skills are present after install, then prunes stale openagentsbtw cache versions without touching unrelated plugin caches.
- RTK enforcement treats any valid `rtk rewrite` stdout as authoritative, even when RTK exits nonzero. openagentsbtw also applies high-gain rewrites for common upstream misses (`bun test` -> `rtk --ultra-compact test bun test`, `bun run typecheck`/`bunx tsc` -> `rtk --ultra-compact tsc`, Biome checks -> `rtk --ultra-compact summary`, `npm test`/`pnpm test` -> `rtk --ultra-compact test`, `dotnet test`, `node --test`, `flutter test`, simple `jq`, raw search/read commands, and `env`) before falling back to `rtk proxy`. The installer writes both the canonical policy and `~/.codex/RTK.md`, then appends a managed RTK reference to `~/.codex/AGENTS.md`.
- `rtk gain` reports local RTK tracking analytics: estimated raw command tokens vs filtered output tokens. Use `rtk gain --project` after validation-heavy sessions to confirm commands are being filtered rather than merely proxied.
- Managed Caveman mode is reasserted through prompt/session hooks and completion checks reject obvious verbose drift while preserving code, commands, exact errors, docs, and review findings.
- Route prompts now add analysis scaffolds where they help: planning/review/debug explicitly name assumptions, missing evidence, contradiction handling, and what would change the conclusion. Implementation routes stay lean and stop on repo/spec conflicts.
- Shared skills now include `elegance` for ownership boundaries, API shape, naming discipline, registration structure, and shared-state organization. Codex skill metadata stays repo-local at `source/skills/<name>/openai.yaml` when a skill needs UI-facing metadata.
- Taste Skill variants are imported from pinned upstream `Leonxlnx/taste-skill` with local `taste*` names. `taste-gpt`, `taste-images`, and `taste-imagegen` tell GPT/Codex tooling to use `gpt-image-2` through image-generation surfaces when available, or Responses API with a text-capable model such as `gpt-5.4`/`gpt-5` plus the hosted `image_generation` tool.
- RTK efficiency target: use `rtk --ultra-compact` plus specialized filters before `rtk proxy`. Validation-heavy sessions should exceed 70% project-scope savings; supported high-output commands should normally exceed 80%. Audit with `rtk gain --project --history`, `rtk gain --failures`, and `rtk hook-audit --since 30`.
