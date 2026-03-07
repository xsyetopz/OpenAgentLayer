#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_usage() {
    echo -e "${YELLOW}Usage:${NC} $0 /path/to/project [--reset]"
    echo "  --reset    Clear existing memory and start fresh"
    echo
    echo "You can also use the special path '~/.claude/' for a global memory store."
}

init_file() {
    local path="$1"
    local content="$2"
    if [[ ! -f "$path" ]]; then
        echo "$content" > "$path"
        echo -e "${GREEN}Created${NC}: $(basename "$path")"
    else
        echo -e "${YELLOW}Exists${NC}: $(basename "$path")"
    fi
}

TARGET_DIR=""
RESET=false

for arg in "$@"; do
    case "$arg" in
        --reset) RESET=true ;;
        *) TARGET_DIR="$arg" ;;
    esac
done

if [[ -z "$TARGET_DIR" ]]; then
    echo -e "${RED}Error: Target directory required${NC}"
    print_usage
    exit 1
fi

# Allow for ~ and ~/.claude/ global usage
case "$TARGET_DIR" in
    "~/.claude"|"~/.claude/"|"\$HOME/.claude"|\$HOME/.claude/)
        # Expand ~, handle $HOME literal as well
        if [[ "$TARGET_DIR" == "~/.claude"* ]]; then
            TARGET_DIR="$HOME/.claude"
        else
            # Expand literal $HOME if user typed it
            TARGET_DIR="${TARGET_DIR/\$HOME/$HOME}"
        fi
        ;;
esac

# Expand ~ at the start if it's there (even if not .claude/)
if [[ "$TARGET_DIR" == ~* ]]; then
    TARGET_DIR="${TARGET_DIR/#\~/$HOME}"
fi

if [[ ! -d "$TARGET_DIR" ]]; then
    echo -e "${YELLOW}Directory does not exist: $TARGET_DIR"
    echo -e "Creating directory..."
    mkdir -p "$TARGET_DIR"
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Failed to create directory: $TARGET_DIR${NC}"
        exit 1
    fi
    echo -e "${GREEN}Created${NC}: $TARGET_DIR"
fi

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
MEMORY_DIR="$TARGET_DIR/.claude/memory"

echo -e "${GREEN}Initializing memory directory: $MEMORY_DIR${NC}"
echo ""

if $RESET && [[ -d "$MEMORY_DIR" ]]; then
    echo -e "${YELLOW}Warning: This will delete all existing memory!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        backup_dir="$TARGET_DIR/.claude/memory-backup-$(date +%Y%m%d-%H%M%S)"
        mv "$MEMORY_DIR" "$backup_dir"
        echo -e "${GREEN}Backup created: $backup_dir${NC}"
    else
        echo "Reset cancelled."
        exit 0
    fi
fi

mkdir -p "$MEMORY_DIR"/{arch,adrs,debug}

init_file "$MEMORY_DIR/tasks.md" \
"# Agent Team Task List

**Last Updated:** (not yet initialized)

## Active Tasks

| ID | Owner | Status | Task | Files | Blocked By |
|----|-------|--------|------|-------|------------|

## Completed Tasks (Last 7 Days)

| ID | Owner | Completed | Task |
|----|-------|-----------|------|

## Messages

\`\`\`
(no messages yet)
\`\`\`

---

## Notes

Use this file for agent team coordination.
"

init_file "$MEMORY_DIR/locks.md" \
"# File Locks

**Last Updated:** (not yet initialized)

## Lock Rules

1. Acquire before editing: Add entry before modifying files
2. Release after completing: Remove entry when done
3. Respect others' locks: Don't edit files locked by others
4. Expiry: Locks expire after 1 hour

## Active Locks

| File | Owner | Since | Task | Expires |
|------|-------|-------|------|---------|
"

init_file "$MEMORY_DIR/project-index.md" \
"# Project Index

**Updated:** (not yet indexed)
**Files:** 0 | **LOC:** 0

## Status

This project has not been indexed yet.

Run the indexer to populate this file:
\`\`\`
@indexer Index this project
\`\`\`

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
"

init_file "$MEMORY_DIR/knowledge.md" \
"# Project Knowledge Base

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
"

init_file "$MEMORY_DIR/patterns.md" \
"# Coding Patterns

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
"

init_file "$MEMORY_DIR/test-coverage.md" \
"# Test Coverage

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
"

init_file "$MEMORY_DIR/.gitignore" \
"# Temporary files
.index-dirty
*.tmp
*.bak

# Large generated files (optional - uncomment if you want to ignore)
# project-index.md

# Debug artifacts (optional)
# debug/
"

cat <<EOM

${GREEN}Memory directory initialized!${NC}

Directory structure:
  $MEMORY_DIR/
  ├── project-index.md  # Will be populated by indexer
  ├── patterns.md       # Coding patterns
  ├── knowledge.md      # Project knowledge
  ├── tasks.md          # Agent coordination
  ├── locks.md          # File locks
  ├── test-coverage.md  # Test tracking
  ├── arch/             # Architecture plans
  ├── adrs/             # Architecture Decision Records
  └── debug/            # Debug artifacts

Next step: Run the indexer to populate project-index.md
  @indexer Index this project

EOM
