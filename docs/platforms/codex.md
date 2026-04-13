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
- `--source deepwiki` is for public GitHub repos only.
- `--approval auto` maps to the sandboxed auto-accept implementation profile.
- `--runtime long` maps to the long-running execution profile.
