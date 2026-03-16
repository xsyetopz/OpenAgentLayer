#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
TARGET_DIR=""
INSTALL_SCOPE="project"
TIER="pro"
INSTALL_MODE="install"

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

usage() {
    echo -e "${GREEN}Claude Code Agent System Installer${NC}"
    echo "Usage: $0 <target-dir>|--global [--pro|--max] [--update]"
    echo "  <target-dir>  : Path to your project"
    echo "  --global      : Install to global ~/.claude/"
    echo "  --pro         : Sonnet tier (default)"
    echo "  --max         : Opus/Sonnet tier"
    echo "  --update      : Show diffs and selectively update installed files"
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

detect_plugin_conflict() {
    local plugin_cache="$HOME/.claude/plugins/cache/ca"
    local settings="$CLAUDE_DIR/settings.json"
    local conflict=0

    if [[ -d "$plugin_cache" ]]; then
        warn "ClaudeAgents plugin detected in plugin cache: $plugin_cache"
        conflict=1
    fi

    if [[ -f "$settings" ]] && command -v jq &>/dev/null; then
        if jq -e '.enabledPlugins | keys[] | select(. == "ca" or test("ClaudeAgents"))' "$settings" &>/dev/null; then
            warn "ClaudeAgents plugin enabled in settings.json"
            conflict=1
        fi
    fi

    if [[ $conflict -eq 1 ]]; then
        echo -e "\n${YELLOW}ClaudeAgents appears to be installed as a plugin.${NC}"
        echo "Running both plugin and manual install may cause conflicts (duplicate agents/skills)."
        echo "Consider disabling the plugin first: claude plugin uninstall ca"
        echo ""
        read -rp "Continue with manual install anyway? [y/N] " confirm
        [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
    fi
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
            --update) INSTALL_MODE="update"; shift ;;
            -h|--help) usage ;;
            *)
                [[ -z "$TARGET_DIR" ]] && TARGET_DIR="$1" || die "Too many arguments"
                shift ;;
        esac
    done
}

make_dirs() {
    mkdir -p "$CLAUDE_DIR"/{agents,skills/ca,hooks/scripts}
    detect_plugin_conflict
    mkdir -p "$HOME/.claude/hooks"
}

substitute_and_copy() {
    local src="$1"
    local dest="$2"
    local shared_constraints=""
    if [[ -f "$REPO_DIR/templates/shared-constraints.md" ]]; then
        shared_constraints=$(cat "$REPO_DIR/templates/shared-constraints.md")
    fi
    local tmp
    tmp=$(mktemp)
    sed -e "s/__MODEL_ARCHITECT__/$MODEL_ARCHITECT/g" \
        -e "s/__MODEL_IMPLEMENT__/$MODEL_IMPLEMENT/g" \
        -e "s/__MODEL_AUDIT__/$MODEL_AUDIT/g" \
        -e "s/__MODEL_TEST__/$MODEL_TEST/g" \
        -e "s/__MODEL_DOCUMENT__/$MODEL_DOCUMENT/g" \
        -e "s/__MODEL_INVESTIGATE__/$MODEL_INVESTIGATE/g" \
        -e "s/__MODEL_ORCHESTRATE__/$MODEL_ORCHESTRATE/g" \
        "$src" > "$tmp"
    if grep -q '__SHARED_CONSTRAINTS__' "$tmp" 2>/dev/null && [[ -n "$shared_constraints" ]]; then
        awk -v constraints="$shared_constraints" '{gsub(/__SHARED_CONSTRAINTS__/, constraints); print}' "$tmp" > "$dest"
    else
        cp "$tmp" "$dest"
    fi
    rm -f "$tmp"
}

# --- Diff helpers for --update mode ---

diff_file() {
    local label="$1"
    local installed="$2"
    local repo_src="$3"
    [[ -f "$installed" ]] || return 0
    [[ -f "$repo_src" ]] || return 0
    if ! diff -q "$installed" "$repo_src" &>/dev/null; then
        echo -e "\n${BLUE}--- $label ---${NC}"
        diff --color=auto -u "$installed" "$repo_src" || true
        return 1
    fi
    return 0
}

