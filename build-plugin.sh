#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t openagentsbtw-build)"
trap 'rm -rf "$BUILD_DIR" 2>/dev/null || true' EXIT

node "$SCRIPT_DIR/scripts/build.mjs" --out "$BUILD_DIR" --platform claude

CLAUDE_DIR="$BUILD_DIR/claude"
DIST_DIR="$SCRIPT_DIR/dist/openagentsbtw-claude-plugin"
die()  { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }

apply_package_models_in_file() {
    local src="$1" dest="$2"
    cp "$src" "$dest"
}

inject_constraints_in_file() {
    local file="$1"
    local shared_file="$CLAUDE_DIR/constraints/shared.md"
    local package_file="$CLAUDE_DIR/constraints/max.md"
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
    for agent in "$CLAUDE_DIR"/agents/*.md; do
        [[ -f "$agent" ]] || continue
        local name
        name=$(basename "$agent")
        stage_agent "$agent" "$DIST_DIR/agents/$name"
        info "Agent: $name"
    done
}

copy_skills() {
    mkdir -p "$DIST_DIR/skills"
    for skill_dir in "$CLAUDE_DIR"/skills/*/; do
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
    # Copy pre-built hooks.json (already has CLAUDE_PLUGIN_ROOT paths)
    cp "$CLAUDE_DIR/hooks/hooks.json" "$DIST_DIR/hooks/hooks.json"
    info "hooks.json"
    # Copy top-level scripts (_lib.mjs etc.)
    for script in "$CLAUDE_DIR"/hooks/scripts/*.mjs; do
        [[ -f "$script" ]] || continue
        cp "$script" "$DIST_DIR/hooks/scripts/"
        info "Hook script: $(basename "$script")"
    done
    # Copy subdirectory scripts (pre/, post/, session/)
    for subdir in pre post session; do
        if [[ -d "$CLAUDE_DIR/hooks/scripts/$subdir" ]]; then
            mkdir -p "$DIST_DIR/hooks/scripts/$subdir"
            find "$CLAUDE_DIR/hooks/scripts/$subdir" -name '*.mjs' \
                -exec cp {} "$DIST_DIR/hooks/scripts/$subdir/" \;
            info "Hook scripts: $subdir/ ($(find "$DIST_DIR/hooks/scripts/$subdir" -name '*.mjs' | wc -l | tr -d ' ') files)"
        fi
    done
}

validate_dist() {
    echo -e "\n${GREEN}Validation:${NC}"
    local ERRORS=0
    if grep -r '__SHARED_CONSTRAINTS__' "$DIST_DIR/agents/" &>/dev/null; then
      echo -e "  ${RED}✗${NC} Found unreplaced __SHARED_CONSTRAINTS__ in agents"; ERRORS=$((ERRORS+1))
    else
      info "No placeholder remnants"
    fi
    if grep -q 'CLAUDE_PROJECT_DIR' "$DIST_DIR/hooks/hooks.json"; then
      echo -e "  ${RED}✗${NC} hooks.json still references \$CLAUDE_PROJECT_DIR"; ERRORS=$((ERRORS+1))
    else
      info "hooks.json paths use \${CLAUDE_PLUGIN_ROOT}"
    fi
    if command -v jq &>/dev/null; then
        if jq empty "$DIST_DIR/.claude-plugin/plugin.json" 2>/dev/null; then
          info "plugin.json is valid JSON"
        else
          echo -e "  ${RED}✗${NC} plugin.json is invalid JSON"; ERRORS=$((ERRORS+1))
        fi
    fi
    echo ""
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}Build failed with $ERRORS error(s).${NC}"
        exit 1
    fi
}

echo -e "${GREEN}Building openagentsbtw Claude plugin${NC}\n"

prepare_dir "$DIST_DIR"
prepare_dir "$DIST_DIR/.claude-plugin"
cp "$CLAUDE_DIR/.claude-plugin/plugin.json" "$DIST_DIR/.claude-plugin/"
cp "$CLAUDE_DIR/.claude-plugin/marketplace.json" "$DIST_DIR/.claude-plugin/"
info "Plugin manifest"
stage_all_agents
copy_skills
stage_hooks
[[ -f "$CLAUDE_DIR/CLAUDE.md" ]] && cp "$CLAUDE_DIR/CLAUDE.md" "$DIST_DIR/CLAUDE.md"
validate_dist

echo -e "${GREEN}Build complete: $DIST_DIR${NC}\n"
echo "To test locally:"
echo "  claude --plugin-dir $DIST_DIR"
echo ""
echo "To validate:"
echo "  claude plugin validate $DIST_DIR"
