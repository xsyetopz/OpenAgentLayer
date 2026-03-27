# Claude To Codex Porting Plan

This is the concrete mapping used for the openagentsbtw Codex split.

The repo now keeps shared source content under the root `source/` tree and renders Codex-facing files from that canonical layer instead of treating Claude files as the source of truth.

## Source To Target

- Claude plugin manifest
  To Codex plugin manifest at `codex/plugin/openagentsbtw/.codex-plugin/plugin.json`
- Claude skills
  To Codex plugin-bundled skills at `codex/plugin/openagentsbtw/skills/`
- Claude agent markdown files
  To Codex custom agent TOMLs in `codex/agents/`
- Claude `CLAUDE.md`
  To real Codex `AGENTS.md` files and templates
- Claude hooks
  To the subset of Codex hook events we verified from the official docs

## Behavior Changes

- Codex no longer uses a placeholder skill pack. It now has a full system package.
- The repo ships a real local marketplace entry for Codex plugins.
- The installer now treats Codex as a first-class install target with plugin, agent, hook, config, and `AGENTS.md` installation.
- Optional RTK setup is split by system: `rtk init -g` for Claude Code and `rtk init -g --codex` for Codex.
- The Codex model presets are now driven by the local Codex CLI model list rather than the broader API catalog when the two differ.
- Fast mode is explicitly disabled in the openagentsbtw Codex profile.

## Intentional Non-Ports

- No `CLAUDE.md` symlink strategy for Codex.
- No attempt to force undocumented Codex plugin-install commands.
- No direct port of Claude-only hook events or file-edit-specific hook logic.

## Follow-On Work

- Add automated validation around the Codex hook scripts and agent file parsing.
- Expand the Codex plugin skill metadata if OpenAI stabilizes more plugin-facing interface fields.
- Revisit installer defaults if Codex later exposes an official plugin install CLI.
