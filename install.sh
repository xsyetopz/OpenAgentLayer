#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
CLAUDE_DIR="$REPO_DIR/claude"
CODEX_DIR="$REPO_DIR/codex"
COPILOT_DIR="$REPO_DIR/copilot"
OPENCODE_TEMPLATES_DIR="$REPO_DIR/opencode/templates"
BIN_DIR="$REPO_DIR/bin"
BUILD_DIR=""

INSTALL_CLAUDE="false"
INSTALL_OPENCODE="false"
INSTALL_CODEX="false"
INSTALL_COPILOT="false"
SKIP_RTK="false"
CLAUDE_TIER="5x"
OPENCODE_SCOPE="global"
OPENCODE_DEFAULT_MODEL=""
OPENCODE_MODEL_OVERRIDES=()
COPILOT_SCOPE="global"
CODEX_TIER=""
CODEX_DEEPWIKI="false"
CODEX_SET_TOP_PROFILE="auto"
PLAYWRIGHT_CLI="false"
PLAYWRIGHT_CLI_SET="false"

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

usage() {
    cat <<'EOF'
openagentsbtw installer

Usage: ./install.sh [system toggles] [options]

System toggles (allow multiple):
  --claude                Install Claude Code support
  --opencode              Install OpenCode support
  --codex                 Install Codex support
  --copilot               Install GitHub Copilot support
  --all                   Install all supported systems

Options:
  --skip-rtk              Skip RTK install for Claude Code and Codex
  --claude-tier 5x|20x    Claude model tier (default: 5x)
  --opencode-scope project|global
                          OpenCode install target (default: global)
  --opencode-default-model MODEL
                          Use one model id for all OpenCode agents
  --opencode-model ROLE=MODEL
                          Override a specific OpenCode role model
  --copilot-scope global|project|both
                          Copilot install target (default: global)
  --codex-tier plus|pro   Codex model routing preset
    --codex-set-top-profile Force setting top-level Codex profile in ~/.codex/config.toml
    --no-codex-set-top-profile
                                                    Do not set top-level Codex profile in ~/.codex/config.toml
  --codex-deepwiki        Configure DeepWiki MCP for Codex
  --playwright-cli        Install Playwright CLI (browser automation)
  --no-playwright-cli     Do not install Playwright CLI
  -h, --help              Show this help
EOF
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --claude) INSTALL_CLAUDE="true" ;;
            --opencode) INSTALL_OPENCODE="true" ;;
            --codex) INSTALL_CODEX="true" ;;
            --copilot) INSTALL_COPILOT="true" ;;
            --all)
                INSTALL_CLAUDE="true"
                INSTALL_OPENCODE="true"
                INSTALL_CODEX="true"
                INSTALL_COPILOT="true"
                ;;
            --skip-rtk) SKIP_RTK="true" ;;
            --claude-tier)
                CLAUDE_TIER="${2:-}"
                shift
                ;;
            --opencode-scope)
                OPENCODE_SCOPE="${2:-}"
                shift
                ;;
            --opencode-default-model)
                OPENCODE_DEFAULT_MODEL="${2:-}"
                shift
                ;;
            --opencode-model)
                OPENCODE_MODEL_OVERRIDES+=("${2:-}")
                shift
                ;;
            --copilot-scope)
                COPILOT_SCOPE="${2:-}"
                shift
                ;;
            --codex-tier)
                CODEX_TIER="${2:-}"
                shift
                ;;
            --codex-set-top-profile)
                CODEX_SET_TOP_PROFILE="true"
                ;;
            --no-codex-set-top-profile)
                CODEX_SET_TOP_PROFILE="false"
                ;;
            --codex-deepwiki)
                CODEX_DEEPWIKI="true"
                ;;
            --playwright-cli)
                PLAYWRIGHT_CLI="true"
                PLAYWRIGHT_CLI_SET="true"
                ;;
            --no-playwright-cli)
                PLAYWRIGHT_CLI="false"
                PLAYWRIGHT_CLI_SET="true"
                ;;
            -h|--help) usage ;;
            *) die "Unknown argument: $1" ;;
        esac
        shift
    done
}

prompt_toggle() {
    local label="$1"
    local default_answer="$2"
    local answer prompt

    if [[ "$default_answer" == "Y" ]]; then
        prompt="[Y/n]"
    else
        prompt="[y/N]"
    fi

    read -rp "  ${label} ${prompt} " answer
    answer="${answer:-$default_answer}"
    [[ "$answer" =~ ^[Yy]$ ]]
}

prompt_playwright_cli() {
    [[ "${CI:-}" == "true" ]] && return 0
    [[ "$PLAYWRIGHT_CLI_SET" == "true" ]] && return 0
    [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_OPENCODE" == "true" || "$INSTALL_CODEX" == "true" || "$INSTALL_COPILOT" == "true" ]] || return 0

    echo ""
    if prompt_toggle "Install Playwright CLI support (browser automation)?" "N"; then
        PLAYWRIGHT_CLI="true"
    else
        PLAYWRIGHT_CLI="false"
    fi
}

ensure_selection() {
    if [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_OPENCODE" == "true" || "$INSTALL_CODEX" == "true" || "$INSTALL_COPILOT" == "true" ]]; then
        return
    fi

    echo -e "${GREEN}Select systems to install${NC}"
    prompt_toggle "Install Claude Code support?" "Y" && INSTALL_CLAUDE="true"
    prompt_toggle "Install OpenCode support?" "Y" && INSTALL_OPENCODE="true"
    prompt_toggle "Install Codex support?" "Y" && INSTALL_CODEX="true"
    prompt_toggle "Install GitHub Copilot support?" "Y" && INSTALL_COPILOT="true"

    [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_OPENCODE" == "true" || "$INSTALL_CODEX" == "true" || "$INSTALL_COPILOT" == "true" ]] || die "No systems selected"
}

configure_claude_models() {
    case "$CLAUDE_TIER" in
        20x)
            CCA_MODEL="opus[1m]"
            OPUS_MODEL="claude-opus-4-6[1m]"
            SONNET_MODEL="claude-sonnet-4-6"
            HAIKU_MODEL="claude-sonnet-4-6"
            ;;
        5x|"")
            CLAUDE_TIER="5x"
            CCA_MODEL="opusplan"
            OPUS_MODEL="claude-opus-4-6[1m]"
            SONNET_MODEL="claude-sonnet-4-6"
            HAIKU_MODEL="claude-haiku-4-5"
            ;;
        *)
            die "Unsupported Claude tier: $CLAUDE_TIER"
            ;;
    esac
}

