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
PACKAGE="pro"
ZEN_MODE="false"
INSTALL_MODE="install"

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

usage() {
    echo -e "${GREEN}Claude Code Agent System Installer${NC}"
    echo "Usage: $0 <target-dir>|--global [--pro|--max|--enterprise] [--zen-mode] [--update] [--diagnose]"
    echo "  <target-dir>    : Path to your project"
    echo "  --global        : Install to global ~/.claude/"
    echo "  --pro           : Sonnet default, balanced safety, PII-aware (default)"
    echo "  --max           : Opus for planning/review/coordination, higher context budget"
    echo "  --enterprise    : Max + audit logs, HTTP DLP, fail-closed, compliance"
    echo "  --zen-mode      : Composable flag: plan-first, quiet, ask-on-ambiguity"
    echo "  --update        : Show diffs and selectively update installed files"
    echo "  --diagnose      : Run hook diagnostics without installing"
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

apply_package_models() {
    local src="$1" tmp="$2" agent_name
    agent_name=$(grep -m1 '^name:' "$src" 2>/dev/null | sed 's/^name: *//')
    case "$PACKAGE" in
        enterprise|max)
            # opus for athena, nemesis, odysseus; sonnet for rest
            case "$agent_name" in
                athena|nemesis|odysseus) cp "$src" "$tmp" ;;
                *) sed -e 's/^model: opus$/model: sonnet/' "$src" > "$tmp" ;;
            esac
            ;;
        pro)
            # sonnet for all (downgrade opus → sonnet); haiku stays haiku
            sed -e 's/^model: opus$/model: sonnet/' "$src" > "$tmp"
            ;;
    esac
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --global)     INSTALL_SCOPE="global"; shift ;;
            --pro)        PACKAGE="pro"; shift ;;
            --max)        PACKAGE="max"; shift ;;
            --enterprise) PACKAGE="enterprise"; shift ;;
            --consumer)   PACKAGE="pro"; warn "--consumer is deprecated, use --pro"; shift ;;
            --zen)        warn "--zen is deprecated, use --zen-mode"; ZEN_MODE="true"; shift ;;
            --zen-mode)   ZEN_MODE="true"; shift ;;
            --update)     INSTALL_MODE="update"; shift ;;
            --diagnose)   INSTALL_MODE="diagnose"; shift ;;
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
    local shared_constraints="" package_constraints=""
    if [[ -f "$REPO_DIR/constraints/shared.md" ]]; then
        shared_constraints=$(cat "$REPO_DIR/constraints/shared.md")
    fi
    if [[ -f "$REPO_DIR/constraints/$PACKAGE.md" ]]; then
        package_constraints=$(cat "$REPO_DIR/constraints/$PACKAGE.md")
    fi
    local tmp tmp2
    tmp=$(mktemp)
    tmp2=$(mktemp)
    apply_package_models "$src" "$tmp"
    if grep -q '__SHARED_CONSTRAINTS__' "$tmp" 2>/dev/null && [[ -n "$shared_constraints" ]]; then
        awk -v constraints="$shared_constraints" '{gsub(/__SHARED_CONSTRAINTS__/, constraints); print}' "$tmp" > "$tmp2"
    else
        cp "$tmp" "$tmp2"
    fi
    if grep -q '__PACKAGE_CONSTRAINTS__' "$tmp2" 2>/dev/null && [[ -n "$package_constraints" ]]; then
        awk -v constraints="$package_constraints" '{gsub(/__PACKAGE_CONSTRAINTS__/, constraints); print}' "$tmp2" > "$dest"
    else
        cp "$tmp2" "$dest"
    fi
    # Rewrite skill refs from plugin format (cca:skill) to manual format (cca-skill)
    local tmp3
    tmp3=$(mktemp)
    sed 's|  - cca:|  - cca-|g' "$dest" > "$tmp3" && mv "$tmp3" "$dest"
    if [[ "$ZEN_MODE" == "true" && -f "$REPO_DIR/constraints/zen.md" ]]; then
        local zen_constraints
        zen_constraints=$(cat "$REPO_DIR/constraints/zen.md")
        echo "" >> "$dest"
        echo "$zen_constraints" >> "$dest"
    fi
    rm -f "$tmp" "$tmp2"
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

    # Check skills (repo: skills/<name>/, installed: skills/<name>/)
    for skill_dir in "$REPO_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill_name=$(basename "$skill_dir")
        for skill_file in "$skill_dir"*; do
            [[ -f "$skill_file" ]] || continue
            local fname=$(basename "$skill_file")
            diff_file "skill: cca-$skill_name/$fname" "$CLAUDE_DIR/skills/cca-$skill_name/$fname" "$skill_file" || changes=$((changes + 1))
        done
    done

    # Check hook scripts
    for hook_script in "$REPO_DIR"/hooks/scripts/*.py; do
        [[ -f "$hook_script" ]] || continue
        local fname=$(basename "$hook_script")
        diff_file "hook script: $fname" "$CLAUDE_DIR/hooks/scripts/$fname" "$hook_script" || changes=$((changes + 1))
    done

    # Check hooks.json
    diff_file "hooks.json" "$CLAUDE_DIR/hooks.json" "$REPO_DIR/hooks/configs/base.json" || changes=$((changes + 1))

    # Check user-level hooks
    for hook in pre-secrets.py rtk-rewrite.sh; do
        [[ -f "$REPO_DIR/hooks/user/$hook" ]] || continue
        diff_file "user hook: $hook" "$HOME/.claude/hooks/$hook" "$REPO_DIR/hooks/user/$hook" || changes=$((changes + 1))
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

copy_skills() {
    SKILL_COUNT=0
    echo -e "\nSkills:"
    # Clean up old bare-name skills from previous installs
    for skill_dir in "$CLAUDE_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local dir_name=$(basename "$skill_dir")
        [[ "$dir_name" == cca-* ]] && continue
        rm -f "$skill_dir"SKILL.md 2>/dev/null
        rmdir "$skill_dir" 2>/dev/null && info "removed legacy /$dir_name"
    done
    for skill_dir in "$REPO_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill_name=$(basename "$skill_dir")
        local dest_name="cca-${skill_name}"
        mkdir -p "$CLAUDE_DIR/skills/$dest_name"
        for skill_file in "$skill_dir"*; do
            [[ -f "$skill_file" ]] || continue
            cp "$skill_file" "$CLAUDE_DIR/skills/$dest_name/$(basename "$skill_file")"
        done
        info "$dest_name"
        SKILL_COUNT=$((SKILL_COUNT + 1))
    done
}

copy_hooks_scripts() {
    echo -e "\nHooks:"
    for hook in pre-secrets.py rtk-rewrite.sh; do
        local src="$REPO_DIR/hooks/user/$hook"
        local dest="$HOME/.claude/hooks/$hook"
        [[ -f "$src" ]] && { cp "$src" "$dest"; chmod +x "$dest"; info "$hook -> ~/.claude/hooks/ (user-level)"; }
    done

    # Install package-specific hooks.json (fall back to base hooks.json)
    local hooks_src="$REPO_DIR/hooks/configs/$PACKAGE.json"
    [[ -f "$hooks_src" ]] || hooks_src="$REPO_DIR/hooks/configs/base.json"
    cp "$hooks_src" "$CLAUDE_DIR/hooks.json"
    info "hooks.json -> project hooks (package: $PACKAGE)"

    if [[ -d "$REPO_DIR/hooks/scripts" ]]; then
        # Self-install: symlink instead of copy to avoid duplication
        local resolved_repo resolved_target
        resolved_repo=$(cd "$REPO_DIR" && pwd -P)
        resolved_target=$(cd "$TARGET_DIR" && pwd -P 2>/dev/null || echo "")
        if [[ "$resolved_repo" == "$resolved_target" ]]; then
            rm -rf "$CLAUDE_DIR/hooks/scripts"
            ln -sfn "../../hooks/scripts" "$CLAUDE_DIR/hooks/scripts"
            HOOK_COUNT=$(ls -1 "$REPO_DIR/hooks/scripts/"*.py 2>/dev/null | wc -l | tr -d ' ')
            info "$HOOK_COUNT hook scripts -> symlinked (self-install)"
        else
            cp -r "$REPO_DIR/hooks/scripts/"* "$CLAUDE_DIR/hooks/scripts/" 2>/dev/null || true
            chmod +x "$CLAUDE_DIR/hooks/scripts/"*.py 2>/dev/null || true
            HOOK_COUNT=$(ls -1 "$CLAUDE_DIR/hooks/scripts/" 2>/dev/null | wc -l | tr -d ' ')
            info "$HOOK_COUNT hook scripts -> project hooks"
        fi
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
        "hooks": [{"type": "command", "command": "python3 \"$HOME\"/.claude/hooks/pre-secrets.py", "timeout": 5}]
    }'

    if command -v jq &>/dev/null; then
        if [[ -f "$SETTINGS_FILE" ]]; then
            jq --argjson pre "$GUARD_SECRETS_ENTRY" '
                .env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] //= "1" |
                .env["DISABLE_AUTOUPDATER"] //= "1" |
                (if .autoUpdatesChannel then .autoUpdatesChannel = "latest" else . end) |
                .hooks.PreToolUse = ((.hooks.PreToolUse // []) | if any(.hooks[0].command? | test("pre-secrets")) then . else . + [$pre] end) |
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
        # Use package-specific CLAUDE.md (fall back to base)
        local template_src="$REPO_DIR/templates/CLAUDE-$PACKAGE.md"
        [[ -f "$template_src" ]] || template_src="$REPO_DIR/templates/CLAUDE.md"
        [[ -f "$CLAUDE_MD" ]] && warn "CLAUDE.md already exists at target - skipping (review $template_src manually)" \
            || { cp "$template_src" "$CLAUDE_MD"; info "CLAUDE.md installed (package: $PACKAGE)"; }
    else
        warn "Skipping CLAUDE.md for global install (install per-project instead)"
    fi
}

install_mcp_harness() {
    echo -e "\nMCP Harness:"
    if ! command -v bun &>/dev/null; then
        warn "Bun not found — MCP harness not installed. Install bun: https://bun.sh"
        return
    fi
    if [[ ! -f "$REPO_DIR/mcp/package.json" ]]; then
        warn "mcp/package.json not found — skipping"
        return
    fi
    (cd "$REPO_DIR/mcp" && bun install --production 2>/dev/null) || { warn "bun install failed for MCP harness"; return; }
    # Generate .mcp.json at target
    local mcp_json="$TARGET_DIR/.mcp.json"
    local harness_path="$REPO_DIR/mcp/src/index.ts"
    if [[ "$INSTALL_SCOPE" == "global" ]]; then
        mcp_json="$HOME/.mcp.json"
    fi
    cat > "$mcp_json" <<MCPEOF
{
  "mcpServers": {
    "cca-harness": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "$harness_path"],
      "env": { "CCA_PACKAGE": "$PACKAGE" }
    }
  }
}
MCPEOF
    info "MCP harness configured (package: $PACKAGE)"
    info ".mcp.json written to $mcp_json"
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

validate_cca_skills() {
    SKILL_ERRORS=0
    for skill_dir in "$CLAUDE_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        [[ -f "$skill_dir/SKILL.md" ]] || {
            echo -e "  ${RED}✗${NC} Missing SKILL.md$(basename "$skill_dir")"
            SKILL_ERRORS=$((SKILL_ERRORS + 1))
        }
    done
    [[ $SKILL_ERRORS -eq 0 ]] && info "All skills have SKILL.md"
    return $SKILL_ERRORS
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
    echo -e "\n${GREEN}Done!${NC} Installed $AGENT_COUNT agents, $SKILL_COUNT skills (package: $PACKAGE)"
    echo ""
    echo "Package: $PACKAGE$([ "$ZEN_MODE" = "true" ] && echo " + zen-mode")"
    case "$PACKAGE" in
        enterprise) echo "  Opus: athena, nemesis, odysseus | Fail-closed | Audit logs | HTTP DLP | Compliance" ;;
        max)        echo "  Opus: athena, nemesis, odysseus | Higher context budget | Same guardrails as pro" ;;
        pro)        echo "  Sonnet all | Balanced | PII-aware | Streaming-safe" ;;
    esac
    [[ "$ZEN_MODE" == "true" ]] && echo "  Zen: plan-first, quiet output, ask-on-ambiguity"
    echo ""
    echo "Agents:"
    for agent in "$CLAUDE_DIR"/agents/*.md; do
        [[ -f "$agent" ]] || continue
        local name=$(basename "$agent" .md)
        local model=$(grep -m1 '^model:' "$agent" 2>/dev/null | sed 's/^model: *//')
        printf "  @%-12s (%s)\n" "$name" "$model"
    done
    echo ""
    echo "Skills:"
    for skill_dir in "$CLAUDE_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        echo "  /$(basename "$skill_dir")"
    done
    echo ""
    echo "Tip: install as plugin for cca: prefix: claude plugin install cca"
}

