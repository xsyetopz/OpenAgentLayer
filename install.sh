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
    echo "Usage: $0 <target-dir>|--global [--pro|--max] [--zen-mode] [--update] [--diagnose]"
    echo "  <target-dir>    : Path to your project"
    echo "  --global        : Install to global ~/.claude/"
    echo "  --pro           : Claude Pro — opusplan orchestrator, sonnet agents (default)"
    echo "  --max           : Claude Max 5x/20x — opusplan orchestrator, opus for planning/review"
    echo "  --zen-mode      : Composable flag: plan-first, quiet, ask-on-ambiguity"
    echo "  --update        : Show diffs and selectively update installed files"
    echo "  --diagnose      : Run hook diagnostics without installing"
    exit 1
}

check_version() {
    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode — skipping claude CLI version check"
        return
    fi
    command -v claude &>/dev/null || die "claude CLI not found. Install Claude Code first."
    version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    [[ -z "$version" ]] && { warn "Could not parse claude version, proceeding anyway"; return; }
    IFS='.' read -r major minor patch <<< "$version"
    (( major > 2 || (major == 2 && (minor > 1 || (minor == 1 && patch >= 75))) )) || die "Claude Code v${version} is too old. Requires >= 2.1.75"
    info "Claude Code v${version}"
}

check_node() {
    command -v node &>/dev/null || die "node not found. Hook scripts require Node.js >= 18."
    local node_ver
    node_ver=$(node --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
    (( node_ver >= 18 )) || die "Node.js v${node_ver} is too old. Requires >= 18."
    info "node found: $(node --version 2>&1)"
}

apply_package_models() {
    local src="$1" tmp="$2" agent_name
    agent_name=$(grep -m1 '^name:' "$src" 2>/dev/null | sed 's/^name: *//' | tr '[:upper:]' '[:lower:]')
    case "$PACKAGE" in
        max)
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

# --- TUI primitives (pure bash, no external dependencies) ---

SELECTED_AGENTS=""
SELECTED_SKILLS=""

# Repeat a character N times without seq (pure bash)
_repeat_char() {
    local char="$1" count="$2" result=""
    for ((i = 0; i < count; i++)); do result+="$char"; done
    printf '%s' "$result"
}

tui_clear_screen() {
    printf '\033[2J\033[H'
}

tui_hide_cursor() {
    printf '\033[?25l'
}

tui_show_cursor() {
    printf '\033[?25h'
}

tui_move_to() {
    printf '\033[%d;%dH' "$1" "$2"
}

tui_box() {
    local title="$1" width="$2" start_row="$3"
    local border_top
    local inner=$((width - 4))
    border_top=$(_repeat_char '─' $((inner + 2)))
    tui_move_to "$start_row" 2
    printf "${GREEN}╭─ %s %s╮${NC}" "$title" "${border_top:$((${#title} + 1))}"
    tui_move_to $((start_row + 1)) 2
    printf "${GREEN}│${NC}%*s${GREEN}│${NC}" "$((inner + 2))" ""
}

tui_box_bottom() {
    local width="$1" row="$2" hint="$3"
    local inner=$((width - 4))
    local border
    border=$(_repeat_char '─' $((inner + 2)))
    tui_move_to "$row" 2
    if [[ -n "$hint" ]]; then
        printf "${GREEN}╰%s %s╯${NC}" "${border:$((${#hint} + 1))}" "$hint"
    else
        printf "${GREEN}╰%s╯${NC}" "$border"
    fi
}

tui_box_line() {
    local width="$1" row="$2" content="$3"
    local inner=$((width - 4))
    tui_move_to "$row" 2
    printf "${GREEN}│${NC}  %-${inner}s${GREEN}│${NC}" "$content"
}

tui_read_key() {
    local key
    IFS= read -rsn1 key 2>/dev/null
    if [[ "$key" == $'\x1b' ]]; then
        read -rsn2 -t 0.1 key 2>/dev/null
        case "$key" in
            '[A') echo "up" ;;
            '[B') echo "down" ;;
            *) echo "escape" ;;
        esac
    elif [[ "$key" == "" ]]; then
        echo "enter"
    elif [[ "$key" == " " ]]; then
        echo "space"
    elif [[ "$key" == "q" ]]; then
        echo "quit"
    else
        echo "$key"
    fi
}

