# Kilo Code Source Dive

Repository: https://github.com/Kilo-Org/kilocode
Target: documented Kilo Code customization behavior.

## Source-Backed Surfaces

- Project rules: `.kilocode/rules/`
- Mode-specific rules: `.kilocode/rules-<mode>/`
- Project workflows: `.kilocode/workflows/`
- Project custom modes: `.kilocodemodes`
- Project MCP: `.kilocode/mcp.json`
- Global rules/workflows: `~/.kilocode/rules/`, `~/.kilocode/workflows/`
- VS Code extension global storage: platform-specific `globalStorage/kilocode.kilo-code/`
- CLI storage: `~/.kilocode/cli/`

## Relevant Behaviors

- Modes act as agents/personas with role definitions and tool groups.
- Built-in mode names include architect, code, ask, debug, orchestrator, and review.
- Workflows are reusable conversation/task templates.
- MCP tools/resources are available through Kilo's tool protocol.
- Task tools include new-task/completion style behavior.
- Tool protocol can be locked at task creation; adapter must not switch protocol mid-task.

## OAL Implications

- Target documented Kilo Code paths explicitly.
- Render mode-specific rules for role behavior instead of claiming unsupported subagent behavior.
- Render workflows into `.kilocode/workflows/`.
- Render MCP config only when user enables MCP.
- Install/uninstall must handle VS Code extension storage separately from CLI storage.

## Edge Cases

- `.kilocoderules` and older Cline/Roo naming may be deprecated or transitional.
- Global and project rules can conflict.
- Mode-specific paths multiply uninstall targets.
- Task protocol lock can break workflows if OAL changes tool syntax mid-session.