diagnose_hooks() {
    echo -e "\n${GREEN}Hook Diagnostics:${NC}"
    local total=0 passed=0 failed=0

    for script in "$CLAUDE_DIR/hooks/scripts/"*.py; do
        [[ -f "$script" ]] || continue
        local name=$(basename "$script")
        [[ "$name" == "_lib.py" ]] && continue
        total=$((total + 1))

        local result
        result=$(echo '{"tool_name":"Bash","tool_input":{"command":"echo test"},"hook_event_name":"PreToolUse"}' | \
            python3 "$script" 2>&1)
        local exit_code=$?

        if [[ $exit_code -eq 0 ]]; then
            info "$name: OK"
            passed=$((passed + 1))
        else
            echo -e "  ${RED}✗${NC} $name: exit code $exit_code"
            [[ -n "$result" ]] && echo "    $result" | head -3
            failed=$((failed + 1))
        fi
    done

    for hook in "$HOME/.claude/hooks/"*.py "$HOME/.claude/hooks/"*.sh; do
        [[ -f "$hook" ]] || continue
        local name=$(basename "$hook")
        total=$((total + 1))

        local result
        if [[ "$hook" == *.py ]]; then
            result=$(echo '{"tool_name":"Bash","tool_input":{"command":"echo test"}}' | \
                python3 "$hook" 2>&1)
        else
            result=$(echo '{"tool_name":"Bash","tool_input":{"command":"echo test"}}' | \
                bash "$hook" 2>&1)
        fi
        local exit_code=$?

        if [[ $exit_code -eq 0 ]]; then
            info "$name (user-level): OK"
            passed=$((passed + 1))
        else
            echo -e "  ${RED}✗${NC} $name (user-level): exit code $exit_code"
            [[ -n "$result" ]] && echo "    $result" | head -3
            failed=$((failed + 1))
        fi
    done

    echo -e "\n${GREEN}Results:${NC} $passed/$total passed"
    [[ $failed -gt 0 ]] && echo -e "${RED}$failed hook(s) failed.${NC}"
}

