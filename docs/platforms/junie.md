# JetBrains Junie

openagentsbtw installs JetBrains Junie support only when JetBrains/Junie markers are detected.

## Surfaces

- Project instructions: `.junie/AGENTS.md`
- DeepWiki MCP, when enabled: `.junie/mcp/mcp.json`

## Install

`./install.sh --junie` installs JetBrains Junie support when Junie exists on the system.

`./install.sh --all` auto-detects JetBrains Junie and skips it when missing.

## Hook Status

Junie hook parity is not mapped in this release. openagentsbtw uses project instruction files and optional MCP config.
