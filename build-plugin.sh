#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
_YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist/claude-agents-plugin"
PACKAGE="${1:-pro}"

die()   { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info()  { echo -e "  ${GREEN}✓${NC} $1"; }

set_package() {
    case "$1" in
        enterprise|pro|max) PACKAGE="$1" ;;
        consumer) PACKAGE="pro" ;;
        *) die "Unknown package: $1. Use 'pro', 'max', or 'enterprise'." ;;
    esac
}

apply_package_models_in_file() {
    local src="$1" dest="$2"
    local agent_name
    agent_name=$(grep -m1 '^name:' "$src" 2>/dev/null | sed 's/^name: *//')
    case "$PACKAGE" in
        enterprise|max)
            case "$agent_name" in
                athena|nemesis|odysseus) cp "$src" "$dest" ;;
                *) sed -e 's/^model: opus$/model: sonnet/' "$src" > "$dest" ;;
            esac
            ;;
        pro)
            sed -e 's/^model: opus$/model: sonnet/' "$src" > "$dest"
            ;;
    esac
}

inject_constraints_in_file() {
    local file="$1"
    local shared_file="$SCRIPT_DIR/constraints/shared.md"
    local package_file="$SCRIPT_DIR/constraints/$PACKAGE.md"
    if [[ -f "$shared_file" ]] && grep -q '__SHARED_CONSTRAINTS__' "$file" 2>/dev/null; then
        local tmp
        tmp=$(mktemp)
        awk -v constraints="$(cat "$shared_file")" '{gsub(/__SHARED_CONSTRAINTS__/, constraints); print}' "$file" > "$tmp"
        mv "$tmp" "$file"
    fi
    if [[ -f "$package_file" ]] && grep -q '__PACKAGE_CONSTRAINTS__' "$file" 2>/dev/null; then
        local tmp
        tmp=$(mktemp)
        awk -v constraints="$(cat "$package_file")" '{gsub(/__PACKAGE_CONSTRAINTS__/, constraints); print}' "$file" > "$tmp"
        mv "$tmp" "$file"
    fi
}

remove_skill_prefix_in_file() {
    local file="$1"
    local tmp
    tmp=$(mktemp)
    sed 's|  - cca:|  - |g' "$file" > "$tmp"
    mv "$tmp" "$file"
}

prepare_dir() {
    local dst="$1"
    shift
    rm -rf "$dst"
    mkdir -p "$dst"
    if [[ $# -gt 0 ]]; then
        cp "$@" "$dst"/
    fi
}

stage_agent() {
    local src="$1" dst="$2"
    apply_package_models_in_file "$src" "$dst"
    inject_constraints_in_file "$dst"
    remove_skill_prefix_in_file "$dst"
}

stage_all_agents() {
    mkdir -p "$DIST_DIR/agents"
    for agent in "$SCRIPT_DIR"/agents/*.md; do
        [[ -f "$agent" ]] || continue
        local name
        name=$(basename "$agent")
        stage_agent "$agent" "$DIST_DIR/agents/$name"
        info "Agent: $name"
    done
}

copy_skills() {
    mkdir -p "$DIST_DIR/skills"
    for skill_dir in "$SCRIPT_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill
        skill=$(basename "$skill_dir")
        mkdir -p "$DIST_DIR/skills/$skill"
        cp "$skill_dir"* "$DIST_DIR/skills/$skill/" 2>/dev/null || true
        info "Skill: $skill"
    done
}

stage_hooks() {
    mkdir -p "$DIST_DIR/hooks/scripts"
    # shellcheck disable=SC2016
    sed 's|\\\"$CLAUDE_PROJECT_DIR\\\"/.claude/hooks/scripts/|\\\"${CLAUDE_PLUGIN_ROOT}\\\"/hooks/scripts/|g' \
        "$SCRIPT_DIR/hooks/configs/base.json" > "$DIST_DIR/hooks/hooks.json"
    info "hooks.json (paths transformed to \${CLAUDE_PLUGIN_ROOT})"
    for script in "$SCRIPT_DIR"/hooks/scripts/*.py; do
        [[ -f "$script" ]] || continue
        cp "$script" "$DIST_DIR/hooks/scripts/"
        info "Hook script: $(basename "$script")"
    done
}

validate_dist() {
    echo -e "\n${GREEN}Validation:${NC}"
    local ERRORS=0
    if grep -r '__SHARED_CONSTRAINTS__' "$DIST_DIR/agents/" &>/dev/null; then
        echo -e "  ${RED}✗${NC} Found unreplaced __SHARED_CONSTRAINTS__ in agents"
        ERRORS=$((ERRORS+1))
    else
        info "No placeholder remnants"
    fi
    if grep -q 'CLAUDE_PROJECT_DIR' "$DIST_DIR/hooks/hooks.json"; then
        echo -e "  ${RED}✗${NC} hooks.json still references \$CLAUDE_PROJECT_DIR"
        ERRORS=$((ERRORS+1))
    else
        info "hooks.json paths use \${CLAUDE_PLUGIN_ROOT}"
    fi
    if command -v jq &>/dev/null; then
        if jq empty "$DIST_DIR/.claude-plugin/plugin.json" 2>/dev/null; then
            info "plugin.json is valid JSON"
        else
            echo -e "  ${RED}✗${NC} plugin.json is invalid JSON"
            ERRORS=$((ERRORS+1))
        fi
    fi
    echo ""
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}Build failed with $ERRORS error(s).${NC}"
        exit 1
    fi
}

echo -e "${GREEN}Building ClaudeAgents plugin (package: $PACKAGE)${NC}\n"

set_package "$PACKAGE"
prepare_dir "$DIST_DIR"
prepare_dir "$DIST_DIR/.claude-plugin"
cp "$SCRIPT_DIR/.claude-plugin/plugin.json" "$DIST_DIR/.claude-plugin/"
info "Plugin manifest"
stage_all_agents
copy_skills
stage_hooks
[[ -f "$SCRIPT_DIR/README.md" ]] && cp "$SCRIPT_DIR/README.md" "$DIST_DIR/"
validate_dist

echo -e "${GREEN}Build complete: $DIST_DIR${NC}\n"
echo "To test locally:"
echo "  claude --plugin-dir $DIST_DIR"
echo ""
echo "To validate:"
echo "  claude plugin validate $DIST_DIR"
