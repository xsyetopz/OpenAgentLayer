#!/bin/bash
# init-memory.sh - Initialize or reset memory directory for a project
#
# Usage:
#   ./init-memory.sh /path/to/project [--reset]
#
# Options:
#   --reset  Clear existing memory and start fresh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
TARGET_DIR=""
RESET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --reset)
            RESET=true
            shift
            ;;
        *)
            TARGET_DIR="$1"
            shift
            ;;
    esac
done

# Validate target directory
if [[ -z "$TARGET_DIR" ]]; then
    echo -e "${RED}Error: Target directory required${NC}"
    echo "Usage: $0 /path/to/project [--reset]"
    exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
    echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
MEMORY_DIR="$TARGET_DIR/.claude/memory"

echo -e "${GREEN}Initializing memory directory: $MEMORY_DIR${NC}"
echo ""

# Handle reset
if [[ "$RESET" == true ]]; then
    if [[ -d "$MEMORY_DIR" ]]; then
        echo -e "${YELLOW}Warning: This will delete all existing memory!${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Backup before reset
            backup_dir="$TARGET_DIR/.claude/memory-backup-$(date +%Y%m%d-%H%M%S)"
            mv "$MEMORY_DIR" "$backup_dir"
            echo -e "${GREEN}Backup created: $backup_dir${NC}"
        else
            echo "Reset cancelled."
            exit 0
        fi
    fi
fi

# Create directory structure
mkdir -p "$MEMORY_DIR"/{arch,adrs,debug}

# Create tasks.md
if [[ ! -f "$MEMORY_DIR/tasks.md" ]]; then
    cat > "$MEMORY_DIR/tasks.md" << 'EOF'
# Agent Team Task List

**Last Updated:** (not yet initialized)

## Active Tasks

| ID | Owner | Status | Task | Files | Blocked By |
|----|-------|--------|------|-------|------------|

## Completed Tasks (Last 7 Days)

| ID | Owner | Completed | Task |
|----|-------|-----------|------|

## Messages

```
(no messages yet)
```

---

## Notes

Use this file for agent team coordination.
EOF
    echo -e "${GREEN}Created${NC}: tasks.md"
else
    echo -e "${YELLOW}Exists${NC}: tasks.md"
fi

# Create locks.md
if [[ ! -f "$MEMORY_DIR/locks.md" ]]; then
    cat > "$MEMORY_DIR/locks.md" << 'EOF'
# File Locks

**Last Updated:** (not yet initialized)

## Lock Rules

1. Acquire before editing: Add entry before modifying files
2. Release after completing: Remove entry when done
3. Respect others' locks: Don't edit files locked by others
4. Expiry: Locks expire after 1 hour

## Active Locks

| File | Owner | Since | Task | Expires |
|------|-------|-------|------|---------|
EOF
    echo -e "${GREEN}Created${NC}: locks.md"
else
    echo -e "${YELLOW}Exists${NC}: locks.md"
fi

# Create project-index.md placeholder
if [[ ! -f "$MEMORY_DIR/project-index.md" ]]; then
    cat > "$MEMORY_DIR/project-index.md" << 'EOF'
# Project Index

**Updated:** (not yet indexed)
**Files:** 0 | **LOC:** 0

## Status

This project has not been indexed yet.

Run the indexer to populate this file:
```
@indexer Index this project
```

## Module Map

| Module | Files | LOC | Entry | Exports |
|--------|-------|-----|-------|---------|

## Symbol Index

| Symbol | Kind | File:Line | Module |
|--------|------|-----------|--------|

## Feature -> Files Map

| Feature | Files |
|---------|-------|

## Import Graph

(not yet analyzed)

## Detected Patterns

| Pattern | Example | Files Using |
|---------|---------|-------------|
EOF
    echo -e "${GREEN}Created${NC}: project-index.md (placeholder)"
else
    echo -e "${YELLOW}Exists${NC}: project-index.md"
fi

# Create knowledge.md
if [[ ! -f "$MEMORY_DIR/knowledge.md" ]]; then
    cat > "$MEMORY_DIR/knowledge.md" << 'EOF'
# Project Knowledge Base

This file captures important knowledge about the project that helps future development.

## Quick Reference

(Add key information here as you learn about the project)

## Module Guide

(Document key modules and their purposes)

## Gotchas

(Document common pitfalls and how to avoid them)

## Patterns

(Document coding patterns used in this project)

## Recent Learnings

(Capture insights from recent development work)
EOF
    echo -e "${GREEN}Created${NC}: knowledge.md"
else
    echo -e "${YELLOW}Exists${NC}: knowledge.md"
fi

# Create patterns.md
if [[ ! -f "$MEMORY_DIR/patterns.md" ]]; then
    cat > "$MEMORY_DIR/patterns.md" << 'EOF'
# Coding Patterns

This file documents the coding patterns detected and used in this project.

## Error Handling

(Document error handling patterns)

## Naming Conventions

(Document naming conventions)

## Test Patterns

(Document test patterns)

## Module Structure

(Document module organization patterns)

---

*This file is updated by the indexer agent.*
EOF
    echo -e "${GREEN}Created${NC}: patterns.md"
else
    echo -e "${YELLOW}Exists${NC}: patterns.md"
fi

# Create test-coverage.md
if [[ ! -f "$MEMORY_DIR/test-coverage.md" ]]; then
    cat > "$MEMORY_DIR/test-coverage.md" << 'EOF'
# Test Coverage

**Last Run:** (not yet run)

## Coverage Summary

| Metric | Value |
|--------|-------|
| Overall | - |
| Lines | - |
| Branches | - |
| Functions | - |

## Module Coverage

| Module | Tests | Passing | Coverage |
|--------|-------|---------|----------|

## Recent Test Runs

| Date | Tests | Passed | Failed | Duration |
|------|-------|--------|--------|----------|

---

*This file is updated by the verifier agent.*
EOF
    echo -e "${GREEN}Created${NC}: test-coverage.md"
else
    echo -e "${YELLOW}Exists${NC}: test-coverage.md"
fi

# Create .gitignore for memory directory
if [[ ! -f "$MEMORY_DIR/.gitignore" ]]; then
    cat > "$MEMORY_DIR/.gitignore" << 'EOF'
# Temporary files
.index-dirty
*.tmp
*.bak

# Large generated files (optional - uncomment if you want to ignore)
# project-index.md

# Debug artifacts (optional)
# debug/
EOF
    echo -e "${GREEN}Created${NC}: .gitignore"
fi

echo ""
echo -e "${GREEN}Memory directory initialized!${NC}"
echo ""
echo "Directory structure:"
echo "  $MEMORY_DIR/"
echo "  ├── project-index.md  # Will be populated by indexer"
echo "  ├── patterns.md       # Coding patterns"
echo "  ├── knowledge.md      # Project knowledge"
echo "  ├── tasks.md          # Agent coordination"
echo "  ├── locks.md          # File locks"
echo "  ├── test-coverage.md  # Test tracking"
echo "  ├── arch/             # Architecture plans"
echo "  ├── adrs/             # Architecture Decision Records"
echo "  └── debug/            # Debug artifacts"
echo ""
echo "Next step: Run the indexer to populate project-index.md"
echo "  @indexer Index this project"
