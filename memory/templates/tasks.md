# Agent Team Task List

**Last Updated:** {TIMESTAMP}

## Active Tasks

| ID | Owner | Status | Task | Files | Blocked By |
|----|-------|--------|------|-------|------------|
| T1 | {agent} | {pending/in_progress/done} | {description} | {files} | {task_ids} |

### Status Values
- `pending` - Not yet started
- `in_progress` - Currently being worked on
- `done` - Completed
- `blocked` - Waiting on another task or clarification

## Completed Tasks (Last 7 Days)

| ID | Owner | Completed | Task |
|----|-------|-----------|------|
| T0 | indexer | 2024-01-14T10:00:00Z | Initial project index |

## Messages

Communication between agents. Format: `[TIMESTAMP] sender -> recipient: message`

```
- [2024-01-15T10:00:00Z] indexer -> all: Index complete. See project-index.md
- [2024-01-15T10:15:00Z] architect -> implementer: Design ready. See arch/feature.md
- [2024-01-15T11:00:00Z] implementer -> verifier: Implementation complete. Ready for tests.
```

---

## Task Assignment Guidelines

### Indexer
- Index/refresh project memory
- Update project-index.md

### Architect
- Design new features
- Create arch/{feature}.md plans
- Resolve design questions

### Implementer
- Implement from arch plans
- Refactor existing code
- Update locks.md during edits

### Verifier
- Run targeted tests
- Write new tests
- Update test-coverage.md

### Scribe
- Document completed features
- Write ADRs
- Update knowledge.md

## Creating New Tasks

When creating a task:
1. Use next available ID (T{n+1})
2. Set owner to the appropriate agent
3. Set status to `pending`
4. List affected files if known
5. Set `blocked_by` if dependent on other tasks