# Single-select: returns index (0-based)
tui_select_one() {
    local title="$1"
    shift
    local options=("$@")
    local selected=0
    local count=${#options[@]}
    local width=54
    while true; do
        tui_clear_screen
        tui_box "$title" "$width" 2
        tui_box_line "$width" 3 ""
        local row=4
        for i in "${!options[@]}"; do
            local marker="  "
            local prefix="○"
            if [[ $i -eq $selected ]]; then
                marker="${GREEN}›${NC} "
                prefix="${GREEN}●${NC}"
            fi
            tui_box_line "$width" "$row" ""
            tui_move_to "$row" 4
            printf "%b %b %s" "$marker" "$prefix" "${options[$i]}"
            row=$((row + 1))
        done
        tui_box_line "$width" "$row" ""
        tui_box_bottom "$width" $((row + 1)) "↑↓ navigate · ⏎ select"

        local key
        key=$(tui_read_key)
        case "$key" in
            up)    selected=$(( (selected - 1 + count) % count )) ;;
            down)  selected=$(( (selected + 1) % count )) ;;
            enter) break ;;
            quit)  tui_show_cursor; exit 0 ;;
        esac
    done
    echo "$selected"
}

# Multi-select: returns space-separated indices
tui_select_many() {
    local title="$1"
    shift
    local labels=("$@")
    local count=${#labels[@]}
    local width=56
    local cursor=0
    # Initialize all selected
    local -a checked
    for i in "${!labels[@]}"; do
        checked[i]=1
    done

    while true; do
        tui_clear_screen
        tui_box "$title" "$width" 2
        tui_box_line "$width" 3 ""
        local row=4
        for i in "${!labels[@]}"; do
            local marker="  "
            local check="[ ]"
            if [[ $i -eq $cursor ]]; then
                marker="${GREEN}›${NC} "
            fi
            if [[ ${checked[$i]} -eq 1 ]]; then
                check="${GREEN}[✓]${NC}"
            fi
            tui_box_line "$width" "$row" ""
            tui_move_to "$row" 4
            printf "%b %b %s" "$marker" "$check" "${labels[$i]}"
            row=$((row + 1))
        done
        tui_box_line "$width" "$row" ""
        row=$((row + 1))
        tui_box_line "$width" "$row" ""
        tui_move_to "$row" 5
        printf "[a] all  [n] none"
        row=$((row + 1))
        tui_box_line "$width" "$row" ""
        tui_box_bottom "$width" $((row + 1)) "↑↓ navigate · ␣ toggle · ⏎ done"

        local key
        key=$(tui_read_key)
        case "$key" in
            up)    cursor=$(( (cursor - 1 + count) % count )) ;;
            down)  cursor=$(( (cursor + 1) % count )) ;;
            space) checked[cursor]=$(( 1 - checked[cursor] )) ;;
            enter) break ;;
            a)     for i in "${!labels[@]}"; do checked[i]=1; done ;;
            n)     for i in "${!labels[@]}"; do checked[i]=0; done ;;
            quit)  tui_show_cursor; exit 0 ;;
        esac
    done
    local result=""
    for i in "${!labels[@]}"; do
        [[ ${checked[$i]} -eq 1 ]] && result="$result $i"
    done
    echo "$result"
}

