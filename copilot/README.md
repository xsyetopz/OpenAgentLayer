# openagentsbtw for GitHub Copilot

This repo can generate GitHub Copilot assets (agents, skills, hooks, prompts, and repo instructions) from the shared `source/` layer.

Generated outputs live under:

- `.build/generated/copilot/templates/.github/` (installable repo assets)
- `.build/generated/copilot/hooks/` (generated mapping docs for supported/unsupported hook policies)

Runtime hook scripts (installed into repos) live under:

- `copilot/hooks/scripts/openagentsbtw/`

Install support is implemented in the root installer:

```bash
./install.sh --copilot --copilot-scope global
./install.sh --copilot --copilot-scope project
./install.sh --copilot --copilot-scope both
```
