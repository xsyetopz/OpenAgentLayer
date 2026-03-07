---
name: index-project
description: Quick project indexing to build or refresh the project memory
triggers:
  - "index project"
  - "index this"
  - "refresh index"
  - "update index"
  - "map project"
  - "scan codebase"
---

# Project Indexing

This skill quickly indexes a project to build the project memory that other agents use.

## When to Use

- Starting work on a new or unfamiliar codebase
- Project memory is stale (>24h since last index)
- Before major feature development
- After significant code changes (many files modified)

## Instructions

### Step 1: Check Existing Index

First, check if an index exists and its age:

```bash
if [ -f ".claude/memory/project-index.md" ]; then
    echo "Index exists"
    head -5 .claude/memory/project-index.md
else
    echo "No index found"
fi
```

### Step 2: Determine Scope

Ask the user if they want:

1. **Full index** - Entire project (use for new projects)
2. **Incremental update** - Only changed files (use for maintenance)
3. **Targeted index** - Specific directory (use for large monorepos)

### Step 3: Run Indexer

For full index:

```ignore
@indexer Perform a full index of this project.

Create .claude/memory/project-index.md with:
- Module map
- Symbol index (public symbols only)
- Feature-to-file mapping
- Import graph
- Detected patterns
```

For incremental:

```ignore
@indexer Perform an incremental index update.

Check git diff since last index timestamp.
Update only changed entries in project-index.md.
```

For targeted:

```ignore
@indexer Index the {directory} directory only.

Create/update .claude/memory/project-index.md with:
- Focus on {directory}/*
- Include dependencies and dependents
```

### Step 4: Verify Results

After indexer completes:

```bash
if [ -f ".claude/memory/project-index.md" ]; then
    echo "Index created successfully"
    wc -l .claude/memory/project-index.md
    head -20 .claude/memory/project-index.md
else
    echo "ERROR: Index not created"
fi
```

### Step 5: Report Summary

Provide a summary:

- Number of files indexed
- Number of modules found
- Number of public symbols
- Any patterns detected
- Recommendations for next steps

## Token Efficiency

The indexer is designed to be token-efficient:

- Uses `head` to read only file headers
- Counts rather than reads when possible
- Outputs compact tables
- Target: 300+ files in <25K tokens

## Output Files

| File | Purpose |
|------|---------|
| `.claude/memory/project-index.md` | Main index |
| `.claude/memory/patterns.md` | Detected coding patterns |

## Troubleshooting

### Index takes too long

- Try targeted index for specific directory
- Exclude test files or generated code
- Check for binary files in the scan

### Index is incomplete

- Verify file patterns match project language
- Check for unusual directory structure
- May need custom file patterns

### Out of memory

- Use incremental indexing
- Split into multiple targeted indexes
- Reduce symbol extraction depth