interactive_mode() {
    tui_hide_cursor
    trap 'tui_show_cursor' EXIT

    # Screen 1: Install scope
    local scope_result
    scope_result=$(tui_select_one "Install Location" \
        "This directory  ($(pwd))" \
        "Global          (~/.claude/)" \
    )
    case "$scope_result" in
        0) INSTALL_SCOPE="project"; TARGET_DIR="$(pwd)" ;;
        1) INSTALL_SCOPE="global" ;;
    esac

    # Screen 2: Package tier
    local tier_result
    tier_result=$(tui_select_one "Package Tier" \
        "Pro   Claude Pro — opusplan, sonnet agents" \
        "Max   Claude Max 5x/20x — opusplan + opus agents" \
    )
    case "$tier_result" in
        0) PACKAGE="pro" ;;
        1) PACKAGE="max" ;;
    esac

    # Screen 3: Agent selection
    local agent_indices
    agent_indices=$(tui_select_many "Agents" \
        "@athena      Plans, designs, architects" \
        "@hephaestus  Writes code, fixes bugs" \
        "@nemesis     Reviews code, audits security" \
        "@atalanta    Runs tests, finds root causes" \
        "@calliope    Writes docs (markdown only)" \
        "@hermes      Explores codebases, traces flows" \
        "@odysseus    Coordinates multi-step tasks" \
    )
    local agent_names=(athena hephaestus nemesis atalanta calliope hermes odysseus)
    SELECTED_AGENTS=""
    for idx in $agent_indices; do
        SELECTED_AGENTS="$SELECTED_AGENTS ${agent_names[$idx]}"
    done

    # Screen 4: Skill selection
    local skill_indices
    skill_indices=$(tui_select_many "Skills" \
        "review-code     Code review" \
        "desloppify      Remove AI slop" \
        "ship            Commits, branches, PRs" \
        "decide          Present options + tradeoffs" \
        "audit-security  Security audit (OWASP)" \
        "test-patterns   Test strategy + coverage" \
        "document        Docs: READMEs, ADRs" \
        "optimize        Performance optimization" \
        "handle-errors   Error handling patterns" \
        "session-export  Session handoff" \
    )
    local skill_names=(review-code desloppify ship decide audit-security test-patterns document optimize handle-errors session-export)
    SELECTED_SKILLS=""
    for idx in $skill_indices; do
        SELECTED_SKILLS="$SELECTED_SKILLS ${skill_names[$idx]}"
    done

    # Screen 5: Options
    local option_result
    option_result=$(tui_select_many "Options" \
        "Zen mode     (plan-first, quiet, ask-first)" \
        "Agent Teams  (experimental multi-agent)" \
    )
    for idx in $option_result; do
        case "$idx" in
            0) ZEN_MODE="true" ;;
        esac
    done

    tui_show_cursor
    tui_clear_screen
    echo -e "${GREEN}ClaudeAgents Installer${NC}"
    echo ""
    echo "  Scope:    $INSTALL_SCOPE"
    echo "  Tier:     $PACKAGE"
    echo "  Agents:   $(echo "$SELECTED_AGENTS" | xargs)"
    echo "  Skills:   $(echo "$SELECTED_SKILLS" | xargs)"
    echo "  Zen mode: $ZEN_MODE"
    echo ""
    echo -e "Installing..."
    echo ""
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --global)     INSTALL_SCOPE="global"; shift ;;
            --pro)        PACKAGE="pro"; shift ;;
            --max)        PACKAGE="max"; shift ;;
            --enterprise) warn "--enterprise removed, using --max"; PACKAGE="max"; shift ;;
            --consumer)   PACKAGE="pro"; warn "--consumer is deprecated, use --pro"; shift ;;
            --zen)        warn "--zen is deprecated, use --zen-mode"; ZEN_MODE="true"; shift ;;
            --zen-mode)   ZEN_MODE="true"; shift ;;
            --update)     INSTALL_MODE="update"; shift ;;
            --diagnose)   INSTALL_MODE="diagnose"; shift ;;
            -h|--help) usage ;;
            *)
                if [[ -z "$TARGET_DIR" ]]; then
                    TARGET_DIR="$1"
                else
                    die "Too many arguments"
                fi
                shift ;;
        esac
    done
}

make_dirs() {
    mkdir -p "$CLAUDE_DIR"/{agents,skills,hooks/scripts/{pre,post,session},commands,output-styles}
    mkdir -p "$HOME/.claude/hooks"
}

