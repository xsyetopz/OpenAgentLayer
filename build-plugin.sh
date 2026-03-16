#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist/claude-agents-plugin"
TIER="${1:-max}"

die()   { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info()  { echo -e "  ${GREEN}✓${NC} $1"; }

set_models() {
    case "$1" in
        pro)
            MODEL_ARCHITECT="sonnet"
            MODEL_IMPLEMENT="sonnet"
            MODEL_AUDIT="sonnet"
            MODEL_TEST="haiku"
            MODEL_DOCUMENT="haiku"
            MODEL_INVESTIGATE="sonnet"
            MODEL_ORCHESTRATE="sonnet"
            ;;
        max)
            MODEL_ARCHITECT="opus"
            MODEL_IMPLEMENT="sonnet"
            MODEL_AUDIT="sonnet"
            MODEL_TEST="haiku"
            MODEL_DOCUMENT="haiku"
            MODEL_INVESTIGATE="sonnet"
            MODEL_ORCHESTRATE="opus"
            ;;
        *) die "Unknown tier: $1. Use 'pro' or 'max'." ;;
    esac
}

substitute_models_in_file() {
    local src="$1" dest="$2"
    sed -e "s/__MODEL_ARCHITECT__/$MODEL_ARCHITECT/g" \
        -e "s/__MODEL_IMPLEMENT__/$MODEL_IMPLEMENT/g" \
        -e "s/__MODEL_AUDIT__/$MODEL_AUDIT/g" \
        -e "s/__MODEL_TEST__/$MODEL_TEST/g" \
        -e "s/__MODEL_DOCUMENT__/$MODEL_DOCUMENT/g" \
        -e "s/__MODEL_INVESTIGATE__/$MODEL_INVESTIGATE/g" \
        -e "s/__MODEL_ORCHESTRATE__/$MODEL_ORCHESTRATE/g" \
        "$src" > "$dest"
}

inject_constraints_in_file() {
    local file="$1"
    local constraints_file="$SCRIPT_DIR/templates/shared-constraints.md"
    if [[ -f "$constraints_file" ]] && grep -q '__SHARED_CONSTRAINTS__' "$file" 2>/dev/null; then
        local tmp=$(mktemp)
        awk -v constraints="$(cat "$constraints_file")" '{gsub(/__SHARED_CONSTRAINTS__/, constraints); print}' "$file" > "$tmp"
        mv "$tmp" "$file"
    fi
}

remove_skill_prefix_in_file() {
    local file="$1"
    local tmp=$(mktemp)
    sed 's|  - cca/|  - |g' "$file" > "$tmp"
    mv "$tmp" "$file"
}

prepare_dir() {
    local dst="$1"
    shift
    rm -rf "$dst"
    mkdir -p "$dst"
    [[ $# -gt 0 ]] && cp "$@" "$dst"/
}

stage_agent() {
    local src="$1" dst="$2"
    substitute_models_in_file "$src" "$dst"
    inject_constraints_in_file "$dst"
    remove_skill_prefix_in_file "$dst"
}

stage_all_agents() {
    mkdir -p "$DIST_DIR/agents"
    for agent in "$SCRIPT_DIR"/agents/*.md; do
        [[ -f "$agent" ]] || continue
        local name=$(basename "$agent")
        stage_agent "$agent" "$DIST_DIR/agents/$name"
        info "Agent: $name"
    done
}

copy_skills() {
    mkdir -p "$DIST_DIR/skills"
    for skill_dir in "$SCRIPT_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill=$(basename "$skill_dir")
        mkdir -p "$DIST_DIR/skills/$skill"
        cp "$skill_dir"* "$DIST_DIR/skills/$skill/" 2>/dev/null || true
        info "Skill: $skill"
    done
}

stage_hooks() {
    mkdir -p "$DIST_DIR/hooks/scripts"
    sed 's|\\\"$CLAUDE_PROJECT_DIR\\\"/.claude/hooks/scripts/|\\\"${CLAUDE_PLUGIN_ROOT}\\\"/hooks/scripts/|g' \
        "$SCRIPT_DIR/hooks/hooks.json" > "$DIST_DIR/hooks/hooks.json"
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
    grep -r '__MODEL_\|__SHARED_CONSTRAINTS__' "$DIST_DIR/agents/" &>/dev/null &&
      { echo -e "  ${RED}✗${NC} Found unreplaced placeholders in agents"; ERRORS=$((ERRORS+1)); } ||
      info "No placeholder remnants"
    grep -r '  - cca/' "$DIST_DIR/agents/" &>/dev/null &&
      { echo -e "  ${RED}✗${NC} Found cca/ prefix in agent skill references"; ERRORS=$((ERRORS+1)); } ||
      info "Agent skill references cleaned"
    grep -q 'CLAUDE_PROJECT_DIR' "$DIST_DIR/hooks/hooks.json" &&
      { echo -e "  ${RED}✗${NC} hooks.json still references \$CLAUDE_PROJECT_DIR"; ERRORS=$((ERRORS+1)); } ||
      info "hooks.json paths use \${CLAUDE_PLUGIN_ROOT}"
    if command -v jq &>/dev/null; then
        jq empty "$DIST_DIR/.claude-plugin/plugin.json" 2>/dev/null &&
          info "plugin.json is valid JSON" ||
          { echo -e "  ${RED}✗${NC} plugin.json is invalid JSON"; ERRORS=$((ERRORS+1)); }
    fi
    echo ""
    [[ $ERRORS -gt 0 ]] && { echo -e "${RED}Build failed with $ERRORS error(s).${NC}"; exit 1; }
}

echo -e "${GREEN}Building ClaudeAgents plugin (tier: $TIER)${NC}\n"

set_models "$TIER"
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
