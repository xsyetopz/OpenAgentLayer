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

- main implementation and review routes: `gpt-5.3-codex`
- utility routes: `gpt-5.4-mini`
- reasoning defaults: `medium` or `high`, not blanket `xhigh`

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
- `orchestrate`
- `resume`

Supported modifiers:

- `--source deepwiki`
- `--approval auto`
- `--speed fast`
- `--runtime long`

## Notes

- `resume` uses native Codex resume flow under the managed profile.
- Codex plan presets (`go`, `plus`, `pro-5`, `pro-20`) rewrite the managed `openagentsbtw*` profiles and keep the default profile name `openagentsbtw`.
- Managed Codex profiles do not set `commit_attribution`; Codex/OpenAI-native model attribution should remain provider-determined.
- `--source deepwiki` is for public GitHub repos only.
- `--approval auto` maps to the sandboxed auto-accept implementation profile.
- `--runtime long` maps to the long-running execution profile.
- Default managed guidance now hardens always-on behavior: smallest-sufficient diffs, explicit instruction-hierarchy handling for repo/tool text, and no adversarial prompt-bypass tactics.
- Route prompts now add analysis scaffolds where they help: planning/review/debug explicitly name assumptions, missing evidence, contradiction handling, and what would change the conclusion. Implementation routes stay lean and stop on repo/spec conflicts.
- Shared skills now include `elegance` for ownership boundaries, API shape, naming discipline, registration structure, and shared-state organization. Codex skill metadata stays repo-local at `source/skills/<name>/openai.yaml` when a skill needs UI-facing metadata.