prompt_opencode_models() {
    [[ "$INSTALL_OPENCODE" == "true" ]] || return 0
    [[ -n "$OPENCODE_DEFAULT_MODEL" ]] && return
    [[ "${CI:-}" == "true" ]] && return

    echo ""
    read -rp "  OpenCode default model for all agents (blank = auto-detect/fallback): " OPENCODE_DEFAULT_MODEL
}

prompt_codex_tier() {
    [[ "$INSTALL_CODEX" == "true" ]] || return 0
    [[ -n "$CODEX_TIER" ]] && return 0

    if [[ "${CI:-}" == "true" ]]; then
        CODEX_TIER="pro"
        return 0
    fi

    echo ""
    read -rp "  Codex tier preset [pro/plus]: " CODEX_TIER
    CODEX_TIER="${CODEX_TIER:-pro}"
}

prompt_codex_profile_top() {
    [[ "$INSTALL_CODEX" == "true" ]] || return 0
    [[ "$CODEX_SET_TOP_PROFILE" != "auto" ]] && return 0
    [[ "${CI:-}" == "true" ]] && return 0

    local profile_name="openagentsbtw-${CODEX_TIER}"
    echo ""
    if prompt_toggle "Set Codex default profile at top-level in ~/.codex/config.toml to ${profile_name}?" "Y"; then
        CODEX_SET_TOP_PROFILE="true"
    else
        CODEX_SET_TOP_PROFILE="false"
    fi
}

validate_codex_tier() {
    [[ "$INSTALL_CODEX" == "true" ]] || return 0
    case "$CODEX_TIER" in
        plus|pro) ;;
        "") die "Codex tier is required when installing Codex support" ;;
        *) die "Unsupported Codex tier: $CODEX_TIER (expected plus or pro)" ;;
    esac
}

validate_copilot_scope() {
    [[ "$INSTALL_COPILOT" == "true" ]] || return 0
    case "$COPILOT_SCOPE" in
        global|project|both) ;;
        *) die "Unsupported Copilot scope: $COPILOT_SCOPE (expected global, project, or both)" ;;
    esac
}

install_playwright_cli() {
    [[ "$PLAYWRIGHT_CLI" == "true" ]] || return 0
    [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_OPENCODE" == "true" || "$INSTALL_CODEX" == "true" || "$INSTALL_COPILOT" == "true" ]] || return 0

    echo -e "\n${GREEN}Playwright CLI${NC}"
    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode - skipping Playwright CLI install"
        return 0
    fi

    if command -v playwright-cli &>/dev/null; then
        info "playwright-cli already installed"
    else
        info "Installing Playwright CLI (preferred: bun/bunx; falls back to pnpm/yarn/npx)"
        # Prefer global install when possible, but fall back to runner execution if global bin is not on PATH.
        if command -v bun &>/dev/null; then
            bun add -g "@playwright/cli@latest" || true
        elif command -v pnpm &>/dev/null; then
            pnpm add -g "@playwright/cli@latest" || true
        elif command -v yarn &>/dev/null; then
            yarn global add "@playwright/cli@latest" || true
        elif command -v npm &>/dev/null; then
            npm install -g "@playwright/cli@latest" || true
        else
            ensure_js_runner
        fi
    fi

    local should_install_skills="false"
    if [[ "$OPENCODE_SCOPE" == "project" && "$INSTALL_OPENCODE" == "true" ]]; then
        should_install_skills="true"
    fi
    if [[ "$INSTALL_COPILOT" == "true" && ( "$COPILOT_SCOPE" == "project" || "$COPILOT_SCOPE" == "both" ) ]]; then
        should_install_skills="true"
    fi

    if [[ "$should_install_skills" == "true" ]]; then
        if command -v playwright-cli &>/dev/null; then
            if playwright-cli install --skills; then
                info "playwright-cli skills installed into this repo"
            else
                warn "playwright-cli skills install failed; try manually: playwright-cli install --skills"
            fi
        else
            if run_js_package "@playwright/cli@latest" "install" "--skills"; then
                info "playwright-cli skills installed into this repo (via package runner)"
            else
                warn "playwright-cli skills install failed; try manually: bunx -y @playwright/cli@latest install --skills"
            fi
        fi
    else
        info "Skipping playwright-cli skills install (no project-scope install selected)"
    fi
}

check_node() {
    command -v node &>/dev/null || die "node not found. Claude and Codex hook scripts require Node.js >= 24.14.1."
    local node_ver
    node_ver=$(node --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
    (( node_ver >= 24 )) || die "Node.js v${node_ver} is too old. Requires >= 24.14.1."
    info "Node.js $(node --version 2>&1)"
}

is_windows() {
    case "$(uname -s 2>/dev/null || echo unknown)" in
        MINGW*|MSYS*|CYGWIN*) return 0 ;;
        *) ;;
    esac
    command -v powershell &>/dev/null && return 0
    command -v pwsh &>/dev/null && return 0
    return 1
}