diff_agent() {
    local label="$1"
    local installed="$2"
    local repo_src="$3"
    [[ -f "$installed" ]] || return 0
    [[ -f "$repo_src" ]] || return 0
    local tmp_substituted
    tmp_substituted=$(mktemp)
    substitute_and_copy "$repo_src" "$tmp_substituted"
    if ! diff -q "$installed" "$tmp_substituted" &>/dev/null; then
        echo -e "\n${BLUE}--- $label ---${NC}"
        diff --color=auto -u "$installed" "$tmp_substituted" || true
        rm -f "$tmp_substituted"
        return 1
    fi
    rm -f "$tmp_substituted"
    return 0
}

update_interactive() {
    echo -e "\n${GREEN}Update mode: checking for changes...${NC}"
    local changes=0

    # Check agents
    for agent in "$REPO_DIR"/agents/*.md; do
        [[ -f "$agent" ]] || continue
        local name=$(basename "$agent")
        diff_agent "agent: $name" "$CLAUDE_DIR/agents/$name" "$agent" || changes=$((changes + 1))
    done

    # Check skills (repo: skills/<name>/, installed: skills/ca/<name>/)
    for skill_dir in "$REPO_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill_name=$(basename "$skill_dir")
        for skill_file in "$skill_dir"*; do
            [[ -f "$skill_file" ]] || continue
            local fname=$(basename "$skill_file")
            diff_file "skill: ca:$skill_name/$fname" "$CLAUDE_DIR/skills/ca/$skill_name/$fname" "$skill_file" || changes=$((changes + 1))
        done
    done

    # Check hook scripts
    for hook_script in "$REPO_DIR"/hooks/scripts/*.py; do
        [[ -f "$hook_script" ]] || continue
        local fname=$(basename "$hook_script")
        diff_file "hook script: $fname" "$CLAUDE_DIR/hooks/scripts/$fname" "$hook_script" || changes=$((changes + 1))
    done

    # Check hooks.json
    diff_file "hooks.json" "$CLAUDE_DIR/hooks.json" "$REPO_DIR/hooks/hooks.json" || changes=$((changes + 1))

    # Check user-level hooks
    for hook in guard-secrets.py rtk-rewrite.sh; do
        [[ -f "$REPO_DIR/hooks/$hook" ]] || continue
        diff_file "user hook: $hook" "$HOME/.claude/hooks/$hook" "$REPO_DIR/hooks/$hook" || changes=$((changes + 1))
    done

    # Check global extras
    if [[ "$INSTALL_SCOPE" == "global" ]]; then
        diff_file "statusline-command.sh" "$HOME/.claude/statusline-command.sh" "$REPO_DIR/templates/statusline-command.sh" || changes=$((changes + 1))
    fi

    if [[ $changes -eq 0 ]]; then
        info "All installed files are up to date"
        echo ""
        read -rp "Continue with full reinstall anyway? [y/N] " confirm
        [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
    else
        echo -e "\n${YELLOW}$changes file(s) differ from repo source.${NC}"
        read -rp "Apply updates? [Y/n] " confirm
        [[ "$confirm" =~ ^[Nn]$ ]] && { echo "Aborted."; exit 0; }
    fi
    echo ""
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

migrate_old_skills() {
    # Remove old ca-* skill directories from target
    local old_count=0
    for old_dir in "$CLAUDE_DIR"/skills/ca-*/; do
        [[ -d "$old_dir" ]] || continue
        rm -rf "$old_dir"
        old_count=$((old_count + 1))
    done
    [[ $old_count -gt 0 ]] && warn "Removed $old_count old ca-* skill directories (migrated to ca/ prefix)"
}

copy_skills() {
    SKILL_COUNT=0
    migrate_old_skills
    echo -e "\nSkills:"
    # Skills live at skills/<name>/ in repo, install to skills/ca/<name>/ for manual installs
    for skill_dir in "$REPO_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill_name=$(basename "$skill_dir")
        mkdir -p "$CLAUDE_DIR/skills/ca/$skill_name"
        for skill_file in "$skill_dir"*; do
            [[ -f "$skill_file" ]] || continue
            cp "$skill_file" "$CLAUDE_DIR/skills/ca/$skill_name/$(basename "$skill_file")"
        done
        info "ca:$skill_name"
        SKILL_COUNT=$((SKILL_COUNT + 1))
    done
}

