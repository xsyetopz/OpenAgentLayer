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

usage() {
    echo -e "${GREEN}Claude Code Agent System Installer${NC}"
    echo "Usage: $0 <target-dir>|--global [--pro|--max]"
    echo "  <target-dir>  : Path to your project"
    echo "  --global      : Install to global ~/.claude/"
    echo "  --pro         : Sonnet/Haiku tier (default)"
    echo "  --max         : Opus/Sonnet tier"
    exit 1
}

die() { echo -e "${RED}Error: $1${NC}" >&2; exit 1; }
info() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

# --- Version check ---
check_version() {
    if ! command -v claude &>/dev/null; then
        die "claude CLI not found. Install Claude Code first."
    fi

    local version
    version=$(claude --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [[ -z "$version" ]]; then
        warn "Could not parse claude version, proceeding anyway"
        return
    fi

    local major minor patch
    IFS='.' read -r major minor patch <<< "$version"
    local required_major=2 required_minor=1 required_patch=71

    if (( major < required_major )) || \
       (( major == required_major && minor < required_minor )) || \
       (( major == required_major && minor == required_minor && patch < required_patch )); then
        die "Claude Code v${version} is too old. Requires >= 2.1.71"
    fi
    info "Claude Code v${version}"
}

# --- Parse args ---
while [[ $# -gt 0 ]]; do
    case "$1" in
        --global) INSTALL_SCOPE="global"; shift ;;
        --pro) TIER="pro"; shift ;;
        --max) TIER="max"; shift ;;
        -h|--help) usage ;;
        *)
            if [[ -z "$TARGET_DIR" ]]; then
                TARGET_DIR="$1"
            else
                die "Too many arguments"
            fi
            shift
            ;;
    esac
done

check_version

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

# --- Model mapping ---
case "$TIER" in
    pro)
        MODEL_PLANNER="sonnet"
        MODEL_CODER="sonnet"
        MODEL_REVIEWER="sonnet"
        ;;
    max)
        MODEL_PLANNER="opus"
        MODEL_CODER="sonnet"
        MODEL_REVIEWER="sonnet"
        ;;
esac

mkdir -p "$CLAUDE_DIR"/{agents,skills,hooks/scripts}
mkdir -p "$HOME/.claude/hooks"

AGENT_COUNT=0
SKILL_COUNT=0

