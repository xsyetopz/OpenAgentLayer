# Kilo Code Platform Spec

Verified date: 2026-04-25.

## References

- https://kilo.ai/docs/
- https://kilo.ai/docs/customize/rules
- https://kilo.ai/docs/customize/workflows
- https://kilo.ai/docs/features/mcp
- https://github.com/Kilo-Org/kilocode

## Target

OAL targets the documented Kilo Code customization surfaces. Do not switch source assumptions without updating this file.

## Native Surfaces

| Surface   | Level   | Notes                                          |
| --------- | ------- | ---------------------------------------------- |
| rules     | native  | documented customization rules.                |
| agents    | partial | modes/personas require verification.           |
| skills    | partial | workflows/rules can carry skill-like behavior. |
| commands  | partial | workflow support.                              |
| hooks     | UNKNOWN | no deterministic claim.                        |
| MCP       | native  | documented MCP.                                |
| workflows | native  | documented workflows.                          |

## Source-Backed Paths

- Project rules: `.kilocode/rules/`
- Mode-specific rules: `.kilocode/rules-<mode>/`
- Project workflows: `.kilocode/workflows/`
- Project custom modes: `.kilocodemodes`
- Project MCP: `.kilocode/mcp.json`
- Global CLI storage: `~/.kilocode/cli/`
- VS Code extension global storage: platform-specific `globalStorage/kilocode.kilo-code/`

## Adapter Plan

- Render rules.
- Render workflows.
- Render MCP guidance only if user enables it.
- Keep unsupported hook surfaces explicit.
- Render mode-specific rules instead of claiming unsupported subagent behavior.
- Preserve task protocol choice for a task; do not switch protocol mid-flow.

## Validation

- fixture render
- docs evidence check
- uninstall smoke
- mode-specific rules fixture
- project/global storage cleanup fixture