substitute_and_copy() {
    local src="$1"
    local dest="$2"
    local tmp
    tmp=$(mktemp)
    apply_package_models "$src" "$tmp"
    local pkg_file=""
    [[ -f "$REPO_DIR/constraints/$PACKAGE.md" ]] && pkg_file="$REPO_DIR/constraints/$PACKAGE.md"
    node -e "
const fs = require('fs');
const [, src, sharedPath, pkgPath, out] = process.argv;
let text = fs.readFileSync(src, 'utf8');
const shared = sharedPath ? fs.readFileSync(sharedPath, 'utf8') : '';
const pkg = pkgPath ? fs.readFileSync(pkgPath, 'utf8') : '';
text = text.split('__SHARED_CONSTRAINTS__').join(shared);
text = text.split('__PACKAGE_CONSTRAINTS__').join(pkg);
fs.writeFileSync(out, text);
" "$tmp" "${REPO_DIR}/constraints/shared.md" "$pkg_file" "$dest"
    # Rewrite skill refs from plugin format (cca:skill) to manual format (cca-skill)
    local tmp2
    tmp2=$(mktemp)
    sed 's|  - cca:|  - cca-|g' "$dest" > "$tmp2" && mv "$tmp2" "$dest"
    if [[ "$ZEN_MODE" == "true" && -f "$REPO_DIR/constraints/zen.md" ]]; then
        cat "$REPO_DIR/constraints/zen.md" >> "$dest"
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
        local name
        name=$(basename "$agent")
        diff_agent "agent: $name" "$CLAUDE_DIR/agents/$name" "$agent" || changes=$((changes + 1))
    done

    # Check skills (repo: skills/<name>/, installed: skills/<name>/)
    for skill_dir in "$REPO_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill_name
        skill_name=$(basename "$skill_dir")
        for skill_file in "$skill_dir"*; do
            [[ -f "$skill_file" ]] || continue
            local fname
            fname=$(basename "$skill_file")
            diff_file "skill: cca-$skill_name/$fname" "$CLAUDE_DIR/skills/cca-$skill_name/$fname" "$skill_file" || changes=$((changes + 1))
        done
    done

    # Check hook scripts
    for hook_script in "$REPO_DIR"/hooks/scripts/*.mjs; do
        [[ -f "$hook_script" ]] || continue
        local fname
        fname=$(basename "$hook_script")
        diff_file "hook script: $fname" "$CLAUDE_DIR/hooks/scripts/$fname" "$hook_script" || changes=$((changes + 1))
    done

    # Check hooks.json
    diff_file "hooks.json" "$CLAUDE_DIR/hooks.json" "$REPO_DIR/hooks/configs/base.json" || changes=$((changes + 1))

    # Check user-level hooks
    for hook in pre-secrets.mjs rtk-rewrite.sh; do
        [[ -f "$REPO_DIR/hooks/user/$hook" ]] || continue
        diff_file "user hook: $hook" "$HOME/.claude/hooks/$hook" "$REPO_DIR/hooks/user/$hook" || changes=$((changes + 1))
    done

    # Check global extras
    if [[ "$INSTALL_SCOPE" == "global" ]]; then
        diff_file "statusline-command.sh" "$HOME/.claude/statusline-command.sh" "$REPO_DIR/statusline/statusline-command.sh" || changes=$((changes + 1))
        diff_file "output-style: cca.md" "$HOME/.claude/output-styles/cca.md" "$REPO_DIR/output-styles/cca.md" || changes=$((changes + 1))
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
        local name
        name=$(basename "$agent" .md)
        # Skip if interactive mode selected specific agents
        if [[ -n "$SELECTED_AGENTS" ]] && ! echo "$SELECTED_AGENTS" | grep -qw "$name"; then
            continue
        fi
        local dest
        dest="$CLAUDE_DIR/agents/$(basename "$agent")"
        substitute_and_copy "$agent" "$dest"
        info "$(basename "$agent") (model substituted)"
        AGENT_COUNT=$((AGENT_COUNT + 1))
    done
}

copy_skills() {
    SKILL_COUNT=0
    echo -e "\nSkills:"
    for skill_dir in "$CLAUDE_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local dir_name
        dir_name=$(basename "$skill_dir")
        [[ "$dir_name" == cca-* ]] && continue
        rm -f "$skill_dir"SKILL.md 2>/dev/null
        rmdir "$skill_dir" 2>/dev/null && info "removed legacy /$dir_name"
    done
    for skill_dir in "$REPO_DIR"/skills/*/; do
        [[ -d "$skill_dir" ]] || continue
        local skill_name
        skill_name=$(basename "$skill_dir")
        if [[ -n "$SELECTED_SKILLS" ]] && ! echo "$SELECTED_SKILLS" | grep -qw "$skill_name"; then
            continue
        fi
        local dest_name="${skill_name}"
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
    for hook in pre-secrets.mjs rtk-rewrite.sh; do
        local src="$REPO_DIR/hooks/user/$hook"
        local dest="$HOME/.claude/hooks/$hook"
        [[ -f "$src" ]] && { cp "$src" "$dest"; chmod +x "$dest"; info "$hook -> ~/.claude/hooks/ (user-level)"; }
    done

    local hooks_src="$REPO_DIR/hooks/configs/$PACKAGE.json"
    [[ -f "$hooks_src" ]] || hooks_src="$REPO_DIR/hooks/configs/base.json"
    cp "$hooks_src" "$CLAUDE_DIR/hooks.json"
    info "hooks.json -> project hooks (package: $PACKAGE)"

    if [[ -d "$REPO_DIR/hooks/scripts" ]]; then
        local resolved_repo resolved_target
        resolved_repo=$(cd "$REPO_DIR" && pwd -P)
        resolved_target=$(cd "$TARGET_DIR" && pwd -P 2>/dev/null || echo "")
        if [[ "$resolved_repo" == "$resolved_target" ]]; then
            rm -rf "$CLAUDE_DIR/hooks/scripts"
            ln -sfn "../../hooks/scripts" "$CLAUDE_DIR/hooks/scripts"
            HOOK_COUNT=$(find "$REPO_DIR/hooks/scripts/" -name '*.mjs' 2>/dev/null | wc -l | tr -d ' ')
            info "$HOOK_COUNT hook scripts -> symlinked (self-install)"
        else
            cp -r "$REPO_DIR/hooks/scripts/"* "$CLAUDE_DIR/hooks/scripts/" 2>/dev/null || true
            find "$CLAUDE_DIR/hooks/scripts/" -name '*.mjs' -exec chmod +x {} \; 2>/dev/null || true
            HOOK_COUNT=$(find "$CLAUDE_DIR/hooks/scripts/" -name '*.mjs' 2>/dev/null | wc -l | tr -d ' ')
            info "$HOOK_COUNT hook scripts -> project hooks"
        fi
    fi
}