main() {
    parse_args "$@"
    check_version
    check_python

    if [[ "$INSTALL_SCOPE" == "global" ]]; then
        TARGET_DIR="$HOME"
        CLAUDE_DIR="$HOME/.claude"
        echo -e "\n${GREEN}Installing to global: $CLAUDE_DIR${NC} (package: $PACKAGE)"
    else
        [[ -z "$TARGET_DIR" ]] && die "Target directory required, or use --global"
        [[ ! -d "$TARGET_DIR" ]] && die "Directory does not exist: $TARGET_DIR"
        TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
        CLAUDE_DIR="$TARGET_DIR/.claude"
        echo -e "\n${GREEN}Installing to: $TARGET_DIR${NC} (package: $PACKAGE)"
    fi

    if [[ "$INSTALL_MODE" == "diagnose" ]]; then
        diagnose_hooks
        exit 0
    fi

    # Update mode: show diffs first, then proceed with normal install
    [[ "$INSTALL_MODE" == "update" ]] && update_interactive

    make_dirs
    copy_agents
    copy_skills
    copy_hooks_scripts
    install_global_extras
    settings_json_merge
    install_template
    install_mcp_harness

    echo -e "\nValidation:"
    ERRORS=0

    grep -r '__SHARED_CONSTRAINTS__' "$CLAUDE_DIR/agents/" &>/dev/null && { echo -e "  ${RED}✗${NC} Found unreplaced __SHARED_CONSTRAINTS__ in agents"; ERRORS=$((ERRORS+1)); } \
        || info "No __SHARED_CONSTRAINTS__ remnants"

    grep -r '__PACKAGE_CONSTRAINTS__' "$CLAUDE_DIR/agents/" &>/dev/null && { echo -e "  ${RED}✗${NC} Found unreplaced __PACKAGE_CONSTRAINTS__ in agents"; ERRORS=$((ERRORS+1)); } \
        || info "No __PACKAGE_CONSTRAINTS__ remnants"

    check_json "$CLAUDE_DIR/hooks.json" "hooks.json" || ERRORS=$((ERRORS+1))
    check_json "$CLAUDE_DIR/settings.json" "settings.json" || ERRORS=$((ERRORS+1))

    validate_python_hooks; ERRORS=$((ERRORS + $?))
    validate_cca_skills; ERRORS=$((ERRORS + $?))

    validate_agents; ERRORS=$((ERRORS + $?))

    report_summary

    [[ $ERRORS -gt 0 ]] && { echo -e "\n${RED}$ERRORS validation error(s) found. Check output above.${NC}"; exit 1; } || true

    # RTK install prompt - always last
    install_rtk
}

main "$@"
