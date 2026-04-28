# Cursor Platform Spec

Verified date: 2026-04-25.

## References

- https://docs.cursor.com/
- https://docs.cursor.com/context/rules
- https://docs.cursor.com/en/context

## Native Surfaces

| Surface   | Level   | Notes                                        |
| --------- | ------- | -------------------------------------------- |
| rules     | native  | project/user rules and AGENTS.md support.    |
| agents    | partial | modes/agents require exact mapping.          |
| skills    | partial | likely rules/commands; verify native skills. |
| commands  | partial | IDE command behavior needs verification.     |
| hooks     | UNKNOWN | no deterministic claim.                      |
| MCP       | native  | Cursor supports MCP.                         |
| workflows | partial | render as rules/commands.                    |

## Adapter Plan

- Render project rules.
- Render AGENTS.md rules core when supported.
- Avoid hook claims.
- Keep Cursor as IDE adapter, not core harness runtime.

## Validation

- fixture rules test
- exact path verification
- uninstall smoke
