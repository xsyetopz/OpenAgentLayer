#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
PACKAGE="pro"
SKIP_RTK="false"

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

usage() {
    echo -e "${GREEN}CCA Bootstrap${NC}"
    echo "Usage: $0 [--pro|--max] [--skip-rtk]"
    echo "  --pro       : Claude Pro — opusplan orchestrator, sonnet agents (default)"
    echo "  --max       : Claude Max 5x/20x — opusplan orchestrator, opus for planning/review"
    echo "  --skip-rtk  : Skip RTK installation"
    exit 1
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --pro)        PACKAGE="pro"; shift ;;
            --max)        PACKAGE="max"; shift ;;
            --skip-rtk)   SKIP_RTK="true"; shift ;;
            -h|--help)    usage ;;
            *)            die "Unknown argument: $1" ;;
        esac
    done
}

# --- Preflight checks ---

check_version() {
    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode — skipping claude CLI version check"
        return
    fi
    command -v claude &>/dev/null || die "claude CLI not found. Install Claude Code first."
    version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    [[ -z "$version" ]] && { warn "Could not parse claude version, proceeding anyway"; return; }
    IFS='.' read -r major minor patch <<< "$version"
    (( major > 2 || (major == 2 && (minor > 1 || (minor == 1 && patch >= 76))) )) || die "Claude Code v${version} is too old. Requires >= 2.1.76"
    info "Claude Code v${version}"
}

