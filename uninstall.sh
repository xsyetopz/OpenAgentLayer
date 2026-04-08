#!/bin/bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"

REMOVE_CLAUDE="false"
REMOVE_OPENCODE="false"
REMOVE_CODEX="false"
REMOVE_COPILOT="false"
OPENCODE_SCOPE="global"
COPILOT_SCOPE="global"

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

check_python3() {
    command -v python3 &>/dev/null || die "python3 is required for Codex uninstall cleanup."
}

usage() {
    cat <<'EOF'
openagentsbtw uninstaller

Usage: ./uninstall.sh [system toggles] [options]

System toggles (allow multiple):
  --claude
  --opencode
  --codex
  --copilot
  --all

Options:
  --opencode-scope project|global
  --copilot-scope global|project|both
  -h, --help
EOF
    exit 0
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --claude) REMOVE_CLAUDE="true" ;;
            --opencode) REMOVE_OPENCODE="true" ;;
            --codex) REMOVE_CODEX="true" ;;
            --copilot) REMOVE_COPILOT="true" ;;
            --all)
                REMOVE_CLAUDE="true"
                REMOVE_OPENCODE="true"
                REMOVE_CODEX="true"
                REMOVE_COPILOT="true"
                ;;
            --opencode-scope)
                OPENCODE_SCOPE="${2:-}"
                shift
                ;;
            --copilot-scope)
                COPILOT_SCOPE="${2:-}"
                shift
                ;;
            -h|--help) usage ;;
            *) die "Unknown argument: $1" ;;
        esac
        shift
    done
}

ensure_selection() {
    if [[ "$REMOVE_CLAUDE" == "false" && "$REMOVE_OPENCODE" == "false" && "$REMOVE_CODEX" == "false" && "$REMOVE_COPILOT" == "false" ]]; then
        REMOVE_CLAUDE="true"
        REMOVE_OPENCODE="true"
        REMOVE_CODEX="true"
        REMOVE_COPILOT="true"
    fi
}

remove_claude() {
    [[ "$REMOVE_CLAUDE" == "true" ]] || return 0

    echo -e "\n${GREEN}Removing Claude Code support${NC}"

    if command -v claude &>/dev/null; then
        claude plugin uninstall openagentsbtw@openagentsbtw 2>/dev/null || true
        claude plugin uninstall openagentsbtw 2>/dev/null || true
    fi

    rm -f "$HOME/.claude/hooks/pre-secrets.mjs" "$HOME/.claude/hooks/rtk-rewrite.sh"
    rm -f "$HOME/.claude/output-styles/cca.md" "$HOME/.claude/statusline-command.sh"
    rm -rf "$HOME/.claude/plugins/marketplaces/openagentsbtw"
    info "Removed Claude plugin files"

    local settings_file="$HOME/.claude/settings.json"
    if [[ -f "$settings_file" ]] && command -v jq &>/dev/null; then
        cp "$settings_file" "${settings_file}.backup"
        jq '
            del(.enabledPlugins["openagentsbtw@openagentsbtw"]) |
            del(.extraKnownMarketplaces["openagentsbtw"])
        ' "$settings_file" > "${settings_file}.tmp" && mv "${settings_file}.tmp" "$settings_file"
        info "Cleaned Claude marketplace settings"
    fi
}

remove_opencode() {
    [[ "$REMOVE_OPENCODE" == "true" ]] || return 0

    echo -e "\n${GREEN}Removing OpenCode support${NC}"

    local target
    if [[ "$OPENCODE_SCOPE" == "global" ]]; then
        target="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
    else
        target="$PWD/.opencode"
    fi

    local agent
    for agent in odysseus athena hephaestus nemesis atalanta calliope hermes argus orion prometheus; do
        rm -f "$target/agents/$agent.md"
    done

    local command
    for command in openagents-review openagents-test openagents-implement openagents-docs openagents-explore openagents-trace openagents-debug openagents-plan-feature openagents-plan-refactor openagents-audit openagents-ship; do
        rm -f "$target/commands/$command.md"
    done

    local ctx
    for ctx in overview tech-stack conventions structure agent-notes; do
        rm -f "$target/context/$ctx.md"
    done

    rm -f "$target/plugins/openagentsbtw.ts"

    if [[ -d "$REPO_DIR/opencode/templates/skills" ]]; then
        while IFS= read -r skill_dir; do
            rm -rf "$target/skills/$skill_dir"
        done < <(find "$REPO_DIR/opencode/templates/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)
    fi

    info "Removed OpenCode files from $target"
    warn "OpenCode config keys in opencode.json/jsonc were not edited automatically"
}

remove_copilot() {
    [[ "$REMOVE_COPILOT" == "true" ]] || return 0

    echo -e "\n${GREEN}Removing GitHub Copilot support${NC}"
    check_python3

    case "$COPILOT_SCOPE" in
        global|project|both) ;;
        *) die "Unsupported Copilot scope: $COPILOT_SCOPE (expected global, project, or both)" ;;
    esac

    local template_root="$REPO_DIR/copilot/templates/.github"
    local skill_dirs=()
    if [[ -d "$template_root/skills" ]]; then
        while IFS= read -r d; do
            skill_dirs+=("$d")
        done < <(find "$template_root/skills" -mindepth 1 -maxdepth 1 -type d -exec basename {} \;)
    else
        skill_dirs=(decide desloppify docs errors debug explore handoff openagentsbtw perf review security ship style test trace)
    fi

    if [[ "$COPILOT_SCOPE" == "global" || "$COPILOT_SCOPE" == "both" ]]; then
        local copilot_home="$HOME/.copilot"
        local agent
        for agent in athena hephaestus nemesis atalanta calliope hermes odysseus; do
            rm -f "$copilot_home/agents/$agent.md"
            rm -f "$copilot_home/agents/$agent.agent.md"
        done
        local skill
        for skill in "${skill_dirs[@]}"; do
            rm -rf "$copilot_home/skills/$skill"
        done
        info "Removed Copilot global agents + skills from ~/.copilot/"
    fi

    if [[ "$COPILOT_SCOPE" == "project" || "$COPILOT_SCOPE" == "both" ]]; then
        local gh_root="$PWD/.github"
        local agent
        for agent in athena hephaestus nemesis atalanta calliope hermes odysseus; do
            rm -f "$gh_root/agents/$agent.md"
            rm -f "$gh_root/agents/$agent.agent.md"
        done
        local skill
        for skill in "${skill_dirs[@]}"; do
            rm -rf "$gh_root/skills/$skill"
        done

        if [[ -d "$template_root/prompts" ]]; then
            while IFS= read -r prompt_file; do
                rm -f "$gh_root/prompts/$prompt_file"
            done < <(find "$template_root/prompts" -type f -maxdepth 1 -exec basename {} \;)
        else
            rm -f "$gh_root/prompts/oabtw-"*.prompt.md 2>/dev/null || true
        fi

        rm -f "$gh_root/hooks/openagentsbtw.json"
        rm -f "$gh_root/hooks/openagesbtw.json"
        rm -rf "$gh_root/hooks/scripts/openagentsbtw"

        COPILOT_MD_TARGET="$gh_root/copilot-instructions.md" python3 - <<'PY'
