---
name: feature-dev
description: Orchestrated feature development workflow using the agent team (indexer, architect, implementer, verifier, scribe)
triggers:
  - "develop feature"
  - "implement feature"
  - "add feature"
  - "new feature"
  - "feature workflow"
---

# Feature Development Workflow

This skill orchestrates the full feature development workflow using the agent team.

## Workflow Overview

```ignore
1. INDEXER   → Index project (or verify index is fresh)
2. ARCHITECT → Design feature architecture
3. IMPLEMENTER → Write code following the design
4. VERIFIER  → Test implementation
5. SCRIBE    → Document the feature
```

## Instructions

When this skill is triggered, follow these steps:

### Phase 1: Project Indexing

First, check if the project index exists and is fresh:

```bash
# Check index age
stat -f "%m" .claude/memory/project-index.md 2>/dev/null || echo "0"
```

If the index is missing or >24h old, invoke the indexer:

```ignore
@indexer Index this project for feature development
```

Wait for indexer to complete and verify `.claude/memory/project-index.md` exists.

### Phase 2: Architecture Design

Ask the user for feature requirements if not provided:

- What is the feature name?
- What should it do?
- Any specific requirements or constraints?

Then invoke the architect:

```ignore
@architect Design the {feature_name} feature.

Requirements:
- {requirement_1}
- {requirement_2}

Context from project-index.md is available.
```

Wait for architect to complete and verify `.claude/memory/arch/{feature_name}.md` exists.

### Phase 3: Implementation

Invoke the implementer with the architecture plan:

```ignore
@implementer Implement the {feature_name} feature.

Follow the architecture plan at .claude/memory/arch/{feature_name}.md
Use the project index at .claude/memory/project-index.md for file locations.
Update locks.md before editing files.
```

Wait for implementer to complete. Check `.claude/memory/tasks.md` for status.

### Phase 4: Verification

Invoke the verifier to test the implementation:

```ignore
@verifier Test the {feature_name} feature.

Implementation is complete per tasks.md.
Run targeted tests for the new module.
Update test-coverage.md with results.
```

Wait for verifier to confirm all tests pass.

### Phase 5: Documentation

Finally, invoke the scribe to document:

```ignore
@scribe Document the {feature_name} feature.

Implementation is complete and tested.
Create API documentation and update knowledge.md.
Consider if an ADR is needed.
```

## Token Budget

Target budget for full workflow:

| Phase | Agent | Budget |
|-------|-------|--------|
| Index | indexer | 15-25K |
| Design | architect | 25-32K |
| Implement | implementer | 25-32K |
| Test | verifier | 20-30K |
| Document | scribe | 15-20K |
| **Total** | | **100-145K** |

## Error Handling

### If indexer fails

- Check disk space and permissions
- Try with a smaller scope (specific directory)

### If architect needs clarification

- Pause workflow
- Ask user for input
- Resume with clarified requirements

### If implementer is blocked

- Check tasks.md for the blocking issue
- May need architect input for design decisions

### If tests fail

- Check verifier's analysis in tasks.md
- Route back to implementer for fixes
- Re-run verifier after fixes

## Completion

When all phases complete:

1. Summarize what was created
2. List key files added/modified
3. Provide next steps (e.g., PR creation)
