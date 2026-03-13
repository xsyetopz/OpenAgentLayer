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
    echo "  --pro         : Sonnet tier (default)"
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

# --- Python 3 check ---
check_python() {
    if ! command -v python3 &>/dev/null; then
        die "python3 not found. Hook scripts require Python 3."
    fi
    info "python3 found: $(python3 --version 2>&1)"
}

# --- Migration check ---
check_migration() {
    local claude_dir="$1"
    local old_agents=0
    for old_agent in planner.md coder.md reviewer.md; do
        if [[ -f "$claude_dir/agents/$old_agent" ]]; then
            old_agents=$((old_agents + 1))
        fi
    done
    if [[ $old_agents -gt 0 ]]; then
        warn "Found $old_agents old agent(s) (planner/coder/reviewer) in $claude_dir/agents/"
        warn "These will be replaced by the new verb-named agents (architect/implement/audit/...)"
        warn "Old agent files will be overwritten"
    fi
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

check_migration "$CLAUDE_DIR"

# --- Model mapping ---
case "$TIER" in
    pro)
        MODEL_ARCHITECT="sonnet"
        MODEL_IMPLEMENT="sonnet"
        MODEL_AUDIT="sonnet"
        MODEL_TEST="sonnet"
        MODEL_DOCUMENT="sonnet"
        MODEL_INVESTIGATE="sonnet"
        MODEL_ORCHESTRATE="sonnet"
        ;;
    max)
        MODEL_ARCHITECT="opus"
        MODEL_IMPLEMENT="sonnet"
        MODEL_AUDIT="sonnet"
        MODEL_TEST="sonnet"
        MODEL_DOCUMENT="sonnet"
        MODEL_INVESTIGATE="sonnet"
        MODEL_ORCHESTRATE="opus"
        ;;
esac

mkdir -p "$CLAUDE_DIR"/{agents,skills,hooks/scripts}
mkdir -p "$HOME/.claude/hooks"

AGENT_COUNT=0
SKILL_COUNT=0

# --- Remove old agents if present ---
for old_agent in planner.md coder.md reviewer.md; do
    if [[ -f "$CLAUDE_DIR/agents/$old_agent" ]]; then
        rm "$CLAUDE_DIR/agents/$old_agent"
        warn "Removed old agent: $old_agent"
    fi
done

# --- Install agents with model substitution ---
echo -e "\nAgents:"
for agent in "$REPO_DIR"/agents/*.md; do
    [[ -f "$agent" ]] || continue
    dest="$CLAUDE_DIR/agents/$(basename "$agent")"
    sed -e "s/__MODEL_ARCHITECT__/$MODEL_ARCHITECT/g" \
        -e "s/__MODEL_IMPLEMENT__/$MODEL_IMPLEMENT/g" \
        -e "s/__MODEL_AUDIT__/$MODEL_AUDIT/g" \
        -e "s/__MODEL_TEST__/$MODEL_TEST/g" \
        -e "s/__MODEL_DOCUMENT__/$MODEL_DOCUMENT/g" \
        -e "s/__MODEL_INVESTIGATE__/$MODEL_INVESTIGATE/g" \
        -e "s/__MODEL_ORCHESTRATE__/$MODEL_ORCHESTRATE/g" \
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

# Project-level: hooks.json + all scripts
if [[ -f "$REPO_DIR/hooks/hooks.json" ]]; then
    cp "$REPO_DIR/hooks/hooks.json" "$CLAUDE_DIR/hooks.json"
    info "hooks.json → project hooks"
fi

# Bulk copy all hook scripts
if [[ -d "$REPO_DIR/hooks/scripts" ]]; then
    cp -r "$REPO_DIR/hooks/scripts/"* "$CLAUDE_DIR/hooks/scripts/" 2>/dev/null || true
    chmod +x "$CLAUDE_DIR/hooks/scripts/"*.py "$CLAUDE_DIR/hooks/scripts/"*.sh 2>/dev/null || true
    HOOK_COUNT=$(ls -1 "$CLAUDE_DIR/hooks/scripts/" 2>/dev/null | wc -l | tr -d ' ')
    info "$HOOK_COUNT hook scripts → project hooks"
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
            (if .autoUpdatesChannel then .autoUpdatesChannel = "stable" else . end) |
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
            autoUpdatesChannel: "stable",
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

# Check Python hooks parse without syntax errors
PYTHON_ERRORS=0
for pyfile in "$CLAUDE_DIR/hooks/scripts/"*.py; do
    [[ -f "$pyfile" ]] || continue
    if ! python3 -c "import py_compile; py_compile.compile('$pyfile', doraise=True)" 2>/dev/null; then
        echo -e "  ${RED}✗${NC} Syntax error in $(basename "$pyfile")"
        PYTHON_ERRORS=$((PYTHON_ERRORS + 1))
    fi
done
if [[ $PYTHON_ERRORS -eq 0 ]]; then
    info "All Python hooks parse without errors"
else
    ERRORS=$((ERRORS + PYTHON_ERRORS))
fi

# Check for banned patterns in agents (exclude lines that list them as prohibited)
if grep -riE '(robust|seamless|comprehensive|allowedTools)' "$CLAUDE_DIR/agents/" | grep -viE '(never use|no .*(slop|ai)|do not|banned|prohibited|no ai slop)' &>/dev/null; then
    echo -e "  ${RED}✗${NC} Found banned patterns in agents (outside prohibition rules)"
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

# Check for old agent names
if [[ -f "$CLAUDE_DIR/agents/planner.md" ]] || [[ -f "$CLAUDE_DIR/agents/coder.md" ]] || [[ -f "$CLAUDE_DIR/agents/reviewer.md" ]]; then
    echo -e "  ${RED}✗${NC} Old agent files still present (planner/coder/reviewer)"
    ERRORS=$((ERRORS + 1))
else
    info "No old agent files"
fi

echo -e "\n${GREEN}Done!${NC} Installed $AGENT_COUNT agents, $SKILL_COUNT skills"
echo ""
echo "Agents:"
echo "  @architect    — design, plan, architect     (model: $MODEL_ARCHITECT)"
echo "  @implement    — write code, fix bugs        (model: $MODEL_IMPLEMENT)"
echo "  @audit        — review, security audit      (model: $MODEL_AUDIT)"
echo "  @test         — run tests, diagnose fails   (model: $MODEL_TEST)"
echo "  @document     — write/edit documentation    (model: $MODEL_DOCUMENT)"
echo "  @investigate  — research, explore codebase  (model: $MODEL_INVESTIGATE)"
echo "  @orchestrate  — coordinate multi-step tasks (model: $MODEL_ORCHESTRATE)"

if [[ $ERRORS -gt 0 ]]; then
    echo -e "\n${RED}$ERRORS validation error(s) found. Check output above.${NC}"
    exit 1
fi
