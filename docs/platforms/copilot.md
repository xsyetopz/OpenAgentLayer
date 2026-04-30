# Copilot

openagentsbtw installs Copilot assets into:

- project scope: `.github/agents`, `.github/skills`, `.github/prompts`, `.github/hooks`
- global scope: `~/.copilot/agents`, `~/.copilot/skills`, `~/.copilot/hooks`

## Hook Mapping

- Primary hook events come from shared hook policy mappings.
- Compatibility fallback events are emitted for selected policies when platform support drifts.
- Generated `copilot/hooks/HOOKS.md` and `copilot/hooks/policy-map.json` remain the source of truth.

## Notes

- Install once, generate all: Copilot assets are generated from canonical source catalogs.
- Legacy agentic-ides outputs are not generated in v3.
