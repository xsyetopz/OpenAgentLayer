# Claude Code Instructions for ClaudeAgents Repository

This repository contains agent definitions, memory schemas, and templates for building token-efficient agent teams.

## What This Repository Is

A **meta-repository** for creating and iterating on Claude Code agent architectures. Components are copied/symlinked to target projects.

## Key Principles

### Token Efficiency
- All agents prioritize reading from `.claude/memory/` before source files
- Index files use compact table formats, not prose
- Agents never read files "just to understand" - they use the symbol index
- Target: Major features in <145K tokens total across all agents

### Feature-Oriented Modules
- Each feature is a self-contained module
- Types at top, core logic, traits, tests, helpers
- Matches pattern from `token.rs` analysis

### Communication Protocol
- Agents communicate via `.claude/memory/tasks.md`
- File locks prevent edit conflicts via `.claude/memory/locks.md`
- No direct agent-to-agent messaging (reduces token overhead)

## File Purposes

| Directory | Purpose |
|-----------|---------|
| `agents/` | Agent markdown files with YAML frontmatter |
| `memory/templates/` | Blank memory schemas |
| `memory/examples/` | Example filled-in memories |
| `skills/` | Auto-activation skill definitions |
| `hooks/` | Hook configurations |
| `module-templates/` | Language-specific feature module templates |
| `workflows/` | Step-by-step workflow guides |
| `scripts/` | Installation and utility scripts |
| `docs/` | Extended documentation |

## Editing Guidelines

### When modifying agent definitions:
1. Keep system prompts focused and actionable
2. Include specific token efficiency rules
3. Define clear "when to use" triggers
4. Specify outputs each agent produces

### When modifying memory templates:
1. Use markdown tables for structured data
2. Include timestamp and metadata fields
3. Keep examples minimal but complete

### When modifying module templates:
1. Follow the 5-section pattern: types, core, traits, tests, helpers
2. Include placeholder comments explaining each section
3. Ensure templates compile/parse in their language

## Testing Changes

After modifying this repository:

1. **Unit test**: Install to a small test project
2. **Verify indexer**: Can index 100+ files in <25K tokens
3. **Verify workflow**: Full feature cycle completes
4. **Verify communication**: Agents use task list correctly

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

### Modifying memory schemas
1. Update `memory/templates/{schema}.md`
2. Update corresponding example in `memory/examples/`
3. Verify agents that produce this schema are updated