install_global_extras() {
    [[ "$INSTALL_SCOPE" != "global" ]] && return
    echo -e "\nGlobal extras:"

    if [[ -f "$REPO_DIR/statusline/statusline-command.sh" ]]; then
        cp "$REPO_DIR/statusline/statusline-command.sh" "$HOME/.claude/statusline-command.sh"
        chmod +x "$HOME/.claude/statusline-command.sh"
        info "statusline-command.sh -> ~/.claude/"
    elif [[ -f "$REPO_DIR/templates/statusline-command.sh" ]]; then
        cp "$REPO_DIR/templates/statusline-command.sh" "$HOME/.claude/statusline-command.sh"
        chmod +x "$HOME/.claude/statusline-command.sh"
        info "statusline-command.sh -> ~/.claude/ (legacy)"
    fi

    if [[ -f "$REPO_DIR/output-styles/cca.md" ]]; then
        mkdir -p "$HOME/.claude/output-styles"
        cp "$REPO_DIR/output-styles/cca.md" "$HOME/.claude/output-styles/cca.md"
        info "cca.md -> ~/.claude/output-styles/"
    fi
}

install_output_style() {
    [[ "$INSTALL_SCOPE" == "global" ]] && return  # handled in install_global_extras
    echo -e "\nOutput style:"
    if [[ -f "$REPO_DIR/output-styles/cca.md" ]]; then
        cp "$REPO_DIR/output-styles/cca.md" "$CLAUDE_DIR/output-styles/cca.md"
        info "cca.md -> .claude/output-styles/"
    fi
}

settings_json_merge_global() {
    SETTINGS_FILE="$CLAUDE_DIR/settings.json"
    local TEMPLATE="$REPO_DIR/templates/settings-global.json"
    [[ -f "$TEMPLATE" ]] || { warn "templates/settings-global.json not found - skipping global settings"; return; }

    local cca_model="opusplan"
    case "$PACKAGE" in
        max|enterprise) cca_model="opus[1m]" ;;
        pro)            cca_model="opusplan" ;;
    esac

    local tmp_template
    tmp_template=$(mktemp)
    sed -e "s|__HOME__|$HOME|g" -e "s|__CCA_MODEL__|$cca_model|g" "$TEMPLATE" > "$tmp_template"

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

    # shellcheck disable=SC2016
    local GUARD_SECRETS_ENTRY='{
        "matcher": "Write|Edit|MultiEdit|NotebookEdit|Read|Bash|WebFetch",
        "hooks": [{"type": "command", "command": "node \"$HOME\"/.claude/hooks/pre-secrets.mjs", "timeout": 5}]
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
        if [[ -f "$CLAUDE_MD" ]]; then
            warn "CLAUDE.md already exists at target - skipping (review $template_src manually)"
        else
            cp "$template_src" "$CLAUDE_MD"; info "CLAUDE.md installed (package: $PACKAGE)"
        fi
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

