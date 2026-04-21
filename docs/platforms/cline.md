# Cline

openagentsbtw installs Cline support only when Cline is detected.

## Surfaces

- Rules: `.clinerules/openagentsbtw.md`
- Skills: `.cline/skills/openagentsbtw/SKILL.md`
- Workflows: `.cline/workflows/openagentsbtw.md`
- Hooks: `.clinerules/hooks/openagentsbtw.json`

## Install

`./install.sh --cline` installs Cline support when Cline exists on the system.

`./install.sh --all` auto-detects Cline and skips it when missing.

## Hook Status

Cline gets conservative prompt hooks for task start and task completion. Core command enforcement remains on Claude, Codex, Copilot, and OpenCode where those runtimes expose stronger hook contracts.