check_node() {
    command -v node &>/dev/null || die "node not found. Hook scripts require Node.js >= 18."
    local node_ver
    node_ver=$(node --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
    (( node_ver >= 18 )) || die "Node.js v${node_ver} is too old. Requires >= 18."
    info "Node.js $(node --version 2>&1)"
}

check_jq() {
    command -v jq &>/dev/null || die "jq is required for settings.json merging. Install with: brew install jq"
    info "jq found"
}

# --- Marketplace registration ---

register_marketplace() {
    echo -e "\n${GREEN}Registering marketplace...${NC}"
    local SETTINGS_FILE="$HOME/.claude/settings.json"
    mkdir -p "$HOME/.claude"

    if [[ -f "$SETTINGS_FILE" ]]; then
        cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
        info "Backed up existing settings.json"
    else
        echo '{}' > "$SETTINGS_FILE"
        info "Created settings.json"
    fi

    jq '.extraKnownMarketplaces["claude-agents"] = {"source": {"source": "github", "repo": "xsyetopz/ClaudeAgents"}} |
        .enabledPlugins["cca@claude-agents"] = true' \
        "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
    info "Registered claude-agents marketplace"
    info "Enabled cca@claude-agents plugin"
}

# --- Global settings merge ---

merge_global_settings() {
    echo -e "\n${GREEN}Merging global settings...${NC}"
    local SETTINGS_FILE="$HOME/.claude/settings.json"
    local TEMPLATE="$REPO_DIR/templates/settings-global.json"
    [[ -f "$TEMPLATE" ]] || { warn "templates/settings-global.json not found — skipping"; return; }

    # Determine model values based on package tier
    local cca_model="opusplan"
    local opus_model="claude-opus-4-6"
    local sonnet_model="claude-sonnet-4-6"
    local haiku_model="claude-haiku-4-5-20251001"
    case "$PACKAGE" in
        max) opus_model="claude-opus-4-6[1m]" ;;
    esac

    # Substitute placeholders in template
    local tmp_template
    tmp_template=$(mktemp)
    sed -e "s|__HOME__|$HOME|g" \
        -e "s|__CCA_MODEL__|$cca_model|g" \
        -e "s|__OPUS_MODEL__|$opus_model|g" \
        -e "s|__SONNET_MODEL__|$sonnet_model|g" \
        -e "s|__HAIKU_MODEL__|$haiku_model|g" \
        "$TEMPLATE" > "$tmp_template"

    # Deep merge: template wins for framework keys, user wins for extensible keys
    jq -s '
        .[0] as $tpl | .[1] as $usr |
        $tpl *
        {
            env: ($tpl.env * ($usr.env // {})),
            enabledPlugins: ($tpl.enabledPlugins * ($usr.enabledPlugins // {})),
            extraKnownMarketplaces: ($tpl.extraKnownMarketplaces * ($usr.extraKnownMarketplaces // {})),
            mcpServers: (($tpl.mcpServers // {}) * ($usr.mcpServers // {}))
        } *
        ($usr | to_entries | map(select(.key as $k | ($tpl | has($k)) | not)) | from_entries)
    ' "$tmp_template" "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
    rm -f "$tmp_template"

    info "Model pins: opus=$opus_model sonnet=$sonnet_model haiku=$haiku_model"
    info "Orchestrator: $cca_model"
    info "Output style: CCA"
    info "Permissions and deny list merged"
}

# --- User-level file installation ---

install_user_files() {
    echo -e "\n${GREEN}Installing user-level files...${NC}"
    mkdir -p "$HOME/.claude/hooks"
    mkdir -p "$HOME/.claude/output-styles"

    # User-level hooks
    for hook in pre-secrets.mjs rtk-rewrite.sh; do
        local src="$REPO_DIR/hooks/user/$hook"
        if [[ -f "$src" ]]; then
            cp "$src" "$HOME/.claude/hooks/$hook"
            chmod +x "$HOME/.claude/hooks/$hook"
            info "$hook -> ~/.claude/hooks/"
        fi
    done

    # Output style
    if [[ -f "$REPO_DIR/output-styles/cca.md" ]]; then
        cp "$REPO_DIR/output-styles/cca.md" "$HOME/.claude/output-styles/cca.md"
        info "cca.md -> ~/.claude/output-styles/"
    fi

    # Statusline
    if [[ -f "$REPO_DIR/statusline/statusline-command.sh" ]]; then
        cp "$REPO_DIR/statusline/statusline-command.sh" "$HOME/.claude/statusline-command.sh"
        chmod +x "$HOME/.claude/statusline-command.sh"
        info "statusline-command.sh -> ~/.claude/"
    fi
}

# --- RTK installation ---

install_rtk() {
    [[ "$SKIP_RTK" == "true" ]] && return
    echo -e "\n${GREEN}RTK (token savings):${NC}"

    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode — skipping RTK install"
        return
    fi

    if command -v rtk &>/dev/null; then
        local rtk_ver
        rtk_ver=$(rtk --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        info "RTK already installed (v${rtk_ver})"
        if [[ ! -f "$HOME/.claude/RTK.md" ]]; then
            info "RTK.md missing — re-running rtk init --global"
            rtk init --global || warn "rtk init --global failed — run manually"
        fi
        return
    fi

    read -rp "  Install RTK for token savings? [Y/n] " confirm
    [[ "$confirm" =~ ^[Nn]$ ]] && { warn "Skipping RTK install"; return; }

    if command -v brew &>/dev/null; then
        echo "  Installing via Homebrew..."
        brew install rtk-ai/tap/rtk || { warn "brew install failed"; return; }
    else
        echo "  Installing via curl..."
        curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh || { warn "curl install failed"; return; }
    fi

    if command -v rtk &>/dev/null; then
        info "RTK installed successfully"
        rtk init --global || warn "rtk init --global failed — run manually"
    else
        warn "RTK binary not found in PATH. Restart your shell, then run: rtk init --global"
    fi
}

# --- Plugin installation ---

install_plugin() {
    echo -e "\n${GREEN}Installing plugin...${NC}"

    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode — skipping plugin install"
        return
    fi

    if claude plugin install cca@claude-agents; then
        info "Plugin installed"
    else
        warn "Plugin install failed — run manually: claude plugin install cca@claude-agents"
    fi
}

# --- ctx7 setup ---

install_ctx7() {
    echo -e "\n${GREEN}ctx7 (documentation context):${NC}"

    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode — skipping ctx7 setup"
        return
    fi

    if command -v bun &>/dev/null; then
        if bun x ctx7 setup --claude; then
            info "ctx7 configured via bun"
        else
            warn "ctx7 setup failed — run manually: bunx ctx7 setup --claude"
        fi
    elif command -v npx &>/dev/null; then
        if npx ctx7 setup --claude; then
            info "ctx7 configured via npx"
        else
            warn "ctx7 setup failed — run manually: npx ctx7 setup --claude"
        fi
    else
        warn "Neither bun nor npx found — skip ctx7 setup"
    fi
}

# --- Validation ---

validate() {
    echo -e "\n${GREEN}Validation:${NC}"
    local errors=0

    # Check settings.json is valid
    if jq empty "$HOME/.claude/settings.json" 2>/dev/null; then
        info "settings.json is valid JSON"
    else
        echo -e "  ${RED}✗${NC} settings.json is invalid JSON"
        errors=$((errors + 1))
    fi

    # Check user-level hooks parse
    for hook in "$HOME/.claude/hooks/"*.mjs; do
        [[ -f "$hook" ]] || continue
        if node --check "$hook" 2>/dev/null; then
            info "$(basename "$hook") parses OK"
        else
            echo -e "  ${RED}✗${NC} Syntax error in $(basename "$hook")"
            errors=$((errors + 1))
        fi
    done

    # Check key files exist
    for f in output-styles/cca.md statusline-command.sh; do
        if [[ -f "$HOME/.claude/$f" ]]; then
            info "$f installed"
        else
            echo -e "  ${RED}✗${NC} $f missing"
            errors=$((errors + 1))
        fi
    done

    return $errors
}

# --- Summary ---

report_summary() {
    echo -e "\n${GREEN}CCA Bootstrap complete!${NC}"
    echo ""
    echo "  Package:     $PACKAGE"
    echo "  Plugin:      cca@claude-agents"
    echo "  Output style: CCA"
    echo ""
    echo "  The plugin provides: 7 agents, 11 skills, 8 project-level hooks"
    echo "  Bootstrap installed: user-level hooks, output style, statusline, global settings"
    echo ""
    echo "  Next: open Claude Code in any project directory"
}

# --- Main ---

main() {
    parse_args "$@"

    echo -e "${GREEN}CCA Bootstrap${NC} (package: $PACKAGE)"
    echo ""

    check_version
    check_node
    check_jq

    register_marketplace
    merge_global_settings
    install_user_files
    install_rtk
    install_plugin
    install_ctx7

    ERRORS=0
    validate || ERRORS=$?

    report_summary

    if [[ $ERRORS -gt 0 ]]; then
        echo -e "\n${RED}$ERRORS validation error(s). Check output above.${NC}"
        exit 1
    fi
}

main "$@"
