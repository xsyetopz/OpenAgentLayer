#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

TARGET_DIR=""
INSTALL_SCOPE="project"

usage() {
    echo -e "${GREEN}Claude Code Agent System Uninstaller${NC}"
    echo "Usage: $0 <target-dir>|--global"
    echo "  <target-dir>  : Path to your project"
    echo "  --global      : Uninstall from global ~/.claude/"
    exit 1
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --global) INSTALL_SCOPE="global"; shift ;;
            -h|--help) usage ;;
            *)
                [[ -z "$TARGET_DIR" ]] && TARGET_DIR="$1" || die "Too many arguments"
                shift ;;
        esac
    done
}

remove_framework_files() {
    echo -e "\nRemoving framework files:"

    # Agents
    if [[ -d "$CLAUDE_DIR/agents" ]]; then
        rm -rf "$CLAUDE_DIR/agents"
        info "Removed agents/"
    fi

    # Skills: remove skills/ca/ directory (current layout)
    if [[ -d "$CLAUDE_DIR/skills/ca" ]]; then
        rm -rf "$CLAUDE_DIR/skills/ca"
        info "Removed skills/ca/"
    fi

    # Also remove any old ca-* directories (legacy migration)
    local skill_count=0
    for skill_dir in "$CLAUDE_DIR"/skills/ca-*/; do
        [[ -d "$skill_dir" ]] || continue
        rm -rf "$skill_dir"
        skill_count=$((skill_count + 1))
    done
    [[ $skill_count -gt 0 ]] && info "Removed $skill_count legacy ca-* skill directories"

    # Remove skills/ if empty
    [[ -d "$CLAUDE_DIR/skills" ]] && rmdir "$CLAUDE_DIR/skills" 2>/dev/null && info "Removed empty skills/" || true

    # Hook scripts
    if [[ -d "$CLAUDE_DIR/hooks/scripts" ]]; then
        rm -rf "$CLAUDE_DIR/hooks/scripts"
        info "Removed hooks/scripts/"
    fi

    # hooks.json
    if [[ -f "$CLAUDE_DIR/hooks.json" ]]; then
        rm -f "$CLAUDE_DIR/hooks.json"
        info "Removed hooks.json"
    fi

    # Remove hooks/ if empty
    [[ -d "$CLAUDE_DIR/hooks" ]] && rmdir "$CLAUDE_DIR/hooks" 2>/dev/null && info "Removed empty hooks/" || true
}

remove_user_level_hooks() {
    echo -e "\nRemoving user-level hooks:"
    for hook in guard-secrets.py rtk-rewrite.sh; do
        if [[ -f "$HOME/.claude/hooks/$hook" ]]; then
            rm -f "$HOME/.claude/hooks/$hook"
            info "Removed ~/.claude/hooks/$hook"
        fi
    done
}

remove_global_extras() {
    [[ "$INSTALL_SCOPE" != "global" ]] && return
    echo -e "\nRemoving global extras:"
    if [[ -f "$HOME/.claude/statusline-command.sh" ]]; then
        rm -f "$HOME/.claude/statusline-command.sh"
        info "Removed ~/.claude/statusline-command.sh"
    fi
}

clean_settings_json() {
    SETTINGS_FILE="$CLAUDE_DIR/settings.json"
    [[ -f "$SETTINGS_FILE" ]] || return

    echo -e "\nCleaning settings.json:"

    if ! command -v jq &>/dev/null; then
        warn "jq not found - cannot clean settings.json. Remove framework keys manually."
        return
    fi

    cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
    info "Backed up to settings.json.backup"

    jq '
        # Remove framework env vars
        .env |= (del(.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) | del(.CLAUDE_CODE_HIDE_ACCOUNT_INFO) | del(.CLAUDE_CODE_IDLE_TERMINATE_MINUTES) | del(.DISABLE_AUTOUPDATER)) |
        if (.env | length) == 0 then del(.env) else . end |

        # Remove framework permissions
        del(.permissions) |

        # Remove hooks referencing guard-secrets or rtk-rewrite
        (if .hooks then
            .hooks |= with_entries(
                .value |= map(select(
                    (.hooks // []) | all(
                        (.command // "") | (test("guard-secrets|rtk-rewrite") | not)
                    )
                ))
            ) |
            .hooks |= with_entries(select(.value | length > 0)) |
            if (.hooks | length) == 0 then del(.hooks) else . end
        else . end) |

        # Remove framework top-level keys
        del(.disableAllHooks) |
        del(.statusLine) |
        del(.autoUpdatesChannel) |
        del(.availableModels) |
        del(.skipWebFetchPreflight) |
        del(.alwaysThinkingEnabled) |
        del(.terminalImageSupport) |

        # Keep: mcpServers, enabledPlugins, extraKnownMarketplaces, and any other user keys
        .
    ' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"

    # Check if settings.json is now essentially empty
    local key_count
    key_count=$(jq 'keys | length' "$SETTINGS_FILE" 2>/dev/null || echo "0")
    if [[ "$key_count" == "0" ]]; then
        info "settings.json is now empty (all framework keys removed)"
    else
        info "Cleaned framework keys from settings.json ($key_count user key(s) preserved)"
    fi
}

confirm_uninstall() {
    echo -e "\n${YELLOW}This will remove the following from $CLAUDE_DIR:${NC}"
    echo "  - agents/ directory"
    echo "  - skills/ca/ directory (and legacy ca-*/ directories)"
    echo "  - hooks/scripts/ directory"
    echo "  - hooks.json"
    echo ""
    echo -e "${YELLOW}User-level hooks to remove:${NC}"
    echo "  - ~/.claude/hooks/guard-secrets.py"
    echo "  - ~/.claude/hooks/rtk-rewrite.sh"
    if [[ "$INSTALL_SCOPE" == "global" ]]; then
        echo "  - ~/.claude/statusline-command.sh"
    fi
    echo ""
    echo -e "${YELLOW}Settings cleanup:${NC}"
    echo "  - Framework keys removed from settings.json (backup created)"
    echo ""
    echo -e "${GREEN}Will NOT remove:${NC}"
    echo "  - CLAUDE.md (may contain customizations)"
    echo "  - RTK (separate tool - use 'brew uninstall rtk' or remove manually)"
    echo "  - settings.json file itself (only framework keys cleaned)"
    echo "  - User-added mcpServers, plugins, marketplaces"
    echo ""
    read -rp "Proceed with uninstall? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
}

main() {
    parse_args "$@"

    if [[ "$INSTALL_SCOPE" == "global" ]]; then
        CLAUDE_DIR="$HOME/.claude"
        echo -e "${GREEN}Claude Code Agent System Uninstaller${NC}"
        echo "Target: $CLAUDE_DIR (global)"
    else
        [[ -z "$TARGET_DIR" ]] && die "Target directory required, or use --global"
        [[ ! -d "$TARGET_DIR" ]] && die "Directory does not exist: $TARGET_DIR"
        TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
        CLAUDE_DIR="$TARGET_DIR/.claude"
        echo -e "${GREEN}Claude Code Agent System Uninstaller${NC}"
        echo "Target: $CLAUDE_DIR"
    fi

    [[ -d "$CLAUDE_DIR" ]] || die "No .claude directory found at target"

    confirm_uninstall
    remove_framework_files
    remove_user_level_hooks
    remove_global_extras
    clean_settings_json

    echo -e "\n${GREEN}Uninstall complete.${NC}"
}

main "$@"
