# openagentsbtw for GitHub Copilot

This repo can generate GitHub Copilot assets for both native repo/editor surfaces and native user CLI surfaces from the shared `source/` layer.

Generated outputs live under:

- `.build/generated/copilot/templates/.github/` (repo/editor assets: agents, skills, prompts, hooks, and `.github/instructions`)
- `.build/generated/copilot/templates/.copilot/` (user CLI assets: `~/.copilot/agents`, `~/.copilot/skills`, `~/.copilot/hooks`, and `~/.copilot/instructions`)
- `.build/generated/copilot/hooks/` (generated mapping docs for supported/unsupported hook policies)
- `.build/generated/copilot/hooks/route-contracts.json` (shared Copilot route contracts)

Runtime hook scripts (installed into repos) live under:

- `copilot/hooks/scripts/openagentsbtw/`

Project installs target `.github/`. Global installs target `~/.copilot/`.

Copilot continuity should stay native:

- CLI: `copilot --continue`, `copilot --resume`, `/resume`, `/instructions`, `/fleet`
- VS Code Chat: native sessions, prompt files, instruction files, hooks, and custom agents

`copilot-instructions.md` at repo root is now treated as a legacy compatibility surface. New installs write `.github/copilot-instructions.md` plus `.github/instructions/*.instructions.md`.

Install support is implemented in the root installer:

```bash
./install.sh --copilot --copilot-scope global
./install.sh --copilot --copilot-scope project
./install.sh --copilot --copilot-scope both
```

## Deferred Queue Status

openagentsbtw does not enable prompt queue suppression for Copilot yet. Current Copilot hook docs state `userPromptSubmitted` output is not processed, so `/queue` cannot reliably prevent the prompt from entering the active task. Native continuation remains the supported path.
