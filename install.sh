#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
SKIP_RTK="false"
CCA_TIER="5x"

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

usage() {
    echo -e "${GREEN}CCA Bootstrap${NC}"
    echo "Usage: $0 [--skip-rtk] [--tier 5x|20x]"
    echo "  --skip-rtk    : Skip RTK installation"
    echo "  --tier 5x|20x : Model tier (default: 5x)"
    exit 1
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-rtk)   SKIP_RTK="true"; shift ;;
            --tier)       CCA_TIER="${2:-}"; shift 2 ;;
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

merge_global_settings() {
    echo -e "\n${GREEN}Merging global settings...${NC}"
    local SETTINGS_FILE="$HOME/.claude/settings.json"
    local TEMPLATE="$REPO_DIR/templates/settings-global.json"
    [[ -f "$TEMPLATE" ]] || { warn "templates/settings-global.json not found — skipping"; return; }

    local tmp_template
    tmp_template=$(mktemp)

    sed -e "s|__HOME__|$HOME|g" \
        -e "s|__OPUS_MODEL__|$OPUS_MODEL|g" \
        -e "s|__SONNET_MODEL__|$SONNET_MODEL|g" \
        -e "s|__HAIKU_MODEL__|$HAIKU_MODEL|g" \
        "$TEMPLATE" > "$tmp_template"

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

    # Force model — always set to opusplan regardless of existing value
    jq --arg m "$CCA_MODEL" '.model = $m' \
        "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"

    info "Model pins: opus=$OPUS_MODEL sonnet=$SONNET_MODEL haiku=$HAIKU_MODEL"
    info "Orchestrator: $CCA_MODEL"
    info "Output style: CCA"
    info "Permissions and deny list merged"
}

# --- User-level file installation ---

install_hooks() {
    mkdir -p "$HOME/.claude/hooks"
    for hook in pre-secrets.mjs rtk-rewrite.sh; do
        local src="$REPO_DIR/hooks/user/$hook"
        if [[ -f "$src" ]]; then
            cp "$src" "$HOME/.claude/hooks/$hook"
            chmod +x "$HOME/.claude/hooks/$hook"
            info "$hook -> ~/.claude/hooks/"
        fi
    done
}

install_output_style() {
    mkdir -p "$HOME/.claude/output-styles"
    if [[ -f "$REPO_DIR/output-styles/cca.md" ]]; then
        cp "$REPO_DIR/output-styles/cca.md" "$HOME/.claude/output-styles/cca.md"
        info "cca.md -> ~/.claude/output-styles/"
    fi
}

install_statusline() {
    if [[ -f "$REPO_DIR/statusline/statusline-command.sh" ]]; then
        cp "$REPO_DIR/statusline/statusline-command.sh" "$HOME/.claude/statusline-command.sh"
        chmod +x "$HOME/.claude/statusline-command.sh"
        info "statusline-command.sh -> ~/.claude/"
    fi
}

install_streamguardrc() {
    local target="$HOME/.streamguardrc.json"
    if [[ -f "$target" ]]; then
        info ".streamguardrc.json already exists — skipping"
        return
    fi
    cat > "$target" <<'EOF'
{
	"enabled": true,
	"envFiles": [
		".env",
		".env.local",
		".env.development",
		".env.staging",
		".env.test",
		".env.production"
	],
	"customPatterns": [],
	"minSecretLength": 8,
	"safeEnvPrefixes": [
		"PUBLIC_",
		"NEXT_PUBLIC_",
		"VITE_",
		"REACT_APP_",
		"EXPO_PUBLIC_",
		"NUXT_PUBLIC_",
		"GATSBY_",
		"STORYBOOK_",
		"PLASMO_PUBLIC_",
		"WXT_PUBLIC_",
		"TAURI_"
	],
	"verbose": false
}
EOF
    info ".streamguardrc.json -> ~/ (stream guard enabled by default)"
}

install_user_files() {
    echo -e "\n${GREEN}Installing user-level files...${NC}"
    install_hooks
    install_output_style
    install_statusline
    install_streamguardrc
}

# --- RTK installation ---

