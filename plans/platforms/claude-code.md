# Claude Code Platform Spec

Verified date: 2026-04-25.

## References

- https://docs.claude.com/en/docs/claude-code/overview
- https://docs.claude.com/en/docs/claude-code/memory
- https://docs.claude.com/en/docs/claude-code/hooks
- https://docs.claude.com/en/docs/claude-code/sub-agents
- https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
- https://github.com/xsyetopz/claude-code-sourcemap

## Source Notes

The sourcemap repository is unofficial reconstructed research for Claude Code 2.1.88. Use it for path-level behavior hints only.

- `restored-src/src/skills/loadSkillsDir.ts` covers skill frontmatter, lazy loading, conditional paths, and dedupe.
- `restored-src/src/hooks/useMergedTools.ts` merges built-in and MCP tools.
- `restored-src/src/hooks/useMergedCommands.ts` merges built-in and MCP commands.
- `restored-src/src/tools/*` shows built-in tool families.

## Native Surfaces

| Surface      | Level   | Notes                                 |
| ------------ | ------- | ------------------------------------- |
| rules/memory | native  | `CLAUDE.md` hierarchy and imports.    |
| agents       | native  | subagents with isolated context.      |
| skills       | native  | progressive-disclosure skill folders. |
| commands     | native  | slash commands.                       |
| hooks        | native  | pre/post/session style enforcement.   |
| MCP          | native  | configured through Claude Code.       |
| workflows    | partial | render as commands plus skills.       |

## Context and Token Controls

- Skill routing context should be frontmatter-size only.
- Full skill body should load only when invoked.
- Path-conditional skills can narrow context by file family.
- Tool and command names can collide with MCP/plugin-provided names.

## Adapter Plan

- Render minimal `CLAUDE.md`.
- Render agents for role-isolated work.
- Render skills as native skill folders.
- Render slash commands for workflows.
- Install self-contained hooks.
- Use runner for command filtering.
- Canonicalize generated skill paths to avoid symlink/realpath duplicates.
- Namespace generated tools/skills where collision risk exists.

## Validation

- temp `HOME` plugin install smoke
- hook self-contained import test
- skill discovery smoke where possible
- uninstall removes managed files only
- conditional skill fixture
- MCP/tool name collision fixture
