# Token Efficiency Guide

This document describes strategies for maximizing work done per token within the Claude Max 5x plan budget.

## Token Budget Overview

### Per-Agent Budgets

| Agent | Typical | Maximum | Primary Consumers |
|-------|---------|---------|-------------------|
| Indexer | 15K | 25K | File structures, signatures |
| Architect | 25K | 35K | Index + design work |
| Implementer | 25K | 35K | Index + arch + code |
| Verifier | 20K | 30K | Index + tests |
| Scribe | 15K | 20K | Index + public APIs |
| **Total** | **100K** | **145K** | |

### Claude Max 5x Plan Context

With 5x the normal token limit per month:
- More room for comprehensive work
- Still need efficiency for large projects
- Budget per major feature: ~100-145K tokens

## Core Strategies

### 1. Memory-First Reading

**Principle**: Always read from memory before source files.

```
GOOD:
1. Read .claude/memory/project-index.md
2. Find specific file from index
3. Read only that file

BAD:
1. Grep entire codebase
2. Read multiple files
3. Build mental model from scratch
```

**Token savings**: 50-80% reduction in reading

### 2. Signature-Only Indexing

**Principle**: Extract file structure without reading full content.

```bash
# Extract first 50 lines (signatures)
head -50 src/auth/mod.rs

# Instead of reading entire file
cat src/auth/mod.rs  # 500+ lines
```

**Token savings**: 10x reduction in index building

### 3. Targeted Operations

**Principle**: Operate on specific scopes, not entire codebase.

```bash
# Test specific module
cargo test -p auth

# Instead of full suite
cargo test  # All modules
```

**Token savings**: 5-10x reduction in test output

### 4. Compact Output Formats

**Principle**: Use tables and lists, not prose.

```markdown
# GOOD - Table format
| Symbol | Kind | File:Line |
|--------|------|-----------|
| AuthService | struct | auth/service.rs:15 |

# BAD - Prose format
The AuthService struct is defined in the auth module,
specifically in the service.rs file at line 15...
```

**Token savings**: 3-5x reduction in output

### 5. Incremental Updates

**Principle**: Update only what changed.

```bash
# Check what changed
git diff --name-only HEAD~1

# Update only those files in index
# Instead of full reindex
```

**Token savings**: 10-50x reduction for updates

## Agent-Specific Strategies

### Indexer

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| Head-only reads | `head -50` for signatures | 10x |
| Count vs read | `wc -l` instead of `cat` | 5x |
| Skip binaries | Ignore non-source files | 2x |
| Compact tables | Markdown tables for output | 3x |

### Architect

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| Index-first | Read project-index.md before files | 5x |
| Design from signatures | Use symbol index, not implementations | 3x |
| Checklist output | Tasks as checkboxes, not paragraphs | 2x |
| Skip detail | Link to files instead of quoting | 2x |

### Implementer

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| Targeted reads | Only files being modified | 5x |
| Use locks | Prevent re-reads from conflicts | 2x |
| Batch edits | Multiple changes per file read | 2x |
| Skip verification | Trust the architecture plan | 2x |

### Verifier

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| Module tests | `-p crate_name` not full suite | 5-10x |
| Failure focus | Only read failing tests | 3x |
| Suppress output | `--quiet` unless debugging | 2x |
| Skip passing | Don't analyze passing tests | 5x |

### Scribe

| Strategy | Implementation | Savings |
|----------|---------------|---------|
| Public only | Skip private/internal | 3x |
| Index-based | Synthesize from memory | 5x |
| Template reuse | Follow established doc patterns | 2x |
| Minimal examples | One example per API | 2x |

## Token Estimation

### Estimating Token Costs

| Content Type | Tokens per Line | Notes |
|--------------|-----------------|-------|
| Source code | ~5-10 | Depends on density |
| Markdown prose | ~3-5 | Varies by content |
| Table row | ~5-15 | Depends on columns |
| JSON/YAML | ~3-8 | Depends on nesting |

### Estimating File Sizes

```
1KB file ≈ 250-400 tokens
10KB file ≈ 2,500-4,000 tokens
100KB file ≈ 25,000-40,000 tokens
```

### Budget Calculation Example

```
Feature: Add caching module

Indexer:
  - Read existing index: 2K
  - Scan 50 files (headers): 5K
  - Write index update: 1K
  Subtotal: 8K

Architect:
  - Read index: 2K
  - Read 3 related modules: 6K
  - Generate design: 3K
  Subtotal: 11K

Implementer:
  - Read index + design: 5K
  - Read/write 5 files: 15K
  - Output: 2K
  Subtotal: 22K

Verifier:
  - Read relevant docs: 3K
  - Run tests: 5K
  - Write coverage: 1K
  Subtotal: 9K

Scribe:
  - Read public APIs: 2K
  - Write docs: 3K
  Subtotal: 5K

TOTAL: ~55K tokens (well under 145K budget)
```

## Anti-Patterns to Avoid

### 1. Full File Reads for Context

```
BAD: Reading entire files "to understand"
GOOD: Read index, then specific symbols
```

### 2. Running Full Test Suites

```
BAD: `cargo test` (all tests)
GOOD: `cargo test -p module` (targeted)
```

### 3. Verbose Output Modes

```
BAD: `--verbose` on every command
GOOD: Default output, verbose only for debugging
```

### 4. Redundant Reads

```
BAD: Each agent reads the same files
GOOD: Agents share via project-index.md
```

### 5. Prose Descriptions

```
BAD: "The module contains several functions including..."
GOOD: | Function | Purpose | File |
```

## Monitoring Token Usage

### Signs of Inefficiency

- Agent asking to read many files
- Large outputs with repeated information
- Full test suites running repeatedly
- Index rebuilt from scratch often

### Optimization Triggers

- Single feature exceeding 100K tokens
- Agent running out of context
- Slow response times
- Repeated tool errors

## Emergency Token Conservation

If running low on tokens:

1. **Switch to haiku** for simple tasks
2. **Increase targeting** - smaller scopes
3. **Use caching** - read from memory
4. **Defer documentation** - do later
5. **Batch operations** - combine steps