validate_node_hooks() {
    NODE_ERRORS=0
    for mjsfile in "$CLAUDE_DIR/hooks/scripts/"*.mjs "$HOME/.claude/hooks/"*.mjs; do
        [[ -f "$mjsfile" ]] || continue
        node --check "$mjsfile" 2>/dev/null || {
            echo -e "  ${RED}✗${NC} Syntax error in $(basename "$mjsfile")"
            NODE_ERRORS=$((NODE_ERRORS + 1))
        }
    done
    [[ $NODE_ERRORS -eq 0 ]] && info "All Node.js hooks parse without errors"
    return $NODE_ERRORS
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
        max) echo "  opusplan orchestrator | Opus: athena, nemesis, odysseus | Extended context" ;;
        pro) echo "  opusplan orchestrator | Sonnet agents | Haiku for tests/docs" ;;
    esac
    [[ "$ZEN_MODE" == "true" ]] && echo "  Zen: plan-first, quiet output, ask-on-ambiguity"
    echo ""
    echo "Agents:"
    for agent in "$CLAUDE_DIR"/agents/*.md; do
        [[ -f "$agent" ]] || continue
        local name
        name=$(basename "$agent" .md)
        local model
        model=$(grep -m1 '^model:' "$agent" 2>/dev/null | sed 's/^model: *//')
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

    for script in "$CLAUDE_DIR/hooks/scripts/"*.mjs; do
        [[ -f "$script" ]] || continue
        local name
        name=$(basename "$script")
        [[ "$name" == "_lib.mjs" ]] && continue
        total=$((total + 1))

        local result
        result=$(echo '{"tool_name":"Bash","tool_input":{"command":"echo test"},"hook_event_name":"PreToolUse"}' | \
            node "$script" 2>&1)
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

    for hook in "$HOME/.claude/hooks/"*.mjs "$HOME/.claude/hooks/"*.sh; do
        [[ -f "$hook" ]] || continue
        local name
        name=$(basename "$hook")
        total=$((total + 1))

        local result
        if [[ "$hook" == *.mjs ]]; then
            result=$(echo '{"tool_name":"Bash","tool_input":{"command":"echo test"}}' | \
                node "$hook" 2>&1)
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
    # Interactive mode: when no args and stdin is a TTY
    if [[ $# -eq 0 && -t 0 && -t 1 ]]; then
            interactive_mode
    else
        parse_args "$@"
    fi

    check_version
    check_node

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
    install_output_style
    settings_json_merge
    install_template

    echo -e "\nValidation:"
    ERRORS=0

    if grep -r '__SHARED_CONSTRAINTS__' "$CLAUDE_DIR/agents/" &>/dev/null; then
        echo -e "  ${RED}✗${NC} Found unreplaced __SHARED_CONSTRAINTS__ in agents"; ERRORS=$((ERRORS+1))
    else
        info "No __SHARED_CONSTRAINTS__ remnants"
    fi

    if grep -r '__PACKAGE_CONSTRAINTS__' "$CLAUDE_DIR/agents/" &>/dev/null; then
        echo -e "  ${RED}✗${NC} Found unreplaced __PACKAGE_CONSTRAINTS__ in agents"; ERRORS=$((ERRORS+1))
    else
        info "No __PACKAGE_CONSTRAINTS__ remnants"
    fi

    check_json "$CLAUDE_DIR/hooks.json" "hooks.json" || ERRORS=$((ERRORS+1))
    check_json "$CLAUDE_DIR/settings.json" "settings.json" || ERRORS=$((ERRORS+1))

    validate_node_hooks; ERRORS=$((ERRORS + $?))
    validate_cca_skills; ERRORS=$((ERRORS + $?))

    validate_agents; ERRORS=$((ERRORS + $?))

    report_summary

    if [[ $ERRORS -gt 0 ]]; then
        echo -e "\n${RED}$ERRORS validation error(s) found. Check output above.${NC}"
        exit 1
    fi

    # RTK install prompt - always last
    install_rtk
}

main "$@"