# --- Install agents with model substitution ---
echo -e "\nAgents:"
for agent in "$REPO_DIR"/agents/*.md; do
    [[ -f "$agent" ]] || continue
    dest="$CLAUDE_DIR/agents/$(basename "$agent")"
    sed -e "s/__MODEL_PLANNER__/$MODEL_PLANNER/g" \
        -e "s/__MODEL_CODER__/$MODEL_CODER/g" \
        -e "s/__MODEL_REVIEWER__/$MODEL_REVIEWER/g" \
        "$agent" > "$dest"
    info "$(basename "$agent") (model substituted)"
    AGENT_COUNT=$((AGENT_COUNT + 1))
done

# --- Install skills ---
echo -e "\nSkills:"
for skill_dir in "$REPO_DIR"/skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name=$(basename "$skill_dir")
    mkdir -p "$CLAUDE_DIR/skills/$skill_name"
    for skill_file in "$skill_dir"*; do
        [[ -f "$skill_file" ]] || continue
        cp "$skill_file" "$CLAUDE_DIR/skills/$skill_name/$(basename "$skill_file")"
    done
    info "$skill_name"
    SKILL_COUNT=$((SKILL_COUNT + 1))
done

# --- Install hooks ---
echo -e "\nHooks:"

# User-level: redact hooks → ~/.claude/hooks/
for hook in redact-pre.py redact-post.py; do
    src="$REPO_DIR/hooks/$hook"
    dest="$HOME/.claude/hooks/$hook"
    if [[ -f "$src" ]]; then
        cp "$src" "$dest"
        chmod +x "$dest"
        info "$hook → ~/.claude/hooks/ (user-level)"
    fi
done

# Project-level: hooks.json + auto-format
if [[ -f "$REPO_DIR/hooks/hooks.json" ]]; then
    cp "$REPO_DIR/hooks/hooks.json" "$CLAUDE_DIR/hooks.json"
    info "hooks.json → project hooks"
fi
if [[ -f "$REPO_DIR/hooks/scripts/auto-format.sh" ]]; then
    cp "$REPO_DIR/hooks/scripts/auto-format.sh" "$CLAUDE_DIR/hooks/scripts/auto-format.sh"
    chmod +x "$CLAUDE_DIR/hooks/scripts/auto-format.sh"
    info "auto-format.sh → project hooks"
fi

# --- Merge settings.json ---
echo -e "\nSettings:"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

if [[ -f "$SETTINGS_FILE" ]]; then
    cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
    info "Backed up existing settings.json"
fi

# Build the hook entries to merge
REDACT_PRE_ENTRY='{
    "matcher": "Write|Edit|MultiEdit|NotebookEdit|Read|Bash|WebFetch",
    "hooks": [{"type": "command", "command": "\"$HOME\"/.claude/hooks/redact-pre.py", "timeout": 5}]
}'

REDACT_POST_ENTRY='{
    "matcher": "Write|Edit|MultiEdit|NotebookEdit|Bash|WebFetch",
    "hooks": [{"type": "command", "command": "\"$HOME\"/.claude/hooks/redact-post.py", "timeout": 5}]
}'

if command -v jq &>/dev/null; then
    if [[ -f "$SETTINGS_FILE" ]]; then
        # Merge into existing settings
        jq --argjson pre "$REDACT_PRE_ENTRY" \
           --argjson post "$REDACT_POST_ENTRY" '
            .env["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"] //= "1" |
            .env["DISABLE_AUTOUPDATER"] //= "1" |
            .hooks.PreToolUse = ((.hooks.PreToolUse // []) | if any(.hooks[0].command? | test("redact-pre")) then . else . + [$pre] end) |
            .hooks.PostToolUse = ((.hooks.PostToolUse // []) | if any(.hooks[0].command? | test("redact-post")) then . else . + [$post] end)
        ' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp" && mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
        info "Merged into existing settings.json"
    else
        # Create minimal settings
        jq -n --argjson pre "$REDACT_PRE_ENTRY" \
              --argjson post "$REDACT_POST_ENTRY" '{
            env: {
                CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: "1",
                DISABLE_AUTOUPDATER: "1"
            },
            hooks: {
                PreToolUse: [$pre],
                PostToolUse: [$post]
            }
        }' > "$SETTINGS_FILE"
        info "Created settings.json"
    fi
else
    warn "jq not found — skipping settings.json merge. Install jq and re-run."
fi

# --- Install CLAUDE.md template ---
echo -e "\nTemplate:"
if [[ "$INSTALL_SCOPE" == "project" ]]; then
    CLAUDE_MD="$TARGET_DIR/CLAUDE.md"
    if [[ -f "$CLAUDE_MD" ]]; then
        warn "CLAUDE.md already exists at target — skipping (review templates/CLAUDE.md manually)"
    else
        cp "$REPO_DIR/templates/CLAUDE.md" "$CLAUDE_MD"
        info "CLAUDE.md installed"
    fi
else
    warn "Skipping CLAUDE.md for global install (install per-project instead)"
fi

# --- Validation ---
echo -e "\nValidation:"
ERRORS=0

# Check no __MODEL__ remnants
if grep -r '__MODEL_' "$CLAUDE_DIR/agents/" &>/dev/null; then
    echo -e "  ${RED}✗${NC} Found unreplaced __MODEL__ placeholders in agents"
    ERRORS=$((ERRORS + 1))
else
    info "No __MODEL__ remnants"
fi

# Check hooks.json is valid JSON
if [[ -f "$CLAUDE_DIR/hooks.json" ]]; then
    if jq empty "$CLAUDE_DIR/hooks.json" 2>/dev/null; then
        info "hooks.json is valid JSON"
    else
        echo -e "  ${RED}✗${NC} hooks.json is invalid JSON"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check settings.json is valid JSON
if [[ -f "$SETTINGS_FILE" ]]; then
    if jq empty "$SETTINGS_FILE" 2>/dev/null; then
        info "settings.json is valid JSON"
    else
        echo -e "  ${RED}✗${NC} settings.json is invalid JSON"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check for banned patterns in agents
if grep -riE '(robust|seamless|comprehensive|allowedTools)' "$CLAUDE_DIR/agents/" &>/dev/null; then
    echo -e "  ${RED}✗${NC} Found banned patterns in agents"
    ERRORS=$((ERRORS + 1))
else
    info "No banned patterns in agents"
fi

# Check for old autonomous-executor patterns in agents
if grep -riE '(just do it|do not offer alternatives|don.t explain|no teaching)' "$CLAUDE_DIR/agents/" &>/dev/null; then
    echo -e "  ${RED}✗${NC} Found old autonomous-executor patterns in agents"
    ERRORS=$((ERRORS + 1))
else
    info "No old autonomous-executor patterns in agents"
fi

echo -e "\n${GREEN}Done!${NC} Installed $AGENT_COUNT agents, $SKILL_COUNT skills"
echo ""
echo "Agents:"
echo "  @planner  — plan, design, architect (model: $MODEL_PLANNER)"
echo "  @coder    — implement, write, fix    (model: $MODEL_CODER)"
echo "  @reviewer — review, test, audit      (model: $MODEL_REVIEWER)"

if [[ $ERRORS -gt 0 ]]; then
    echo -e "\n${RED}$ERRORS validation error(s) found. Check output above.${NC}"
    exit 1
fi