copy_hooks_scripts() {
    echo -e "\nHooks:"
    for hook in guard-secrets.py rtk-rewrite.sh; do
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

install_global_extras() {
    [[ "$INSTALL_SCOPE" != "global" ]] && return
    echo -e "\nGlobal extras:"
    if [[ -f "$REPO_DIR/templates/statusline-command.sh" ]]; then
        cp "$REPO_DIR/templates/statusline-command.sh" "$HOME/.claude/statusline-command.sh"
        chmod +x "$HOME/.claude/statusline-command.sh"
        info "statusline-command.sh -> ~/.claude/"
    fi
}

settings_json_merge_global() {
    SETTINGS_FILE="$CLAUDE_DIR/settings.json"
    local TEMPLATE="$REPO_DIR/templates/settings-global.json"
    [[ -f "$TEMPLATE" ]] || { warn "templates/settings-global.json not found - skipping global settings"; return; }

    # Substitute __HOME__ placeholder
    local tmp_template
    tmp_template=$(mktemp)
    sed "s|__HOME__|$HOME|g" "$TEMPLATE" > "$tmp_template"

    if ! command -v jq &>/dev/null; then
        warn "jq not found - copying template as settings.json (no merge)"
        [[ -f "$SETTINGS_FILE" ]] && cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
        cp "$tmp_template" "$SETTINGS_FILE"
        rm -f "$tmp_template"
        return
    fi

    if [[ -f "$SETTINGS_FILE" ]]; then
        cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
        info "Backed up existing settings.json"

        # Deep merge: template wins for framework keys, user wins for extensible keys
        jq -s '
            # $tpl = .[0] (template), $usr = .[1] (existing user)
            .[0] as $tpl | .[1] as $usr |

            # Start with template as base
            $tpl *

            # User-extensible keys: merge with user values winning conflicts
            {
                env: ($tpl.env * ($usr.env // {})),
                enabledPlugins: ($tpl.enabledPlugins * ($usr.enabledPlugins // {})),
                extraKnownMarketplaces: ($tpl.extraKnownMarketplaces * ($usr.extraKnownMarketplaces // {})),
                mcpServers: (($tpl.mcpServers // {}) * ($usr.mcpServers // {}))
            } *

            # Preserve user keys not in template
            ($usr | to_entries | map(select(.key as $k | ($tpl | has($k)) | not)) | from_entries)
        ' "$tmp_template" "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
        info "Merged template into existing settings.json (user extensions preserved)"
    else
        cp "$tmp_template" "$SETTINGS_FILE"
        info "Created settings.json from template"
    fi
    rm -f "$tmp_template"
}

settings_json_merge_project() {
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
                .hooks.PreToolUse = ((.hooks.PreToolUse // []) | if any(.hooks[0].command? | test("guard-secrets")) then . else . + [$pre] end) |
                .permissions.deny = ((.permissions.deny // []) + ["Agent(Explore)", "Agent(Plan)", "Agent(general-purpose)"] | unique)
            ' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
            info "Merged into existing settings.json"
        else
            jq -n --argjson pre "$GUARD_SECRETS_ENTRY" '{
                env: {
                    CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
                    DISABLE_AUTOUPDATER: "1"
                },
                autoUpdatesChannel: "latest",
                permissions: {
                    deny: ["Agent(Explore)", "Agent(Plan)", "Agent(general-purpose)"]
                },
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

settings_json_merge() {
    echo -e "\nSettings:"
    if [[ "$INSTALL_SCOPE" == "global" ]]; then
        settings_json_merge_global
    else
        settings_json_merge_project
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

install_rtk() {
    echo -e "\nRTK (token savings):"

    if command -v rtk &>/dev/null; then
        local rtk_ver
        rtk_ver=$(rtk --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        info "RTK already installed (v${rtk_ver})"
        return
    fi

    read -rp "  Install RTK for token savings? [Y/n] " confirm
    [[ "$confirm" =~ ^[Nn]$ ]] && { warn "Skipping RTK install"; return; }

    if command -v brew &>/dev/null; then
        echo "  Installing via Homebrew..."
        brew install rtk-ai/tap/rtk || { warn "brew install failed - try manual install: https://github.com/rtk-ai/rtk#installation"; return; }
    else
        echo "  Installing via curl..."
        curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh || { warn "curl install failed - try manual install: https://github.com/rtk-ai/rtk#installation"; return; }
    fi

    # Verify installation (may need PATH refresh)
    if command -v rtk &>/dev/null; then
        info "RTK installed successfully"
        echo "  Running rtk init --global..."
        rtk init --global || warn "rtk init --global failed - run manually after install"
    else
        warn "RTK binary not found in PATH after install. You may need to restart your shell, then run: rtk init --global"
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
    for skill_dir in "$CLAUDE_DIR"/skills/ca/*/; do
        [[ -d "$skill_dir" ]] || continue
        [[ -f "$skill_dir/SKILL.md" ]] || {
            echo -e "  ${RED}✗${NC} Missing SKILL.md in ca/$(basename "$skill_dir")"
            SKILL_ERRORS=$((SKILL_ERRORS + 1))
        }
    done
    [[ $SKILL_ERRORS -eq 0 ]] && info "All ca:* skills have SKILL.md"
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
    echo "Skills (ca: prefix):"
    for skill_dir in "$CLAUDE_DIR"/skills/ca/*/; do
        [[ -d "$skill_dir" ]] || continue
        echo "  /ca:$(basename "$skill_dir")"
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

    # Update mode: show diffs first, then proceed with normal install
    [[ "$INSTALL_MODE" == "update" ]] && update_interactive

    make_dirs
    copy_agents
    copy_skills
    copy_hooks_scripts
    install_global_extras
    settings_json_merge
    install_template

    echo -e "\nValidation:"
    ERRORS=0

    grep -r '__MODEL_' "$CLAUDE_DIR/agents/" &>/dev/null && { echo -e "  ${RED}✗${NC} Found unreplaced __MODEL__ placeholders in agents"; ERRORS=$((ERRORS+1)); } \
        || info "No __MODEL__ remnants"

    grep -r '__SHARED_CONSTRAINTS__' "$CLAUDE_DIR/agents/" &>/dev/null && { echo -e "  ${RED}✗${NC} Found unreplaced __SHARED_CONSTRAINTS__ in agents"; ERRORS=$((ERRORS+1)); } \
        || info "No __SHARED_CONSTRAINTS__ remnants"

    check_json "$CLAUDE_DIR/hooks.json" "hooks.json" || ERRORS=$((ERRORS+1))
    check_json "$CLAUDE_DIR/settings.json" "settings.json" || ERRORS=$((ERRORS+1))

    validate_python_hooks; ERRORS=$((ERRORS + $?))
    validate_ca_skills; ERRORS=$((ERRORS + $?))

    check_directories_not_present coding-standards desloppify git-workflow collaboration-protocol security-checklist test-patterns documentation-standards performance-guide error-handling session-export refactor-guide
    ERRORS=$((ERRORS + $?))

    check_directories_not_present ca-coding-standards ca-git-workflow ca-collaboration ca-security-checklist ca-documentation ca-performance ca-error-handling ca-refactor
    ERRORS=$((ERRORS + $?))

    # Check for old ca-* flat skill directories (pre-plugin migration)
    check_directories_not_present ca-review-code ca-desloppify ca-ship ca-decide ca-audit-security ca-test-patterns ca-document ca-optimize ca-handle-errors ca-session-export ca-commit
    ERRORS=$((ERRORS + $?))

    validate_agents; ERRORS=$((ERRORS + $?))

    report_summary

    [[ $ERRORS -gt 0 ]] && { echo -e "\n${RED}$ERRORS validation error(s) found. Check output above.${NC}"; exit 1; }

    # RTK install prompt — always last
    install_rtk
}

main "$@"
