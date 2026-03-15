#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
TARGET_DIR=""
INSTALL_SCOPE="project"
TIER="pro"

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

usage() {
    echo -e "${GREEN}Claude Code Agent System Installer${NC}"
    echo "Usage: $0 <target-dir>|--global [--pro|--max]"
    echo "  <target-dir>  : Path to your project"
    echo "  --global      : Install to global ~/.claude/"
    echo "  --pro         : Sonnet tier (default)"
    echo "  --max         : Opus/Sonnet tier"
    exit 1
}

check_version() {
    command -v claude &>/dev/null || die "claude CLI not found. Install Claude Code first."
    version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    [[ -z "$version" ]] && { warn "Could not parse claude version, proceeding anyway"; return; }
    IFS='.' read -r major minor patch <<< "$version"
    (( major > 2 || (major == 2 && (minor > 1 || (minor == 1 && patch >= 75))) )) || die "Claude Code v${version} is too old. Requires >= 2.1.75"
    info "Claude Code v${version}"
}

check_python() {
    command -v python3 &>/dev/null || die "python3 not found. Hook scripts require Python 3."
    info "python3 found: $(python3 --version 2>&1)"
}

agent_models() {
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
    esac
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --global) INSTALL_SCOPE="global"; shift ;;
            --pro) TIER="pro"; shift ;;
            --max) TIER="max"; shift ;;
            -h|--help) usage ;;
            *)
                [[ -z "$TARGET_DIR" ]] && TARGET_DIR="$1" || die "Too many arguments"
                shift ;;
        esac
    done
}

make_dirs() {
    mkdir -p "$CLAUDE_DIR"/{agents,skills,hooks/scripts}
    mkdir -p "$HOME/.claude/hooks"
}

substitute_and_copy() {
    local src="$1"
    local dest="$2"
    sed -e "s/__MODEL_ARCHITECT__/$MODEL_ARCHITECT/g" \
        -e "s/__MODEL_IMPLEMENT__/$MODEL_IMPLEMENT/g" \
        -e "s/__MODEL_AUDIT__/$MODEL_AUDIT/g" \
        -e "s/__MODEL_TEST__/$MODEL_TEST/g" \
        -e "s/__MODEL_DOCUMENT__/$MODEL_DOCUMENT/g" \
        -e "s/__MODEL_INVESTIGATE__/$MODEL_INVESTIGATE/g" \
        -e "s/__MODEL_ORCHESTRATE__/$MODEL_ORCHESTRATE/g" \
        "$src" > "$dest"
}