import os
from pathlib import Path

target = Path(os.environ["COPILOT_MD_TARGET"])
if not target.exists():
    raise SystemExit(0)

start = "<!-- >>> openagentsbtw copilot >>> -->"
end = "<!-- <<< openagentsbtw copilot <<< -->"
text = target.read_text()
if start in text and end in text:
    before, _, rest = text.partition(start)
    _, _, after = rest.partition(end)
    text = before.rstrip()
    after = after.lstrip("\n")
    if text and after:
        text = text + "\n\n" + after
    elif after:
        text = after
    if text and not text.endswith("\n"):
        text += "\n"
    target.write_text(text)
PY

        info "Removed Copilot repo assets from .github/"
    fi
}

remove_codex() {
    [[ "$REMOVE_CODEX" == "true" ]] || return 0

    echo -e "\n${GREEN}Removing Codex support${NC}"
    check_python3

    rm -rf "$HOME/.codex/plugins/openagentsbtw" "$HOME/.codex/openagentsbtw"

    local agent
    for agent in athena hephaestus nemesis atalanta calliope hermes odysseus; do
        local agent_file="$HOME/.codex/agents/$agent.toml"
        if [[ -f "$agent_file" ]] && grep -q 'openagentsbtw managed file' "$agent_file"; then
            rm -f "$agent_file"
        fi
    done

    HOOKS_TARGET="$HOME/.codex/hooks.json" python3 - <<'PY'
import json
import os
from pathlib import Path

target = Path(os.environ["HOOKS_TARGET"])
if not target.exists():
    raise SystemExit(0)

try:
    payload = json.loads(target.read_text())
except Exception:
    raise SystemExit(0)
hooks = payload.get("hooks", {})
for event, groups in list(hooks.items()):
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
    if filtered:
        hooks[event] = filtered
    else:
        hooks.pop(event, None)

target.write_text(json.dumps(payload, indent=2) + "\n")
PY

    MARKETPLACE_TARGET="$HOME/.agents/plugins/marketplace.json" python3 - <<'PY'
import json
import os
from pathlib import Path

target = Path(os.environ["MARKETPLACE_TARGET"])
if not target.exists():
    raise SystemExit(0)

try:
    payload = json.loads(target.read_text())
except Exception:
    raise SystemExit(0)
plugins = payload.get("plugins", [])
payload["plugins"] = [
    entry
    for entry in plugins
    if not (
        isinstance(entry, dict)
        and entry.get("name") == "openagentsbtw"
    )
]
target.write_text(json.dumps(payload, indent=2) + "\n")
PY

    AGENTS_MD_TARGET="$HOME/.codex/AGENTS.md" CONFIG_TARGET="$HOME/.codex/config.toml" python3 - <<'PY'
import os
from pathlib import Path

def strip_block(path_str, start, end):
    path = Path(path_str)
    if not path.exists():
        return
    text = path.read_text()
    if start in text and end in text:
        before, _, rest = text.partition(start)
        _, _, after = rest.partition(end)
        text = before.rstrip()
        after = after.lstrip("\n")
        if text and after:
            text = text + "\n\n" + after
        elif after:
            text = after
        if text and not text.endswith("\n"):
            text += "\n"
        path.write_text(text)

strip_block(
    os.environ["AGENTS_MD_TARGET"],
    "<!-- >>> openagentsbtw codex >>> -->",
    "<!-- <<< openagentsbtw codex <<< -->",
)
strip_block(
    os.environ["CONFIG_TARGET"],
    "# >>> openagentsbtw codex >>>",
    "# <<< openagentsbtw codex <<<",
)
PY

    info "Removed Codex plugin, agents, hooks, and managed profile blocks"
}

main() {
    parse_args "$@"
    ensure_selection

    remove_claude
    remove_opencode
    remove_copilot
    remove_codex

    echo -e "\n${GREEN}openagentsbtw uninstall complete${NC}"
}

main "$@"
