#!/bin/bash
# install.sh - Install Claude Code agent team to a target project
#
# Usage:
#   ./install.sh /path/to/project [--symlink]
#
# Options:
#   --symlink  Create symlinks instead of copying (for development)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory (where ClaudeAgents repo is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
TARGET_DIR=""
USE_SYMLINK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --symlink)
            USE_SYMLINK=true
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
    echo "Usage: $0 /path/to/project [--symlink]"
    exit 1
fi

if [[ ! -d "$TARGET_DIR" ]]; then
    echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
    exit 1
fi

# Convert to absolute path
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

echo -e "${GREEN}Installing Claude Code agent team to: $TARGET_DIR${NC}"
echo ""

# Create .claude directory structure
CLAUDE_DIR="$TARGET_DIR/.claude"
mkdir -p "$CLAUDE_DIR"/{agents,memory/{arch,adrs},skills,hooks/scripts}

# Function to install files
install_file() {
    local src="$1"
    local dest="$2"

    if [[ "$USE_SYMLINK" == true ]]; then
        if [[ -e "$dest" ]] || [[ -L "$dest" ]]; then
            rm -f "$dest"
        fi
        ln -s "$src" "$dest"
        echo -e "  ${GREEN}Linked${NC}: $(basename "$dest")"
    else
        cp "$src" "$dest"
        echo -e "  ${GREEN}Copied${NC}: $(basename "$dest")"
    fi
}

# Install agents
echo "Installing agents..."
for agent in "$REPO_DIR"/agents/*.md; do
    if [[ -f "$agent" ]]; then
        install_file "$agent" "$CLAUDE_DIR/agents/$(basename "$agent")"
    fi
done
echo ""

# Install memory templates
echo "Installing memory templates..."
for template in "$REPO_DIR"/memory/templates/*.md; do
    if [[ -f "$template" ]]; then
        # Only copy if not already exists (don't overwrite existing memory)
        dest="$CLAUDE_DIR/memory/$(basename "$template")"
        if [[ ! -f "$dest" ]]; then
            install_file "$template" "$dest"
        else
            echo -e "  ${YELLOW}Skipped${NC}: $(basename "$template") (already exists)"
        fi
    fi
done
echo ""

# Install skills
echo "Installing skills..."
for skill_dir in "$REPO_DIR"/skills/*/; do
    if [[ -d "$skill_dir" ]]; then
        skill_name=$(basename "$skill_dir")
        mkdir -p "$CLAUDE_DIR/skills/$skill_name"
        for skill_file in "$skill_dir"*; do
            if [[ -f "$skill_file" ]]; then
                install_file "$skill_file" "$CLAUDE_DIR/skills/$skill_name/$(basename "$skill_file")"
            fi
        done
    fi
done
echo ""

# Install hooks
echo "Installing hooks..."
if [[ -f "$REPO_DIR/hooks/hooks.json" ]]; then
    # Merge with existing hooks if present
    if [[ -f "$CLAUDE_DIR/hooks.json" ]]; then
        echo -e "  ${YELLOW}Warning${NC}: hooks.json already exists"
        echo -e "  ${YELLOW}         ${NC}Please manually merge: $REPO_DIR/hooks/hooks.json"
    else
        install_file "$REPO_DIR/hooks/hooks.json" "$CLAUDE_DIR/hooks.json"
    fi
fi

# Install hook scripts
for script in "$REPO_DIR"/hooks/scripts/*; do
    if [[ -f "$script" ]]; then
        install_file "$script" "$CLAUDE_DIR/hooks/scripts/$(basename "$script")"
        # Make scripts executable
        chmod +x "$CLAUDE_DIR/hooks/scripts/$(basename "$script")"
    fi
done
echo ""

# Create initial tasks.md if not exists
if [[ ! -f "$CLAUDE_DIR/memory/tasks.md" ]]; then
    cat > "$CLAUDE_DIR/memory/tasks.md" << 'EOF'
# Agent Team Task List

**Last Updated:** (not yet)

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
EOF
    echo -e "${GREEN}Created${NC}: tasks.md"
fi

# Create initial locks.md if not exists
if [[ ! -f "$CLAUDE_DIR/memory/locks.md" ]]; then
    cat > "$CLAUDE_DIR/memory/locks.md" << 'EOF'
# File Locks

**Last Updated:** (not yet)

## Active Locks

| File | Owner | Since | Task | Expires |
|------|-------|-------|------|---------|
EOF
    echo -e "${GREEN}Created${NC}: locks.md"
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run the indexer: @indexer Index this project"
echo "  2. Start developing: @architect Design a new feature"
echo ""
echo "Installed components:"
echo "  - Agents:  $CLAUDE_DIR/agents/"
echo "  - Memory:  $CLAUDE_DIR/memory/"
echo "  - Skills:  $CLAUDE_DIR/skills/"
echo "  - Hooks:   $CLAUDE_DIR/hooks.json"
