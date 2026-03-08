# Claude Code Instructions for ClaudeAgents Repository

This repository contains agent definitions, skills, hooks, and templates for enhancing Claude Code projects.

## What This Repository Is

A **meta-repository** for creating and iterating on Claude Code agent architectures. Components are copied/symlinked to target projects.

## File Purposes

| Directory | Purpose |
|-----------|---------|
| `agents/` | Agent markdown files with YAML frontmatter |
| `skills/` | Auto-activation skill definitions |
| `hooks/` | Hook configurations and scripts |
| `module-templates/` | Language-specific feature module templates |
| `templates/rules/` | Path-scoped rules for `.claude/rules/` |
| `scripts/` | Installation script |

## Editing Guidelines

### When modifying agent definitions

1. Keep system prompts focused and actionable
2. Plain markdown — no XML tags, no mermaid diagrams
3. Define clear "when to use" triggers
4. Reference coding-standards skill instead of duplicating rules

### When modifying module templates

1. Follow the 5-section pattern: types, core, traits, tests, helpers
2. Include placeholder comments explaining each section
3. Ensure templates compile/parse in their language

## Testing Changes

After modifying this repository:

1. Run `./scripts/install.sh /tmp/test-project` — verify clean install
2. Verify hooks.json is valid JSON with correct schema
3. Grep for deleted references (`tasks.md`, `locks.md`, `project-index.md`)

## Common Tasks

### Adding a new agent

1. Create `agents/{name}.md`
2. Define YAML frontmatter with model, tools, triggers
3. Write system prompt following existing patterns
4. Update README.md agent table

### Adding a new language template

1. Create `module-templates/{lang}/feature-module/`
2. Add template files following the 5-section pattern
3. Update README.md supported languages

## Orchestration: Teams vs Subagents

### Use Subagents When

- Task scope is narrow and well-defined
- Single module affected
- Sequential dependencies make parallelism unhelpful

### Use Agent Teams When

- Genuinely parallel work is possible (e.g., research + implementation)
- Multiple disjoint modules need simultaneous changes
- Cross-layer coordination (frontend + backend + database)

Do NOT assume complexity based on word count. Assess actual scope before choosing orchestration strategy.

## Code Philosophy

- Self-documenting code over verbose comments
- Comments explain "why", never "what"
- Meaningful names: `parse_primary_expr` not `parse_primary`
- If a comment is needed to explain code, the code should probably be rewritten

## Code Intelligence

Prefer LSP over Grep/Read for code navigation — faster, precise, avoids reading entire files:

- `workspaceSymbol` to find where something is defined
- `findReferences` to see all usages across the codebase
- `goToDefinition` / `goToImplementation` to jump to source
- `hover` for type info without reading the file

Use Grep only when LSP isn't available or for text/pattern searches (comments, strings, config).
After writing or editing code, check LSP diagnostics and fix errors before proceeding.