copy_agents() {
    AGENT_COUNT=0
    echo -e "\nAgents:"
    for agent in "$REPO_DIR"/agents/*.md; do
        [[ -f "$agent" ]] || continue
        local dest="$CLAUDE_DIR/agents/$(basename "$agent")"
        substitute_and_copy "$agent" "$dest"
        info "$(basename "$agent") (model substituted)"
        AGENT_COUNT=$((AGENT_COUNT + 1))
    done
}

copy_skills() {
    SKILL_COUNT=0
    echo -e "\nSkills:"
    for skill_dir in "$REPO_DIR"/skills/ca-*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill_name=$(basename "$skill_dir")
        mkdir -p "$CLAUDE_DIR/skills/$skill_name"
        for skill_file in "$skill_dir"*; do
            [[ -f "$skill_file" ]] || continue
            cp "$skill_file" "$CLAUDE_DIR/skills/$skill_name/$(basename "$skill_file")"
        done
        info "$skill_name"
        SKILL_COUNT=$((SKILL_COUNT + 1))
    done
}

copy_hooks_scripts() {
    echo -e "\nHooks:"
    for hook in guard-secrets.py; do
        local src="$REPO_DIR/hooks/$hook"
        local dest="$HOME/.claude/hooks/$hook"
        [[ -f "$src" ]] && { cp "$src" "$dest"; chmod +x "$dest"; info "$hook -> ~/.claude/hooks/ (user-level)"; }
    done

    [[ -f "$REPO_DIR/hooks/hooks.json" ]] && { cp "$REPO_DIR/hooks/hooks.json" "$CLAUDE_DIR/hooks.json"; info "hooks.json -> project hooks"; }

    if [[ -d "$REPO_DIR/hooks/scripts" ]]; then
        cp -r "$REPO_DIR/hooks/scripts/"* "$CLAUDE_DIR/hooks/scripts/" 2>/dev/null || true
        chmod +x "$CLAUDE_DIR/hooks/scripts/"*.py 2>/dev/null || true
        HOOK_COUNT=$(ls -1 "$CLAUDE_DIR/hooks/scripts/" 2>/dev/null | wc -l | tr -d ' ')
        info "$HOOK_COUNT hook scripts -> project hooks"
    fi
}

settings_json_merge() {
    echo -e "\nSettings:"
    SETTINGS_FILE="$CLAUDE_DIR/settings.json"
    [[ -f "$SETTINGS_FILE" ]] && { cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"; info "Backed up existing settings.json"; }

    local GUARD_SECRETS_ENTRY='{
        "matcher": "Write|Edit|MultiEdit|NotebookEdit|Read|Bash|WebFetch",
        "hooks": [{"type": "command", "command": "python3 \"$HOME\"/.claude/hooks/guard-secrets.py", "timeout": 5}]
    }'

    if command -v jq &>/dev/null; then
        if [[ -f "$SETTINGS_FILE" ]]; then
            jq --argjson pre "$GUARD_SECRETS_ENTRY" '
                .env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] //= "1" |
                .env["DISABLE_AUTOUPDATER"] //= "1" |
                (if .autoUpdatesChannel then .autoUpdatesChannel = "latest" else . end) |
                .hooks.PreToolUse = ((.hooks.PreToolUse // []) | if any(.hooks[0].command? | test("guard-secrets")) then . else . + [$pre] end)
            ' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
            info "Merged into existing settings.json"
        else
            jq -n --argjson pre "$GUARD_SECRETS_ENTRY" '{
                env: {
                    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
                    DISABLE_AUTOUPDATER: "1"
                },
                autoUpdatesChannel: "latest",
                hooks: {
                    PreToolUse: [$pre]
                }
            }' > "$SETTINGS_FILE"
            info "Created settings.json"
        fi
    else
        warn "jq not found - skipping settings.json merge. Install jq and re-run."
    fi
}

install_template() {
    echo -e "\nTemplate:"
    if [[ "$INSTALL_SCOPE" == "project" ]]; then
        CLAUDE_MD="$TARGET_DIR/CLAUDE.md"
        [[ -f "$CLAUDE_MD" ]] && warn "CLAUDE.md already exists at target - skipping (review templates/CLAUDE.md manually)" \
            || { cp "$REPO_DIR/templates/CLAUDE.md" "$CLAUDE_MD"; info "CLAUDE.md installed"; }
    else
        warn "Skipping CLAUDE.md for global install (install per-project instead)"
    fi
}

check_json() {
    local file="$1"
    local label="$2"
    if [[ -f "$file" ]]; then
        if jq empty "$file" 2>/dev/null; then
            info "$label is valid JSON"
        else
            echo -e "  ${RED}✗${NC} $label is invalid JSON"
            return 1
        fi
    fi
    return 0
}

validate_python_hooks() {
    PYTHON_ERRORS=0
    for pyfile in "$CLAUDE_DIR/hooks/scripts/"*.py "$HOME/.claude/hooks/"*.py; do
        [[ -f "$pyfile" ]] || continue
        python3 -c "import py_compile; py_compile.compile('$pyfile', doraise=True)" 2>/dev/null || {
            echo -e "  ${RED}✗${NC} Syntax error in $(basename "$pyfile")"
            PYTHON_ERRORS=$((PYTHON_ERRORS + 1))
        }
    done
    [[ $PYTHON_ERRORS -eq 0 ]] && info "All Python hooks parse without errors"
    return $PYTHON_ERRORS
}

validate_ca_skills() {
    SKILL_ERRORS=0
    for skill_dir in "$CLAUDE_DIR"/skills/ca-*/; do
        [[ -d "$skill_dir" ]] || continue
        [[ -f "$skill_dir/SKILL.md" ]] || {
            echo -e "  ${RED}✗${NC} Missing SKILL.md in $(basename "$skill_dir")"
            SKILL_ERRORS=$((SKILL_ERRORS + 1))
        }
    done
    [[ $SKILL_ERRORS -eq 0 ]] && info "All ca-* skills have SKILL.md"
    return $SKILL_ERRORS
}

