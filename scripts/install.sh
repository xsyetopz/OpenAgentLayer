#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

TARGET_DIR=""
USE_SYMLINK=false
INSTALL_SCOPE="project" # default

usage() {
    echo -e "${GREEN}Claude Code Agent Installer${NC}"
    echo -e "Usage: $0 <target-dir>|--global [--symlink]"
    echo -e "  <target-dir>   : Path to your project"
    echo -e "  --global       : Install to global ~/.claude/"
    echo -e "  --symlink      : Use symlinks instead of copies"
    exit 1
}

# Parse args: allow --global and optional --symlink
while [[ $# -gt 0 ]]; do
    case "$1" in
        --symlink) USE_SYMLINK=true; shift ;;
        --global) INSTALL_SCOPE="global"; shift ;;
        -h|--help) usage ;;
        *)
          if [[ -z "$TARGET_DIR" ]]; then
              TARGET_DIR="$1"
          else
              echo -e "${RED}Error: Too many arguments${NC}"
              usage
          fi
          shift
          ;;
    esac
done

if [[ "$INSTALL_SCOPE" == "global" ]]; then
    TARGET_DIR="$HOME"
    CLAUDE_DIR="$HOME/.claude"
    echo -e "${GREEN}Installing Claude Code agent team to GLOBAL directory: $CLAUDE_DIR${NC}\n"
else
    if [[ -z "$TARGET_DIR" ]]; then
        echo -e "${RED}Error: Target directory required, or use --global${NC}\n"
        usage
    fi
    if [[ ! -d "$TARGET_DIR" ]]; then
        echo -e "${RED}Error: Target directory does not exist: $TARGET_DIR${NC}"
        exit 1
    fi
    TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
    CLAUDE_DIR="$TARGET_DIR/.claude"
    echo -e "${GREEN}Installing Claude Code agent team to: $TARGET_DIR${NC}\n"
fi

mkdir -p "$CLAUDE_DIR"/{agents,memory/{arch,adrs},skills,hooks/scripts}

install_file() {
    local src="$1" dest="$2"
    if $USE_SYMLINK; then
        [[ -e "$dest" || -L "$dest" ]] && rm -f "$dest"
        ln -s "$src" "$dest"
        echo -e "  ${GREEN}Linked${NC}: $(basename "$dest")"
    else
        cp "$src" "$dest"
        echo -e "  ${GREEN}Copied${NC}: $(basename "$dest")"
    fi
}

echo "Installing agents..."
for agent in "$REPO_DIR"/agents/*.md; do
    [[ -f "$agent" ]] && install_file "$agent" "$CLAUDE_DIR/agents/$(basename "$agent")"
done
echo

echo "Installing memory templates..."
for template in "$REPO_DIR"/memory/templates/*.md; do
    dest="$CLAUDE_DIR/memory/$(basename "$template")"
    if [[ -f "$template" ]]; then
        if [[ ! -f "$dest" ]]; then
            install_file "$template" "$dest"
        else
            echo -e "  ${YELLOW}Skipped${NC}: $(basename "$template") (already exists)"
        fi
    fi
done
echo

echo "Installing skills..."
for skill_dir in "$REPO_DIR"/skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name=$(basename "$skill_dir")
    mkdir -p "$CLAUDE_DIR/skills/$skill_name"
    for skill_file in "$skill_dir"*; do
        [[ -f "$skill_file" ]] && install_file "$skill_file" "$CLAUDE_DIR/skills/$skill_name/$(basename "$skill_file")"
    done
done
echo

echo "Installing hooks..."
HOOKS_JSON_SRC="$REPO_DIR/hooks/hooks.json"
HOOKS_JSON_DEST="$CLAUDE_DIR/hooks.json"
if [[ -f "$HOOKS_JSON_SRC" ]]; then
    if [[ -f "$HOOKS_JSON_DEST" ]]; then
        echo -e "  ${YELLOW}Warning${NC}: hooks.json already exists"
        echo -e "  ${YELLOW}         ${NC}Please manually merge: $HOOKS_JSON_SRC"
    else
        install_file "$HOOKS_JSON_SRC" "$HOOKS_JSON_DEST"
    fi
fi

for script in "$REPO_DIR"/hooks/scripts/*; do
    [[ -f "$script" ]] || continue
    dest="$CLAUDE_DIR/hooks/scripts/$(basename "$script")"
    install_file "$script" "$dest"
    chmod +x "$dest"
done
echo

TASKS_MD="$CLAUDE_DIR/memory/tasks.md"
if [[ ! -f "$TASKS_MD" ]]; then
    cat > "$TASKS_MD" <<'EOF'
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

LOCKS_MD="$CLAUDE_DIR/memory/locks.md"
if [[ ! -f "$LOCKS_MD" ]]; then
    cat > "$LOCKS_MD" <<'EOF'
# File Locks

**Last Updated:** (not yet)

## Active Locks

| File | Owner | Since | Task | Expires |
|------|-------|-------|------|---------|
EOF
    echo -e "${GREEN}Created${NC}: locks.md"
fi

echo
echo -e "${GREEN}Installation complete!${NC}\n"
echo "Next steps:"
echo "  1. Run the indexer: @indexer Index this project"
echo "  2. Start developing: @architect Design a new feature"
echo
echo "Installed components:"
echo "  - Agents:  $CLAUDE_DIR/agents/"
echo "  - Memory:  $CLAUDE_DIR/memory/"
echo "  - Skills:  $CLAUDE_DIR/skills/"
echo "  - Hooks:   $CLAUDE_DIR/hooks.json"
