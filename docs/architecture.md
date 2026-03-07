# System Architecture

This document describes the overall architecture of the Claude Code Agent Team system.

## Overview

The system is designed as a **hybrid agent architecture** that combines:

1. **Agent Teams** - For complex collaborative work requiring coordination
2. **Subagents** - For routine focused tasks that don't need coordination

## Core Components

### 1. Agent Definitions

Located in `agents/`, these markdown files define each agent's:
- **Model**: Which Claude model to use (sonnet, opus, haiku)
- **Tools**: Available tools for the agent
- **System Prompt**: Instructions for the agent
- **Triggers**: When to invoke this agent

#### Agent Roles

| Agent | Model | Role | Primary Outputs |
|-------|-------|------|-----------------|
| Indexer | sonnet | Repository analysis | project-index.md, patterns.md |
| Architect | opus | Feature design | arch/{feature}.md |
| Implementer | sonnet | Code writing | Source files, locks.md |
| Verifier | sonnet | Testing | Test results, test-coverage.md |
| Scribe | sonnet | Documentation | Docs, ADRs, knowledge.md |

### 2. Project Memory

Located in `.claude/memory/`, this persistent storage enables:
- **Cross-session continuity** - Work persists between Claude sessions
- **Agent coordination** - Agents share information via memory files
- **Token efficiency** - Read compact summaries instead of source files

#### Memory Files

| File | Purpose | Producer | Consumers |
|------|---------|----------|-----------|
| project-index.md | File/symbol index | Indexer | All agents |
| patterns.md | Coding conventions | Indexer | Implementer, Verifier |
| arch/{feature}.md | Architecture plans | Architect | Implementer |
| tasks.md | Task coordination | All agents | All agents |
| locks.md | Edit conflict prevention | Implementer | Implementer |
| knowledge.md | Project knowledge | Scribe | All agents |
| test-coverage.md | Test tracking | Verifier | Verifier, Scribe |

### 3. Skills

Located in `skills/`, these are orchestration workflows that:
- **Auto-activate** based on user intent
- **Coordinate agents** for multi-phase tasks
- **Provide guidance** for complex workflows

#### Available Skills

| Skill | Purpose | Agents Used |
|-------|---------|-------------|
| feature-dev | Full feature development | All 5 agents |
| index-project | Project indexing | Indexer |
| refactor | Module decomposition | All 5 agents |

### 4. Hooks

Located in `hooks/`, these automate:
- **Session events** - Index freshness checks on start
- **Tool events** - Mark index dirty after edits
- **Conflict prevention** - Check locks before editing

## Data Flow

### Feature Development Flow

```
User Request
     │
     ▼
┌─────────┐
│ Indexer │ ──► project-index.md
└────┬────┘
     │
     ▼
┌──────────┐
│ Architect│ ──► arch/{feature}.md
└────┬─────┘
     │
     ▼
┌─────────────┐
│ Implementer │ ──► Source files + locks.md
└─────┬───────┘
      │
      ▼
┌──────────┐
│ Verifier │ ──► test-coverage.md
└────┬─────┘
     │
     ▼
┌────────┐
│ Scribe │ ──► knowledge.md + ADRs
└────────┘
```

### Communication Protocol

Agents communicate via **shared files**, not direct messaging:

1. **tasks.md** - Task assignment and status
2. **locks.md** - File ownership during editing
3. **Memory files** - Shared context and outputs

Example communication:
```markdown
## Messages
- [10:30] indexer -> architect: Index complete. See project-index.md
- [10:45] architect -> implementer: Design ready. See arch/cache.md
- [11:30] implementer -> verifier: Implementation done. Ready for tests
```

## Design Principles

### 1. Single Responsibility

Each agent has one clear purpose:
- Indexer indexes, doesn't implement
- Architect designs, doesn't code
- Implementer codes, doesn't test
- Verifier tests, doesn't document
- Scribe documents, doesn't code

### 2. Token Efficiency

Every agent is optimized for minimal token usage:
- Read memory before source files
- Use indexes instead of full reads
- Output compact tables, not prose
- Target: Major features in <145K tokens total

### 3. Graceful Coordination

Agents coordinate without tight coupling:
- Asynchronous communication via files
- File locks prevent conflicts
- Tasks track progress and handoffs

### 4. Progressive Disclosure

Information is layered:
- Index provides overview (read first)
- Architecture plans provide design
- Source code is read only when necessary

## Error Handling

### Agent Failures

1. **Task failure**: Mark task as blocked in tasks.md
2. **Design question**: Route to architect via tasks.md
3. **Conflict**: Release locks, post message, wait

### Recovery Strategies

| Situation | Recovery |
|-----------|----------|
| Stale index | Run indexer with incremental update |
| Design issue | Invoke architect for clarification |
| Test failure | Route to implementer or architect |
| Lock conflict | Wait or work on different files |

## Extensibility

### Adding New Agents

1. Create `agents/{name}.md` with YAML frontmatter
2. Define model, tools, and system prompt
3. Update README with new agent
4. Add to relevant workflows

### Adding New Languages

1. Create `module-templates/{language}/feature-module/`
2. Add template files following the 5-section pattern
3. Update README supported languages
4. Update indexer to recognize new file patterns

### Adding New Workflows

1. Create `workflows/{workflow-name}.md`
2. Document agent sequence and handoffs
3. Estimate token budgets per phase
4. Add troubleshooting section

## Limitations

1. **Sequential dependencies** - Some tasks must complete before others
2. **Context loss** - Long conversations may compact away context
3. **File conflicts** - Same-file edits require careful locking
4. **Token limits** - Very large codebases may exceed budgets

## Security Considerations

1. **Memory files may contain sensitive info** - Don't commit secrets
2. **Hooks execute shell commands** - Audit hook scripts
3. **Agents have file access** - Lock permissions appropriately