ensure_bun() {
    if command -v bun &>/dev/null; then
        info "bun $(bun --version 2>/dev/null)"
        return 0
    fi

    echo -e "\n${GREEN}bun${NC}"
    if [[ "${CI:-}" == "true" ]]; then
        die "bun not found and CI mode is enabled. Install bun first."
    fi

    warn "bun not found; attempting to install bun (required for OpenCode support and preferred for JS tooling)"

    if is_windows; then
        if command -v pwsh &>/dev/null; then
            pwsh -c "irm bun.sh/install.ps1 | iex" || die "bun install failed"
        else
            powershell -c "irm bun.sh/install.ps1 | iex" || die "bun install failed"
        fi
    else
        command -v curl &>/dev/null || die "curl not found; cannot install bun automatically"
        curl -fsSL https://bun.sh/install | bash || die "bun install failed"
    fi

    local bun_bin="$HOME/.bun/bin"
    if [[ -d "$bun_bin" ]]; then
        export PATH="$bun_bin:$PATH"
    fi

    command -v bun &>/dev/null || die "bun install did not make bun available in PATH. Restart your shell and re-run installer."
    info "bun $(bun --version 2>/dev/null)"
    return 0
}

resolve_js_runner() {
    if command -v bunx &>/dev/null; then
        echo "bunx"
        return 0
    fi
    if command -v bun &>/dev/null; then
        echo "bunx-fallback"
        return 0
    fi
    if command -v pnpm &>/dev/null; then
        echo "pnpm"
        return 0
    fi
    if command -v yarn &>/dev/null; then
        echo "yarn"
        return 0
    fi
    if command -v npx &>/dev/null; then
        echo "npx"
        return 0
    fi
    if command -v npm &>/dev/null; then
        echo "npm-npx"
        return 0
    fi
    echo "none"
    return 0
}

ensure_js_runner() {
    local runner
    runner="$(resolve_js_runner)"
    if [[ "$runner" != "none" ]]; then
        return 0
    fi
    ensure_bun
    runner="$(resolve_js_runner)"
    [[ "$runner" != "none" ]] || die "No JS package runner found (bun/pnpm/yarn/npm)."
}

run_js_package() {
    local package="$1"
    shift

    ensure_js_runner
    local runner
    runner="$(resolve_js_runner)"

    case "$runner" in
        bunx)
            bunx -y "$package" "$@"
            ;;
        bunx-fallback)
            bun x -y "$package" "$@"
            ;;
        pnpm)
            pnpm dlx "$package" "$@"
            ;;
        yarn)
            # Works on Yarn 2+ (Berry). Yarn Classic will fail; we fall back to npx there.
            if yarn dlx --help >/dev/null 2>&1; then
                yarn dlx "$package" "$@"
            elif command -v npx &>/dev/null; then
                npx -y "$package" "$@"
            else
                die "yarn found but yarn dlx is unavailable and npx is missing"
            fi
            ;;
        npx)
            npx -y "$package" "$@"
            ;;
        npm-npx)
            if command -v npx &>/dev/null; then
                npx -y "$package" "$@"
            else
                die "npm found but npx is missing"
            fi
            ;;
        *)
            die "No JS package runner found"
            ;;
    esac
}

check_jq() {
    command -v jq &>/dev/null || die "jq is required for Claude settings.json merging. Install with: brew install jq"
    info "jq found"
}

check_bun() {
    ensure_bun
}

check_python3() {
    command -v python3 &>/dev/null || die "python3 is required for Codex installation."
    info "python3 $(python3 --version 2>/dev/null)"
}

prepare_build_artifacts() {
    [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_OPENCODE" == "true" || "$INSTALL_CODEX" == "true" || "$INSTALL_COPILOT" == "true" ]] || return 0
    [[ -n "${BUILD_DIR:-}" ]] && return 0

    check_node

    BUILD_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t openagentsbtw-build)"
    node "$REPO_DIR/scripts/build.mjs" --out "$BUILD_DIR"

    CLAUDE_DIR="$BUILD_DIR/claude"
    CODEX_DIR="$BUILD_DIR/codex"
    COPILOT_DIR="$BUILD_DIR/copilot"
    OPENCODE_TEMPLATES_DIR="$BUILD_DIR/opencode/templates"
    BIN_DIR="$BUILD_DIR/bin"

    trap 'rm -rf "${BUILD_DIR:-}" 2>/dev/null || true' EXIT
    info "Generated install artifacts -> $BUILD_DIR"
}

check_claude_version() {
    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode - skipping claude CLI version check"
        return
    fi
    command -v claude &>/dev/null || die "claude CLI not found. Install Claude Code first."
    version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    [[ -z "$version" ]] && { warn "Could not parse claude version, proceeding anyway"; return; }
    IFS='.' read -r major minor patch <<< "$version"
    (( major > 2 || (major == 2 && (minor > 1 || (minor == 1 && patch >= 76))) )) || die "Claude Code v${version} is too old. Requires >= 2.1.76"
    info "Claude Code v${version}"
}

register_claude_marketplace() {
    echo -e "\n${GREEN}Claude marketplace${NC}"
    local settings_file="$HOME/.claude/settings.json"
    mkdir -p "$HOME/.claude"

    if [[ -f "$settings_file" ]]; then
        cp "$settings_file" "${settings_file}.backup"
        info "Backed up existing settings.json"
    else
        echo '{}' > "$settings_file"
        info "Created settings.json"
    fi

    jq '.extraKnownMarketplaces["openagentsbtw"] = {"source": {"source": "github", "repo": "xsyetopz/openagentsbtw"}} |
        .enabledPlugins["openagentsbtw@openagentsbtw"] = true' \
        "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
    info "Registered openagentsbtw marketplace"
    info "Enabled openagentsbtw@openagentsbtw plugin"
}

