#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="${1:-$(dirname "$SCRIPT_DIR")/agents}"

if [[ ! -d "$AGENTS_DIR" ]]; then
    echo -e "${RED}Error: Agents directory not found: $AGENTS_DIR${NC}"
    exit 1
fi

echo "Validating agents in: $AGENTS_DIR"
echo

total=0; passed=0; failed=0; warnings=0

validate_agent() {
    local file="$1"
    local name="${file##*/}"
    name="${name%.md}"

    local errors=()
    local warns=()

    [[ -r "$file" ]] || { errors+=("File not readable"); }
    local content frontmatter model
    content=$(<"$file")

    if [[ ! "$content" =~ ^--- ]]; then
        errors+=("Missing YAML frontmatter (should start with ---)")
    else
        frontmatter="$(sed -n '/^---$/,/^---$/p' "$file" | sed '1d;$d')"
        [[ "$frontmatter" =~ model: ]] || errors+=("Missing 'model' field in frontmatter")
        if [[ "$frontmatter" =~ model: ]]; then
            model=$(awk -F: '/^model:/ {gsub(/ /,"",$2); print $2; exit}' <<< "$frontmatter")
            [[ "$model" =~ ^(sonnet|opus|haiku)$ ]] || errors+=("Invalid model '$model' (must be sonnet, opus, or haiku)")
        fi
        [[ "$frontmatter" =~ description: ]] || errors+=("Missing 'description' field in frontmatter")
        { [[ "$frontmatter" =~ tools: ]] || [[ "$frontmatter" =~ allowedTools: ]]; } || warns+=("No tools specified (tools: or allowedTools:)")
    fi

    [[ "$content" =~ "## When" || "$content" =~ "### When" ]] || warns+=("Consider adding 'When to Use' section")
    [[ "$content" =~ "## Token" || "$content" =~ "### Token" ]] || warns+=("Consider adding 'Token Efficiency' section")
    [[ "$content" =~ "## Do NOT" || "$content" =~ "### Do NOT" ]] || warns+=("Consider adding 'Do NOT' section")

    local size; size=$(wc -c < "$file")
    (( size < 500 )) && warns+=("Agent definition seems short ($size bytes)")

    printf "  %s: " "$name"
    if (( ${#errors[@]} )); then
        echo -e "${RED}FAILED${NC}"
        for err in "${errors[@]}"; do echo -e "    ${RED}✗${NC} $err"; done
        ((failed++))
    else
        echo -e "${GREEN}PASSED${NC}"
        ((passed++))
    fi
    for warn in "${warns[@]}"; do
        echo -e "    ${YELLOW}⚠${NC} $warn"
        ((warnings++))
    done
    ((total++))
}

echo "Validating agent definitions..."
echo

shopt -s nullglob
for agent_file in "$AGENTS_DIR"/*.md; do
    [[ -f "$agent_file" ]] && validate_agent "$agent_file"
done
shopt -u nullglob

echo
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "Total agents:  $total"
echo -e "Passed:        ${GREEN}$passed${NC}"
echo -e "Failed:        ${RED}$failed${NC}"
echo -e "Warnings:      ${YELLOW}$warnings${NC}"
echo

if (( failed > 0 )); then
    echo -e "${RED}Validation failed. Please fix the errors above.${NC}"
    exit 1
elif (( warnings > 0 )); then
    echo -e "${YELLOW}Validation passed with warnings.${NC}"
    exit 0
else
    echo -e "${GREEN}All validations passed!${NC}"
    exit 0
fi
