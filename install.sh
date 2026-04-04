#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
CLAUDE_DIR="$REPO_DIR/claude"

INSTALL_CLAUDE="false"
INSTALL_OPENCODE="false"
INSTALL_CODEX="false"
SKIP_RTK="false"
CLAUDE_TIER="5x"
OPENCODE_SCOPE="global"
OPENCODE_DEFAULT_MODEL=""
OPENCODE_MODEL_OVERRIDES=()
CODEX_TIER=""
CODEX_DEEPWIKI="false"
CODEX_SET_TOP_PROFILE="auto"
MCP_CHROME_DEVTOOLS="keep"
MCP_BROWSERMCP="keep"
MCP_CHROME_DEVTOOLS_SET="false"
MCP_BROWSERMCP_SET="false"

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
  --codex-tier plus|pro   Codex model routing preset
    --codex-set-top-profile Force setting top-level Codex profile in ~/.codex/config.toml
    --no-codex-set-top-profile
                                                    Do not set top-level Codex profile in ~/.codex/config.toml
  --codex-deepwiki        Configure DeepWiki MCP for Codex
  --chrome-devtools-mcp   Enable Chrome DevTools MCP server (all selected systems)
  --no-chrome-devtools-mcp
                          Disable Chrome DevTools MCP server (all selected systems)
  --browsermcp            Enable Browser MCP server (all selected systems)
  --no-browsermcp         Disable Browser MCP server (all selected systems)
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
            --all)
                INSTALL_CLAUDE="true"
                INSTALL_OPENCODE="true"
                INSTALL_CODEX="true"
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
            --chrome-devtools-mcp)
                MCP_CHROME_DEVTOOLS="enable"
                MCP_CHROME_DEVTOOLS_SET="true"
                ;;
            --no-chrome-devtools-mcp)
                MCP_CHROME_DEVTOOLS="disable"
                MCP_CHROME_DEVTOOLS_SET="true"
                ;;
            --browsermcp)
                MCP_BROWSERMCP="enable"
                MCP_BROWSERMCP_SET="true"
                ;;
            --no-browsermcp)
                MCP_BROWSERMCP="disable"
                MCP_BROWSERMCP_SET="true"
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

prompt_tri_state() {
    local label="$1"
    local default_choice="$2" # keep|enable|disable
    local answer

    echo -e "\n${GREEN}${label}${NC}" >&2
    echo "  [1] keep    (no changes)" >&2
    echo "  [2] enable" >&2
    echo "  [3] disable" >&2

    read -rp "  > " answer
    case "${answer:-}" in
        2) echo "enable" ;;
        3) echo "disable" ;;
        1|"") echo "$default_choice" ;;
        *) echo "$default_choice" ;;
    esac
}

