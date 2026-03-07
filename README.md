# Claude Code Agent Team Architecture

A token-efficient, feature-oriented hybrid agent architecture optimized for **Claude Max 5x plan**.

## Quick Start

```bash
# Install to your project
./scripts/install.sh /path/to/your/project

# Initialize memory directory
./scripts/init-memory.sh /path/to/your/project
```

## Repository Purpose

- Generate agent definitions, memory schemas, skills, hooks
- Iterate on designs with version control
- Extend the system over time
- Copy/symlink components to target projects

## Architecture Overview

### Hybrid Approach

| Approach | Use Case |
|----------|----------|
| **Agent Teams** | Complex collaborative work (architecture, cross-cutting refactors, debugging) |
| **Subagents** | Routine focused tasks (indexing, testing, documentation) |

### Agent Team

| Agent | Role | Model | Token Budget |
|-------|------|-------|--------------|
| **Indexer** | Repository Indexer & Feature Mapper | sonnet | 25K |
| **Architect** | Feature-Oriented Architect | opus | 35K |
| **Implementer** | Implementation & Refactoring Engineer | sonnet | 35K |
| **Verifier** | Testing & Verification Engineer | sonnet | 30K |
| **Scribe** | Documentation & Knowledge Engineer | sonnet | 20K |

## Directory Structure

```
.
├── agents/                    # Agent definitions (copy to .claude/agents/)
├── memory/                    # Memory schema templates
│   ├── templates/             # Blank templates
│   └── examples/              # Example filled-in memories
├── skills/                    # Skills (copy to .claude/skills/)
├── hooks/                     # Hook configurations
├── module-templates/          # Feature-oriented module templates
│   ├── rust/
│   ├── typescript/
│   ├── go/
│   ├── swift/
│   └── cpp/
├── workflows/                 # Documented workflows
├── scripts/                   # Utility scripts
└── docs/                      # Extended documentation
```

## Usage

### 1. Install to Project

```bash
./scripts/install.sh ~/my-project
```

This copies:
- `agents/` → `.claude/agents/`
- `skills/` → `.claude/skills/`
- `hooks/hooks.json` → `.claude/hooks.json`

### 2. Initialize Memory

```bash
./scripts/init-memory.sh ~/my-project
```

Creates `.claude/memory/` with empty templates.

### 3. Run Indexer First

Always start by indexing your project:

```
@indexer Index this project
```

This creates `.claude/memory/project-index.md` which other agents consume.

### 4. Feature Development Workflow

```
Phase 1: @indexer   → Creates project index
Phase 2: @architect → Designs feature (reads index)
Phase 3: @implementer → Writes code (reads design + index)
Phase 4: @verifier  → Runs tests
Phase 5: @scribe    → Documents feature
```

## Token Efficiency

The system is designed to stay within Claude Max 5x plan budget:

- **Agents read memory first** before source files
- **Progressive disclosure**: summaries → specific files
- **No duplicate reads**: indexer reads, others use index
- **Targeted operations**: test specific modules, not full suites
- **Compact outputs**: tables and lists, not prose

### Budget Per Major Task

| Phase | Typical | Max |
|-------|---------|-----|
| Index | 15K | 25K |
| Design | 25K | 35K |
| Implement | 25K | 35K |
| Verify | 20K | 30K |
| Document | 15K | 20K |
| **Total** | **100K** | **145K** |

## When to Use Agent Teams vs Subagents

### Use Agent Teams For:
- Research/review in parallel
- New modules (disjoint files)
- Debugging competing hypotheses
- Cross-layer coordination

### Use Subagents For:
- Sequential tasks
- Same-file edits
- Routine small tasks
- Work with many dependencies

## Supported Languages

- Rust
- TypeScript
- Go
- Swift
- C/C++

## License

MIT