merge_claude_global_settings() {
    echo -e "\n${GREEN}Claude global settings${NC}"
    local settings_file="$HOME/.claude/settings.json"
    local template="$CLAUDE_DIR/templates/settings-global.json"
    [[ -f "$template" ]] || { warn "claude/templates/settings-global.json not found - skipping"; return; }

    local tmp_template
    tmp_template=$(mktemp)

    sed -e "s|__HOME__|$HOME|g" \
        -e "s|__OPUS_MODEL__|$OPUS_MODEL|g" \
        -e "s|__SONNET_MODEL__|$SONNET_MODEL|g" \
        -e "s|__HAIKU_MODEL__|$HAIKU_MODEL|g" \
        "$template" > "$tmp_template"

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
    ' "$tmp_template" "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
    rm -f "$tmp_template"

    jq --arg m "$CCA_MODEL" '.model = $m' \
        "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"

    info "Claude orchestrator: $CCA_MODEL"
    info "Claude plugin settings merged"
}

cleanup_claude_legacy_mcp_servers() {
    local settings_file="$HOME/.claude/settings.json"
    [[ -f "$settings_file" ]] || return 0
    jq '
        def is_legacy(command; args):
            (.command? == command) and ((.args? // []) == args);
        def drop_if_legacy(key; command; args):
            if (.mcpServers? | type == "object") and (.mcpServers[key]? | type == "object") and (.mcpServers[key] | is_legacy(command; args)) then
                .mcpServers |= del(. [key])
            else
                .
            end;

        .mcpServers = (.mcpServers // {}) |
        drop_if_legacy("chrome-devtools"; "bunx"; ["-y","chrome-devtools-mcp@latest"]) |
        drop_if_legacy("browsermcp"; "bunx"; ["-y","@browsermcp/mcp@latest"]) |
        if (.mcpServers | length) == 0 then del(.mcpServers) else . end
    ' "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
}

install_claude_user_files() {
    echo -e "\n${GREEN}Claude user files${NC}"
    mkdir -p "$HOME/.claude/hooks" "$HOME/.claude/output-styles"

    for hook in pre-secrets.mjs rtk-rewrite.sh; do
        local src="$CLAUDE_DIR/hooks/user/$hook"
        [[ -f "$src" ]] || continue
        cp "$src" "$HOME/.claude/hooks/$hook"
        chmod +x "$HOME/.claude/hooks/$hook"
        info "$hook -> ~/.claude/hooks/"
    done

    if [[ -f "$CLAUDE_DIR/output-styles/cca.md" ]]; then
        cp "$CLAUDE_DIR/output-styles/cca.md" "$HOME/.claude/output-styles/cca.md"
        info "cca.md -> ~/.claude/output-styles/"
    fi

    if [[ -f "$CLAUDE_DIR/statusline/statusline-command.sh" ]]; then
        cp "$CLAUDE_DIR/statusline/statusline-command.sh" "$HOME/.claude/statusline-command.sh"
        chmod +x "$HOME/.claude/statusline-command.sh"
        info "statusline-command.sh -> ~/.claude/"
    fi

    if [[ ! -f "$HOME/.streamguardrc.json" ]]; then
        cp "$REPO_DIR/.streamguardrc.json.example" "$HOME/.streamguardrc.json"
        info ".streamguardrc.json -> ~/ (from example template)"
    fi
}

check_rtk_installed() {
    command -v rtk &>/dev/null
}

report_rtk_installed() {
    local rtk_ver
    rtk_ver=$(rtk --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    info "RTK already installed (v${rtk_ver})"
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

install_rtk() {
    [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_CODEX" == "true" ]] || return 0
    [[ "$SKIP_RTK" == "true" ]] && return

    echo -e "\n${GREEN}RTK${NC}"
    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode - skipping RTK install"
        return
    fi

    local prompt_label="Install RTK support?"
    if [[ "$INSTALL_CLAUDE" == "true" && "$INSTALL_CODEX" == "true" ]]; then
        prompt_label="Install RTK for Claude Code and Codex?"
    elif [[ "$INSTALL_CLAUDE" == "true" ]]; then
        prompt_label="Install RTK for Claude Code?"
    elif [[ "$INSTALL_CODEX" == "true" ]]; then
        prompt_label="Install RTK for Codex?"
    fi

    if prompt_toggle "$prompt_label" "Y"; then
        if check_rtk_installed; then
            report_rtk_installed
        else
            install_rtk_binary || return
        fi
	        if command -v rtk &>/dev/null; then
	            info "RTK installed successfully"
	            if [[ "$INSTALL_CLAUDE" == "true" ]]; then
	                if rtk init --global; then
	                    info "RTK initialized for Claude Code / Copilot via: rtk init -g"
	                else
	                    warn "rtk init --global failed - run manually: rtk init -g"
	                fi
	            fi
	            if [[ "$INSTALL_CODEX" == "true" ]]; then
	                if rtk init --global --codex; then
	                    info "RTK initialized for Codex via: rtk init -g --codex"
	                else
	                    warn "rtk init --global --codex failed - run manually: rtk init -g --codex"
	                fi
	            fi
	        else
	            warn "RTK binary not found in PATH. Restart your shell, then run: rtk init -g and/or rtk init -g --codex"
	        fi
	    else
        warn "Skipping RTK install"
    fi
}

install_claude_plugin_from_repo() {
    rm -rf "$HOME"/.claude/plugins/cache/temp_local_*
    mkdir -p "$HOME/.claude/plugins/marketplaces/openagentsbtw"
    rsync -a --delete --exclude='.git' --exclude='node_modules' --exclude='dist' \
        "$CLAUDE_DIR/" "$HOME/.claude/plugins/marketplaces/openagentsbtw/"
    if claude plugin install openagentsbtw; then
        info "Claude plugin installed from working tree"
    else
        warn "Claude plugin install failed - run manually: make install-claude-plugin"
    fi
}

install_claude_plugin() {
    echo -e "\n${GREEN}Claude plugin${NC}"

    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode - skipping Claude plugin install"
        return
    fi

    claude plugin uninstall openagentsbtw@openagentsbtw 2>/dev/null || true
    claude plugin uninstall openagentsbtw 2>/dev/null || true

    if [[ -f "$CLAUDE_DIR/.claude-plugin/plugin.json" ]]; then
        install_claude_plugin_from_repo
    else
        warn "claude/.claude-plugin/plugin.json missing"
    fi
}

install_ctx7() {
    [[ "$INSTALL_CLAUDE" == "true" ]] || return 0

    echo -e "\n${GREEN}ctx7${NC}"
    if [[ "${CI:-}" == "true" ]]; then
        info "CI mode - skipping ctx7 setup"
        return
    fi

    if run_js_package "ctx7@latest" "setup" "--claude"; then
        info "ctx7 configured"
    else
        warn "ctx7 setup failed - run manually: bunx ctx7 setup --claude"
    fi
}

install_claude() {
    [[ "$INSTALL_CLAUDE" == "true" ]] || return 0

    echo -e "\n${GREEN}Claude Code${NC}"
    check_claude_version
    check_node
    check_jq
    configure_claude_models
    register_claude_marketplace
    merge_claude_global_settings
    cleanup_claude_legacy_mcp_servers
    install_claude_user_files
    install_claude_plugin
    install_ctx7
}

install_opencode() {
    [[ "$INSTALL_OPENCODE" == "true" ]] || return 0

    echo -e "\n${GREEN}OpenCode${NC}"
    check_bun

    local cmd=(
        bun run "$REPO_DIR/opencode/src/cli.ts"
        --scope "$OPENCODE_SCOPE"
        --plugins "inject-preamble,openagentsbtw-core,conventions,safety-guard"
    )

    if [[ -n "$OPENCODE_DEFAULT_MODEL" ]]; then
        cmd+=(--default-model "$OPENCODE_DEFAULT_MODEL")
        info "OpenCode default model: $OPENCODE_DEFAULT_MODEL"
    else
        info "OpenCode models: auto-detect/fallback"
    fi

    local override
    for override in "${OPENCODE_MODEL_OVERRIDES[@]}"; do
        cmd+=(--model "$override")
        info "OpenCode override: $override"
    done

    OABTW_OPENCODE_TEMPLATES_DIR="$OPENCODE_TEMPLATES_DIR" "${cmd[@]}"
    info "OpenCode support installed"
}

install_copilot() {
    [[ "$INSTALL_COPILOT" == "true" ]] || return 0

    echo -e "\n${GREEN}GitHub Copilot${NC}"
    check_node

    local template_root="$COPILOT_DIR/templates/.github"
    [[ -d "$template_root" ]] || die "Copilot templates missing at $template_root. Re-run installer; it should generate artifacts via scripts/build.mjs."

    if [[ "$COPILOT_SCOPE" == "global" || "$COPILOT_SCOPE" == "both" ]]; then
        local copilot_home="$HOME/.copilot"
        mkdir -p "$copilot_home/agents" "$copilot_home/skills"
        local legacy_agent
        for legacy_agent in athena hephaestus nemesis atalanta calliope hermes odysseus; do
            rm -f "$copilot_home/agents/$legacy_agent.md"
        done
        if [[ -d "$template_root/agents" ]]; then
            rsync -a "$template_root/agents/" "$copilot_home/agents/"
        fi
        if [[ -d "$template_root/skills" ]]; then
            rsync -a "$template_root/skills/" "$copilot_home/skills/"
        fi
        info "Copilot agents + skills -> ~/.copilot/"
    fi

    if [[ "$COPILOT_SCOPE" == "project" || "$COPILOT_SCOPE" == "both" ]]; then
        check_python3
        local gh_root="$PWD/.github"
        mkdir -p "$gh_root/agents" "$gh_root/skills" "$gh_root/prompts" "$gh_root/hooks" "$gh_root/hooks/scripts"

        local legacy_agent
        for legacy_agent in athena hephaestus nemesis atalanta calliope hermes odysseus; do
            rm -f "$gh_root/agents/$legacy_agent.md"
        done
        rsync -a "$template_root/agents/" "$gh_root/agents/"
        rsync -a "$template_root/skills/" "$gh_root/skills/"
        rsync -a "$template_root/prompts/" "$gh_root/prompts/"
        cp "$template_root/hooks/openagentsbtw.json" "$gh_root/hooks/openagentsbtw.json"
        rm -f "$gh_root/hooks/openagesbtw.json"

        rsync -a --delete "$COPILOT_DIR/hooks/scripts/openagentsbtw/" "$gh_root/hooks/scripts/openagentsbtw/"
        find "$gh_root/hooks/scripts/openagentsbtw" -type f -name '*.mjs' -exec chmod +x {} \;

        COPILOT_TARGET="$gh_root/copilot-instructions.md" COPILOT_TEMPLATE="$template_root/copilot-instructions.md" python3 - <<'PY'
import os
from pathlib import Path

target = Path(os.environ["COPILOT_TARGET"])
template = Path(os.environ["COPILOT_TEMPLATE"])
target.parent.mkdir(parents=True, exist_ok=True)

start = "<!-- >>> openagentsbtw copilot >>> -->"
end = "<!-- <<< openagentsbtw copilot <<< -->"
body = template.read_text().rstrip() + "\n"
block = f"{start}\n{body}{end}\n"

text = target.read_text() if target.exists() else ""
if start in text and end in text:
    before, _, rest = text.partition(start)
    _, _, after = rest.partition(end)
    text = before.rstrip()
    if text:
        text += "\n\n"
    text += block
    after = after.lstrip("\n")
    if after:
        text += "\n" + after
else:
    text = text.rstrip()
    if text:
        text += "\n\n"
    text += block

target.write_text(text if text.endswith("\n") else text + "\n")
PY
        info "Copilot repo assets -> .github/"
    fi
}

install_codex() {
    [[ "$INSTALL_CODEX" == "true" ]] || return 0

    echo -e "\n${GREEN}Codex${NC}"
    check_node
    check_python3

    local codex_home="$HOME/.codex"
    local agents_home="$HOME/.agents"
    local plugin_target="$codex_home/plugins/openagentsbtw"
    local hooks_root="$codex_home/openagentsbtw/hooks"
    local bin_root="$codex_home/openagentsbtw/bin"
    local hooks_target="$codex_home/hooks.json"
    local marketplace_target="$agents_home/plugins/marketplace.json"
    local config_target="$codex_home/config.toml"
    local agents_md_target="$codex_home/AGENTS.md"

    mkdir -p "$plugin_target" "$codex_home/agents" "$hooks_root/scripts" "$bin_root" "$agents_home/plugins"

    rsync -a --delete "$CODEX_DIR/plugin/openagentsbtw/" "$plugin_target/"
    info "Codex plugin -> ~/.codex/plugins/openagentsbtw"

    rsync -a --delete "$CODEX_DIR/agents/" "$codex_home/agents/"
    CODEX_AGENTS_DIR="$codex_home/agents" CODEX_TIER="$CODEX_TIER" python3 - <<'PY'
import os
import re
from pathlib import Path

agents_dir = Path(os.environ["CODEX_AGENTS_DIR"])
tier = os.environ["CODEX_TIER"]

profiles = {
    "plus": {
        "athena": ("gpt-5.3-codex", "high"),
        "hephaestus": ("gpt-5.3-codex", "high"),
        "nemesis": ("gpt-5.3-codex", "high"),
        "odysseus": ("gpt-5.3-codex", "high"),
        "hermes": ("gpt-5.3-codex", "medium"),
        "atalanta": ("gpt-5.3-codex", "medium"),
        "calliope": ("gpt-5.3-codex", "medium"),
    },
    "pro": {
        "athena": ("gpt-5.2", "high"),
        "hephaestus": ("gpt-5.3-codex", "high"),
        "nemesis": ("gpt-5.2", "high"),
        "odysseus": ("gpt-5.2", "high"),
        "hermes": ("gpt-5.3-codex", "medium"),
        "atalanta": ("gpt-5.3-codex", "medium"),
        "calliope": ("gpt-5.3-codex", "medium"),
    },
}

for path in agents_dir.glob("*.toml"):
    agent = path.stem
    if agent not in profiles[tier]:
        continue
    model, reasoning = profiles[tier][agent]
    text = path.read_text()
    text = re.sub(r'^model = ".*"$', f'model = "{model}"', text, flags=re.M)
    text = re.sub(
        r'^model_reasoning_effort = ".*"$',
        f'model_reasoning_effort = "{reasoning}"',
        text,
        flags=re.M,
    )
    path.write_text(text)
PY
    info "Codex custom agents -> ~/.codex/agents/"

    rsync -a --delete "$CODEX_DIR/hooks/scripts/" "$hooks_root/scripts/"
    find "$hooks_root/scripts" -type f -name '*.mjs' -exec chmod +x {} \;
    info "Codex hook scripts -> ~/.codex/openagentsbtw/hooks/scripts/"

    cp "$BIN_DIR/openagentsbtw-codex" "$bin_root/openagentsbtw-codex"
    cp "$BIN_DIR/oabtw-codex" "$bin_root/oabtw-codex"
    chmod +x "$bin_root/openagentsbtw-codex" "$bin_root/oabtw-codex"
    info "Codex wrapper commands -> ~/.codex/openagentsbtw/bin/openagentsbtw-codex and ~/.codex/openagentsbtw/bin/oabtw-codex"

    MARKETPLACE_TARGET="$marketplace_target" python3 - <<'PY'
import json
import os
from pathlib import Path

target = Path(os.environ["MARKETPLACE_TARGET"])
target.parent.mkdir(parents=True, exist_ok=True)

if target.exists():
    try:
        payload = json.loads(target.read_text())
    except Exception:
        payload = {}
else:
    payload = {}

payload.setdefault("name", "openagentsbtw-local")
payload.setdefault("interface", {})
payload["interface"].setdefault("displayName", "openagentsbtw Local Marketplace")
plugins = payload.setdefault("plugins", [])
plugins = [
    entry
    for entry in plugins
    if not (
        isinstance(entry, dict)
        and entry.get("name") == "openagentsbtw"
    )
]
plugins.append(
    {
        "name": "openagentsbtw",
        "source": {"source": "local", "path": "./.codex/plugins/openagentsbtw"},
        "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"},
        "category": "Productivity",
    }
)
payload["plugins"] = plugins
target.write_text(json.dumps(payload, indent=2) + "\n")
PY
    info "Codex marketplace entry -> ~/.agents/plugins/marketplace.json"

    HOOKS_SOURCE="$CODEX_DIR/hooks/hooks.json" HOOKS_TARGET="$hooks_target" python3 - <<'PY'
import json
import os
from pathlib import Path

source = Path(os.environ["HOOKS_SOURCE"])
target = Path(os.environ["HOOKS_TARGET"])
target.parent.mkdir(parents=True, exist_ok=True)

current = {}
if target.exists():
    try:
        current = json.loads(target.read_text())
    except Exception:
        current = {}

template = json.loads(source.read_text())
current_hooks = current.setdefault("hooks", {})

for event, groups in list(current_hooks.items()):
    filtered = []
    for group in groups:
        commands = [
            hook.get("command", "")
            for hook in group.get("hooks", [])
            if isinstance(hook, dict)
        ]
        if any(".codex/openagentsbtw/hooks/scripts/" in command for command in commands):
            continue
        filtered.append(group)
    current_hooks[event] = filtered

for event, groups in template.get("hooks", {}).items():
    current_hooks.setdefault(event, [])
    current_hooks[event].extend(groups)

target.write_text(json.dumps(current, indent=2) + "\n")
PY
    info "Codex hooks merged into ~/.codex/hooks.json"

    AGENTS_MD_TARGET="$agents_md_target" AGENTS_MD_TEMPLATE="$CODEX_DIR/templates/AGENTS.md" python3 - <<'PY'
import os
from pathlib import Path

target = Path(os.environ["AGENTS_MD_TARGET"])
template = Path(os.environ["AGENTS_MD_TEMPLATE"])
target.parent.mkdir(parents=True, exist_ok=True)
start = "<!-- >>> openagentsbtw codex >>> -->"
end = "<!-- <<< openagentsbtw codex <<< -->"
body = template.read_text()
block = f"{start}\n{body.rstrip()}\n{end}\n"
text = target.read_text() if target.exists() else ""

if start in text and end in text:
    before, _, rest = text.partition(start)
    _, _, after = rest.partition(end)
    text = before.rstrip()
    if text:
        text += "\n\n"
    text += block
    after = after.lstrip("\n")
    if after:
        text += "\n" + after
else:
    text = text.rstrip()
    if text:
        text += "\n\n"
    text += block

target.write_text(text if text.endswith("\n") else text + "\n")
PY
    info "Codex guidance merged into ~/.codex/AGENTS.md"

    local profile_name="openagentsbtw-${CODEX_TIER}"
    local existing_profile="false"
    if [[ -f "$config_target" ]] && grep -Eq '^[[:space:]]*profile[[:space:]]*=' "$config_target"; then
        existing_profile="true"
    fi

    local set_top_profile_action="$CODEX_SET_TOP_PROFILE"
    local will_set_top_profile="false"
    case "$set_top_profile_action" in
        true)
            will_set_top_profile="true"
            ;;
        false)
            will_set_top_profile="false"
            ;;
        auto)
            if [[ "$existing_profile" == "false" ]]; then
                will_set_top_profile="true"
            fi
            ;;
    esac

    CONFIG_TARGET="$config_target" PROFILE_ACTION="$set_top_profile_action" PROFILE_NAME="$profile_name" CODEX_TIER="$CODEX_TIER" CODEX_DEEPWIKI="$CODEX_DEEPWIKI" python3 - <<'PY'
import os
import re
from pathlib import Path

target = Path(os.environ["CONFIG_TARGET"])
target.parent.mkdir(parents=True, exist_ok=True)
start = "# >>> openagentsbtw codex >>>"
end = "# <<< openagentsbtw codex <<<"
profile_action = os.environ.get("PROFILE_ACTION", "auto")
profile_name = os.environ.get("PROFILE_NAME", "openagentsbtw-pro")
tier = os.environ["CODEX_TIER"]
deepwiki = os.environ.get("CODEX_DEEPWIKI", "false") == "true"

default_model = "gpt-5.2"
default_reasoning = "high"
accept_model = "gpt-5.3-codex"
accept_reasoning = "high"

deepwiki_block = """
[mcp_servers.deepwiki]
url = "https://mcp.deepwiki.com/mcp"
enabled = true
""" if deepwiki else ""


def remove_block(text: str, start: str, end: str) -> str:
    if start in text and end in text:
        before, _, rest = text.partition(start)
        _, _, after = rest.partition(end)
        out = before.rstrip()
        after = after.lstrip("\n")
        if out and after:
            out += "\n\n" + after
        elif after:
            out = after
        return out
    return text


existing_text = target.read_text() if target.exists() else ""
text_without_managed = remove_block(existing_text, start, end)

# Legacy cleanup: remove old installer-managed MCP blocks (these are no longer supported).
for legacy_start, legacy_end in [
    ("# >>> openagentsbtw mcp chrome-devtools >>>", "# <<< openagentsbtw mcp chrome-devtools <<<"),
    ("# >>> openagentsbtw mcp browsermcp >>>", "# <<< openagentsbtw mcp browsermcp <<<"),
]:
    text_without_managed = remove_block(text_without_managed, legacy_start, legacy_end)

has_existing_profile = (
    re.search(r"^[\s]*profile[\s]*=", text_without_managed, flags=re.M) is not None
)
set_top_profile = (
    profile_action == "true"
    or (profile_action == "auto" and not has_existing_profile)
)

if set_top_profile:
    text_without_managed = re.sub(
        r"^[\s]*profile[\s]*=.*\n?",
        "",
        text_without_managed,
        flags=re.M,
    )

prefix_lines: list[str] = []
rest_lines: list[str] = []
in_prefix = True
for line in text_without_managed.splitlines():
    if re.match(r"^[\s]*\[", line):
        in_prefix = False
    if in_prefix:
        prefix_lines.append(line)
    else:
        rest_lines.append(line)

if set_top_profile:
    while prefix_lines and prefix_lines[0].strip() == "":
        prefix_lines.pop(0)
    prefix_lines.insert(0, f'profile = "{profile_name}"')

prefix = "\n".join(prefix_lines)
has_commit_attribution = (
    re.search(r"^[\s]*commit_attribution[\s]*=", prefix, flags=re.M) is not None
)
commit_attribution_line = (
    ""
    if has_commit_attribution
    else 'commit_attribution = "Co-Authored-By: Codex <codex@users.noreply.github.com>"\n\n'
)

has_plugin_entry = (
    re.search(
        r'^[\s]*\[plugins\."openagentsbtw@openagentsbtw-local"\][\s]*$',
        text_without_managed,
        flags=re.M,
    )
    is not None
)
plugin_entry_block = (
    ""
    if has_plugin_entry
    else '\n[plugins."openagentsbtw@openagentsbtw-local"]\nenabled = true\n'
)

body = f"""{commit_attribution_line}[profiles.openagentsbtw-plus]
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
plan_mode_reasoning_effort = "high"
model_verbosity = "medium"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-plus.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-pro]
model = "gpt-5.2"
model_reasoning_effort = "high"
plan_mode_reasoning_effort = "high"
model_verbosity = "medium"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-pro.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-codex-mini]
model = "gpt-5.3-codex-spark"
model_reasoning_effort = "low"
plan_mode_reasoning_effort = "low"
model_verbosity = "low"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-codex-mini.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw]
model = "{default_model}"
model_reasoning_effort = "{default_reasoning}"
plan_mode_reasoning_effort = "high"
model_verbosity = "medium"
personality = "none"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

[profiles.openagentsbtw-accept-edits]
model = "{accept_model}"
model_reasoning_effort = "{accept_reasoning}"
plan_mode_reasoning_effort = "high"
model_verbosity = "medium"
personality = "none"
approval_policy = "never"
sandbox_mode = "workspace-write"

[profiles.openagentsbtw-accept-edits.features]
codex_hooks = true
sqlite = true
multi_agent = true
fast_mode = false

{deepwiki_block}"""
body = body.rstrip() + plugin_entry_block + "\n"
block = f"{start}\n{body.rstrip()}\n{end}\n"

prefix_text = "\n".join(prefix_lines).strip("\n")
rest_text = "\n".join(rest_lines).strip("\n")

parts = [part for part in [prefix_text, rest_text, block.rstrip()] if part]
text = "\n\n".join(parts)

target.write_text(text if text.endswith("\n") else text + "\n")
PY
    if [[ "$will_set_top_profile" == "true" ]]; then
        info "Codex default profile set to ${profile_name}"
    else
        warn "Existing Codex default profile preserved; use --profile ${profile_name} to activate this system."
    fi
    info "Codex profile merged into ~/.codex/config.toml"
    info "Codex tier preset: $CODEX_TIER"
    if [[ "$CODEX_DEEPWIKI" == "true" ]]; then
        info "DeepWiki MCP configured in ~/.codex/config.toml"
    fi
}

validate_claude() {
    [[ "$INSTALL_CLAUDE" == "true" ]] || return 0

    local errors=0
    if jq empty "$HOME/.claude/settings.json" 2>/dev/null; then
        info "$HOME/.claude/settings.json is valid JSON"
    else
        echo -e "  ${RED}✗${NC} $HOME/.claude/settings.json is invalid JSON"
        errors=$((errors + 1))
    fi

    [[ -f "$HOME/.claude/output-styles/cca.md" ]] && info "Claude output style installed" || errors=$((errors + 1))
    [[ -f "$HOME/.claude/statusline-command.sh" ]] && info "Claude statusline installed" || errors=$((errors + 1))

    return $errors
}

validate_opencode() {
    [[ "$INSTALL_OPENCODE" == "true" ]] || return 0

    local target
    if [[ "$OPENCODE_SCOPE" == "global" ]]; then
        target="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
    else
        target="$PWD/.opencode"
    fi

    local errors=0
    [[ -f "$target/agents/odysseus.md" ]] && info "OpenCode agents installed" || errors=$((errors + 1))
    [[ -f "$target/plugins/openagentsbtw.ts" ]] && info "OpenCode plugin installed" || errors=$((errors + 1))
    return $errors
}

validate_codex() {
    [[ "$INSTALL_CODEX" == "true" ]] || return 0

    local errors=0
    [[ -f "$HOME/.codex/plugins/openagentsbtw/.codex-plugin/plugin.json" ]] && info "Codex plugin installed" || errors=$((errors + 1))
    [[ -f "$HOME/.codex/agents/athena.toml" ]] && info "Codex custom agents installed" || errors=$((errors + 1))
    [[ -f "$HOME/.codex/hooks.json" ]] && info "Codex hooks installed" || errors=$((errors + 1))
    return $errors
}

validate_copilot() {
    [[ "$INSTALL_COPILOT" == "true" ]] || return 0

    local errors=0
    if [[ "$COPILOT_SCOPE" == "global" || "$COPILOT_SCOPE" == "both" ]]; then
        [[ -f "$HOME/.copilot/agents/athena.agent.md" ]] && info "Copilot global agents installed" || errors=$((errors + 1))
        [[ -d "$HOME/.copilot/skills/review" ]] && info "Copilot global skills installed" || errors=$((errors + 1))
    fi
    if [[ "$COPILOT_SCOPE" == "project" || "$COPILOT_SCOPE" == "both" ]]; then
        [[ -f "$PWD/.github/agents/athena.agent.md" ]] && info "Copilot repo agents installed" || errors=$((errors + 1))
        [[ -f "$PWD/.github/hooks/openagentsbtw.json" ]] && info "Copilot repo hooks installed" || errors=$((errors + 1))
        [[ -f "$PWD/.github/copilot-instructions.md" ]] && info "Copilot instructions installed" || errors=$((errors + 1))
    fi
    return $errors
}

report_summary() {
    echo -e "\n${GREEN}openagentsbtw install complete${NC}"
    echo ""
    [[ "$INSTALL_CLAUDE" == "true" ]] && echo "  Claude:   openagentsbtw@openagentsbtw (tier ${CLAUDE_TIER})"
    [[ "$INSTALL_OPENCODE" == "true" ]] && echo "  OpenCode: ${OPENCODE_SCOPE} install"
    [[ "$INSTALL_COPILOT" == "true" ]] && echo "  Copilot:  ${COPILOT_SCOPE} install"
    [[ "$INSTALL_CODEX" == "true" ]] && echo "  Codex:    ~/.codex/plugins/openagentsbtw + ~/.codex/agents (${CODEX_TIER})"
}

main() {
    parse_args "$@"
    ensure_selection
    prompt_opencode_models
    prompt_codex_tier
    validate_codex_tier
    validate_copilot_scope
    prompt_codex_profile_top
    prompt_playwright_cli

    echo -e "${GREEN}openagentsbtw installer${NC}"
    prepare_build_artifacts

    install_claude
    install_opencode
    install_copilot
    install_playwright_cli
    install_rtk
    install_codex

    local errors=0
    validate_claude || errors=$((errors + $?))
    validate_opencode || errors=$((errors + $?))
    validate_copilot || errors=$((errors + $?))
    validate_codex || errors=$((errors + $?))

    report_summary

    if [[ $errors -gt 0 ]]; then
        echo -e "\n${RED}${errors} validation error(s). Check output above.${NC}"
        exit 1
    fi
}

main "$@"