prompt_mcp_toggles() {
    [[ "${CI:-}" == "true" ]] && return 0
    [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_OPENCODE" == "true" || "$INSTALL_CODEX" == "true" ]] || return 0

    if [[ "$MCP_CHROME_DEVTOOLS_SET" != "true" ]]; then
        MCP_CHROME_DEVTOOLS="$(prompt_tri_state "Chrome DevTools MCP" "keep")"
    fi
    if [[ "$MCP_BROWSERMCP_SET" != "true" ]]; then
        MCP_BROWSERMCP="$(prompt_tri_state "Browser MCP" "keep")"
    fi
}

ensure_selection() {
    if [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_OPENCODE" == "true" || "$INSTALL_CODEX" == "true" ]]; then
        return
    fi

    echo -e "${GREEN}Select systems to install${NC}"
    prompt_toggle "Install Claude Code support?" "Y" && INSTALL_CLAUDE="true"
    prompt_toggle "Install OpenCode support?" "Y" && INSTALL_OPENCODE="true"
    prompt_toggle "Install Codex support?" "Y" && INSTALL_CODEX="true"

    [[ "$INSTALL_CLAUDE" == "true" || "$INSTALL_OPENCODE" == "true" || "$INSTALL_CODEX" == "true" ]] || die "No systems selected"
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

check_node() {
    command -v node &>/dev/null || die "node not found. Claude and Codex hook scripts require Node.js >= 24.14.1."
    local node_ver
    node_ver=$(node --version 2>/dev/null | grep -oE '[0-9]+' | head -1)
    (( node_ver >= 24 )) || die "Node.js v${node_ver} is too old. Requires >= 24.14.1."
    info "Node.js $(node --version 2>&1)"
}

check_jq() {
    command -v jq &>/dev/null || die "jq is required for Claude settings.json merging. Install with: brew install jq"
    info "jq found"
}

check_bun() {
    command -v bun &>/dev/null || die "bun is required for OpenCode installation."
    info "bun $(bun --version 2>/dev/null)"
}

check_python3() {
    command -v python3 &>/dev/null || die "python3 is required for Codex installation."
    info "python3 $(python3 --version 2>/dev/null)"
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

configure_claude_mcp_server() {
    local settings_file="$HOME/.claude/settings.json"
    local key="$1"
    local action="$2" # keep|enable|disable
    local args_json="$3"

    [[ -f "$settings_file" ]] || return 0
    [[ "$action" == "keep" ]] && return 0

    if [[ "$action" == "enable" ]]; then
        jq --arg key "$key" --arg cmd "bunx" --argjson args "$args_json" '
            .mcpServers = (.mcpServers // {}) |
            .mcpServers[$key] = {command: $cmd, args: $args}
        ' "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
        return 0
    fi

    jq --arg key "$key" '
        if (.mcpServers? | type == "object") then
            .mcpServers |= del(.[$key]) |
            if ((.mcpServers | length) == 0) then del(.mcpServers) else . end
        else
            .
        end
    ' "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
}

configure_claude_mcp_servers() {
    [[ "$INSTALL_CLAUDE" == "true" ]] || return 0

    configure_claude_mcp_server "chrome-devtools" "$MCP_CHROME_DEVTOOLS" '["-y","chrome-devtools-mcp@latest"]'
    configure_claude_mcp_server "browsermcp" "$MCP_BROWSERMCP" '["-y","@browsermcp/mcp@latest"]'

    if [[ "$MCP_BROWSERMCP" == "enable" ]]; then
        info "Browser MCP requires the Chrome extension + a connected tab: https://docs.browsermcp.io/setup-extension"
    fi
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

    if command -v bun &>/dev/null; then
        if bun x ctx7 setup --claude; then
            info "ctx7 configured via bun"
        else
            warn "ctx7 setup failed - run manually: bunx ctx7 setup --claude"
        fi
    elif command -v npx &>/dev/null; then
        if npx ctx7 setup --claude; then
            info "ctx7 configured via npx"
        else
            warn "ctx7 setup failed - run manually: npx ctx7 setup --claude"
        fi
    else
        warn "Neither bun nor npx found - skip ctx7 setup"
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
    configure_claude_mcp_servers
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

    if [[ "$MCP_CHROME_DEVTOOLS" == "enable" ]]; then
        cmd+=(--chrome-devtools-mcp)
    elif [[ "$MCP_CHROME_DEVTOOLS" == "disable" ]]; then
        cmd+=(--no-chrome-devtools-mcp)
    fi

    if [[ "$MCP_BROWSERMCP" == "enable" ]]; then
        cmd+=(--browsermcp)
    elif [[ "$MCP_BROWSERMCP" == "disable" ]]; then
        cmd+=(--no-browsermcp)
    fi

    "${cmd[@]}"
    info "OpenCode support installed"
}

configure_codex_mcp_servers() {
    [[ "$INSTALL_CODEX" == "true" ]] || return 0
    [[ "$MCP_CHROME_DEVTOOLS" == "keep" && "$MCP_BROWSERMCP" == "keep" ]] && return 0

    local config_target="$HOME/.codex/config.toml"
    if [[ "$MCP_CHROME_DEVTOOLS" == "enable" && -f "$config_target" ]]; then
        if grep -Eq '^[[:space:]]*\[mcp_servers\.chrome-devtools\]' "$config_target" && ! grep -q '# >>> openagentsbtw mcp chrome-devtools >>>' "$config_target"; then
            warn "Codex config already defines mcp_servers.chrome-devtools; leaving it untouched."
        fi
    fi
    if [[ "$MCP_BROWSERMCP" == "enable" && -f "$config_target" ]]; then
        if grep -Eq '^[[:space:]]*\[mcp_servers\.browsermcp\]' "$config_target" && ! grep -q '# >>> openagentsbtw mcp browsermcp >>>' "$config_target"; then
            warn "Codex config already defines mcp_servers.browsermcp; leaving it untouched."
        fi
    fi

    MCP_CHROME_DEVTOOLS="$MCP_CHROME_DEVTOOLS" MCP_BROWSERMCP="$MCP_BROWSERMCP" CONFIG_TARGET="$config_target" python3 - <<'PY'
import os
import re
from pathlib import Path

target = Path(os.environ["CONFIG_TARGET"])
target.parent.mkdir(parents=True, exist_ok=True)

action_chrome = os.environ.get("MCP_CHROME_DEVTOOLS", "keep")
action_browser = os.environ.get("MCP_BROWSERMCP", "keep")

chrome_start = "# >>> openagentsbtw mcp chrome-devtools >>>"
chrome_end = "# <<< openagentsbtw mcp chrome-devtools <<<"
browser_start = "# >>> openagentsbtw mcp browsermcp >>>"
browser_end = "# <<< openagentsbtw mcp browsermcp <<<"

chrome_body = """[mcp_servers.chrome-devtools]
command = "bunx"
args = ["-y", "chrome-devtools-mcp@latest"]
enabled = true
"""

browser_body = """[mcp_servers.browsermcp]
command = "bunx"
args = ["-y", "@browsermcp/mcp@latest"]
enabled = true
"""

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

def append_block(text: str, start: str, end: str, body: str) -> str:
    block = f"{start}\n{body.rstrip()}\n{end}\n"
    text = text.rstrip()
    if text:
        text += "\n\n"
    text += block
    return text

def manage(text: str, action: str, start: str, end: str, body: str, header_re: str) -> str:
    if action == "keep":
        return text
    text_without_managed = remove_block(text, start, end)
    if action == "disable":
        return text_without_managed
    if re.search(header_re, text_without_managed, flags=re.M):
        return text_without_managed
    return append_block(text_without_managed, start, end, body)

existed = target.exists()
text = target.read_text() if existed else ""
text = manage(
    text,
    action_chrome,
    chrome_start,
    chrome_end,
    chrome_body,
    r"^[\s]*\[mcp_servers\.chrome-devtools\][\s]*$",
)
text = manage(
    text,
    action_browser,
    browser_start,
    browser_end,
    browser_body,
    r"^[\s]*\[mcp_servers\.browsermcp\][\s]*$",
)

if not existed and not text.strip():
    raise SystemExit(0)

target.write_text(text if text.endswith("\n") else text + "\n")
PY
    if [[ "$MCP_BROWSERMCP" == "enable" ]]; then
        info "Browser MCP requires the Chrome extension + a connected tab: https://docs.browsermcp.io/setup-extension"
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

    rsync -a --delete "$REPO_DIR/codex/plugin/openagentsbtw/" "$plugin_target/"
    info "Codex plugin -> ~/.codex/plugins/openagentsbtw"

    rsync -a --delete "$REPO_DIR/codex/agents/" "$codex_home/agents/"
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

    rsync -a --delete "$REPO_DIR/codex/hooks/scripts/" "$hooks_root/scripts/"
    find "$hooks_root/scripts" -type f -name '*.mjs' -exec chmod +x {} \;
    info "Codex hook scripts -> ~/.codex/openagentsbtw/hooks/scripts/"

    cp "$REPO_DIR/bin/openagentsbtw-codex" "$bin_root/openagentsbtw-codex"
    cp "$REPO_DIR/bin/oabtw-codex" "$bin_root/oabtw-codex"
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

    HOOKS_SOURCE="$REPO_DIR/codex/hooks/hooks.json" HOOKS_TARGET="$hooks_target" python3 - <<'PY'
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

    AGENTS_MD_TARGET="$agents_md_target" python3 - <<'PY'
import os
from pathlib import Path

target = Path(os.environ["AGENTS_MD_TARGET"])
target.parent.mkdir(parents=True, exist_ok=True)
start = "<!-- >>> openagentsbtw codex >>> -->"
end = "<!-- <<< openagentsbtw codex <<< -->"
body = """## openagentsbtw

- Use the custom agents `athena`, `hephaestus`, `nemesis`, `atalanta`, `calliope`, `hermes`, and `odysseus`.
- Prefer `athena` before non-trivial multi-file implementation.
- Prefer `nemesis` for review and `atalanta` for targeted validation before closing substantial changes.
- Keep Fast mode off for this workflow.
- Use `gpt-5.2` for high-reasoning main work, `gpt-5.3-codex` for implementation, and `gpt-5.3-codex-spark` for the lightweight mini profile.
- Use real `AGENTS.md` files in projects instead of symlinked `CLAUDE.md`.
- Prefer `oabtw-codex triage` or `oabtw-codex deepwiki` before broad repo exploration. Use DeepWiki only for public GitHub repos, then verify local file:line claims in the repo.
- Start with the answer, decision, or action. Do not restate the prompt or narrate intent.
- Match detail to the task. No praise, apology, therapist tone, or trailing optional-offer boilerplate.
- If something is uncertain, say `UNKNOWN` and state what would resolve it.
"""
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

    configure_codex_mcp_servers
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

report_summary() {
    echo -e "\n${GREEN}openagentsbtw install complete${NC}"
    echo ""
    [[ "$INSTALL_CLAUDE" == "true" ]] && echo "  Claude:   openagentsbtw@openagentsbtw (tier ${CLAUDE_TIER})"
    [[ "$INSTALL_OPENCODE" == "true" ]] && echo "  OpenCode: ${OPENCODE_SCOPE} install"
    [[ "$INSTALL_CODEX" == "true" ]] && echo "  Codex:    ~/.codex/plugins/openagentsbtw + ~/.codex/agents (${CODEX_TIER})"
}

main() {
    parse_args "$@"
    ensure_selection
    prompt_opencode_models
    prompt_codex_tier
    validate_codex_tier
    prompt_codex_profile_top
    prompt_mcp_toggles

    echo -e "${GREEN}openagentsbtw installer${NC}"

    install_claude
    install_opencode
    install_rtk
    install_codex

    local errors=0
    validate_claude || errors=$((errors + $?))
    validate_opencode || errors=$((errors + $?))
    validate_codex || errors=$((errors + $?))

    report_summary

    if [[ $errors -gt 0 ]]; then
        echo -e "\n${RED}${errors} validation error(s). Check output above.${NC}"
        exit 1
    fi
}

main "$@"