check_directories_not_present() {
    local dirs=("$@")
    local err=0
    for d in "${dirs[@]}"; do
        if [[ -d "$CLAUDE_DIR/skills/$d" ]]; then
            echo -e "  ${RED}✗${NC} Old skill directory still present: $d"
            err=$((err + 1))
        fi
    done
    return $err
}

validate_agents() {
    local expected=(athena hephaestus nemesis atalanta calliope hermes odysseus)
    local errs=0
    for agent in "${expected[@]}"; do
        [[ -f "$CLAUDE_DIR/agents/$agent.md" ]] || {
            echo -e "  ${RED}✗${NC} Missing agent: $agent.md"
            errs=$((errs + 1))
        }
    done
    [[ $errs -eq 0 ]] && info "All Greek agents present"
    return $errs
}

report_summary() {
    echo -e "\n${GREEN}Done!${NC} Installed $AGENT_COUNT agents, $SKILL_COUNT skills"
    echo ""
    echo "Agents:"
    echo "  @athena      - design, plan, architect       (model: $MODEL_ARCHITECT)"
    echo "  @hephaestus  - write code, fix bugs          (model: $MODEL_IMPLEMENT)"
    echo "  @nemesis     - review, security audit        (model: $MODEL_AUDIT)"
    echo "  @atalanta    - run tests, diagnose failures  (model: $MODEL_TEST)"
    echo "  @calliope    - write/edit documentation      (model: $MODEL_DOCUMENT)"
    echo "  @hermes      - research, explore codebase    (model: $MODEL_INVESTIGATE)"
    echo "  @odysseus    - coordinate multi-step tasks   (model: $MODEL_ORCHESTRATE)"
    echo ""
    echo "Skills (ca-* prefix):"
    for skill_dir in "$CLAUDE_DIR"/skills/ca-*/; do
        [[ -d "$skill_dir" ]] || continue
        echo "  /$(basename "$skill_dir")"
    done
}

main() {
    parse_args "$@"
    check_version
    check_python

    if [[ "$INSTALL_SCOPE" == "global" ]]; then
        TARGET_DIR="$HOME"
        CLAUDE_DIR="$HOME/.claude"
        echo -e "\n${GREEN}Installing to global: $CLAUDE_DIR${NC} (tier: $TIER)"
    else
        [[ -z "$TARGET_DIR" ]] && die "Target directory required, or use --global"
        [[ ! -d "$TARGET_DIR" ]] && die "Directory does not exist: $TARGET_DIR"
        TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
        CLAUDE_DIR="$TARGET_DIR/.claude"
        echo -e "\n${GREEN}Installing to: $TARGET_DIR${NC} (tier: $TIER)"
    fi

    agent_models "$TIER"
    make_dirs
    copy_agents
    copy_skills
    copy_hooks_scripts
    settings_json_merge
    install_template

    echo -e "\nValidation:"
    ERRORS=0

    grep -r '__MODEL_' "$CLAUDE_DIR/agents/" &>/dev/null && { echo -e "  ${RED}✗${NC} Found unreplaced __MODEL__ placeholders in agents"; ERRORS=$((ERRORS+1)); } \
        || info "No __MODEL__ remnants"

    check_json "$CLAUDE_DIR/hooks.json" "hooks.json" || ERRORS=$((ERRORS+1))
    check_json "$CLAUDE_DIR/settings.json" "settings.json" || ERRORS=$((ERRORS+1))

    validate_python_hooks; ERRORS=$((ERRORS + $?))
    validate_ca_skills; ERRORS=$((ERRORS + $?))

    check_directories_not_present coding-standards desloppify git-workflow collaboration-protocol security-checklist test-patterns documentation-standards performance-guide error-handling session-export refactor-guide
    ERRORS=$((ERRORS + $?))

    check_directories_not_present ca-coding-standards ca-git-workflow ca-collaboration ca-security-checklist ca-documentation ca-performance ca-error-handling ca-refactor
    ERRORS=$((ERRORS + $?))

    validate_agents; ERRORS=$((ERRORS + $?))

    report_summary

    [[ $ERRORS -gt 0 ]] && { echo -e "\n${RED}$ERRORS validation error(s) found. Check output above.${NC}"; exit 1; }
}

main "$@"