check_rtk_installed() {
    if command -v rtk &>/dev/null; then
        local rtk_ver
        rtk_ver=$(rtk --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        info "RTK already installed (v${rtk_ver})"
        if [[ ! -f "$HOME/.claude/RTK.md" ]]; then
            info "RTK.md missing — re-running rtk init --global"
            rtk init --global || warn "rtk init --global failed — run manually"
        fi
        return 0
    fi
    return 1
}

install_rtk_binary() {
    if command -v brew &>/dev/null; then
        echo "  Installing via Homebrew..."
        brew install rtk-ai/tap/rtk || { warn "brew install failed"; return 1; }
    else
        echo "  Installing via curl..."
        curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh || { warn "curl install failed"; return 1; }
    fi
    return 0
}

finalize_rtk_install() {
    if command -v rtk &>/dev/null; then
        info "RTK installed successfully"
        rtk init --global || warn "rtk init --global failed — run manually"
    else
        warn "RTK binary not found in PATH. Restart your shell, then run: rtk init --global"
    fi
}

install_rtk() {
    [[ "$SKIP_RTK" == "true" ]] && return
    echo -e "\n${GREEN}RTK (token savings):${NC}"

    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode — skipping RTK install"
        return
    fi

    check_rtk_installed && return

    read -rp "  Install RTK for token savings? [Y/n] " confirm
    [[ "$confirm" =~ ^[Nn]$ ]] && { warn "Skipping RTK install"; return; }

    install_rtk_binary || return
    finalize_rtk_install
}

# --- Plugin installation ---

install_plugin_from_repo() {
    rm -rf ~/.claude/plugins/cache/temp_local_*
    mkdir -p ~/.claude/plugins/marketplaces/claude-agents
    rsync -a --delete --exclude='.git' --exclude='node_modules' --exclude='dist' \
        "$REPO_DIR/" ~/.claude/plugins/marketplaces/claude-agents/
    if claude plugin install cca; then
        info "Plugin installed (from working tree)"
    else
        warn "Plugin install failed — run manually: make install-plugin"
    fi
}

install_plugin_from_marketplace() {
    if claude plugin install cca@claude-agents; then
        info "Plugin installed (from marketplace)"
    else
        warn "Plugin install failed — run manually: claude plugin install cca@claude-agents"
    fi
}

install_plugin() {
    echo -e "\n${GREEN}Installing plugin...${NC}"

    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode — skipping plugin install"
        return
    fi

    claude plugin uninstall cca@claude-agents 2>/dev/null || true

    if [[ -f "$REPO_DIR/.claude-plugin/plugin.json" ]]; then
        install_plugin_from_repo
    else
        install_plugin_from_marketplace
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

validate_settings_json() {
    if jq empty "$HOME/.claude/settings.json" 2>/dev/null; then
        info "settings.json is valid JSON"
        return 0
    else
        echo -e "  ${RED}✗${NC} settings.json is invalid JSON"
        return 1
    fi
}

validate_hooks() {
    local errors=0
    for hook in "$HOME/.claude/hooks/"*.mjs; do
        [[ -f "$hook" ]] || continue
        if node --check "$hook" 2>/dev/null; then
            info "$(basename "$hook") parses OK"
        else
            echo -e "  ${RED}✗${NC} Syntax error in $(basename "$hook")"
            errors=$((errors + 1))
        fi
    done
    return $errors
}

validate_key_files() {
    local errors=0
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

validate() {
    echo -e "\n${GREEN}Validation:${NC}"
    local errors=0

    validate_settings_json || errors=$((errors + 1))
    validate_hooks || errors=$((errors + $?))
    validate_key_files || errors=$((errors + $?))

    return $errors
}

# --- Entrypoint ---

report_summary() {
    echo -e "\n${GREEN}CCA Bootstrap complete!${NC}"
    echo ""
    echo "  Plugin:      cca@claude-agents"
    echo "  Tier:        $CCA_TIER (orchestrator: $CCA_MODEL)"
    echo "  Output style: CCA"
    echo ""
    echo "  The plugin provides: 7 agents, 11 skills, 10 project-level hooks"
    echo "  Bootstrap installed: user-level hooks, output style, statusline, global settings"
    echo ""
    echo "  Next: open Claude Code in any project directory"
}

main() {
    parse_args "$@"

    case "$CCA_TIER" in
        20x)
            CCA_MODEL="opus[1m]"
            OPUS_MODEL="claude-opus-4-6[1m]"
            SONNET_MODEL="claude-opus-4-6[1m]"
            HAIKU_MODEL="claude-sonnet-4-6"
            ;;
        5x|*)
            CCA_TIER="5x"
            CCA_MODEL="opusplan"
            OPUS_MODEL="claude-opus-4-6[1m]"
            SONNET_MODEL="claude-sonnet-4-6"
            HAIKU_MODEL="claude-haiku-4-5"
            ;;
    esac

    echo -e "${GREEN}CCA Bootstrap${NC}"
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
