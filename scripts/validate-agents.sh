#!/bin/bash
# validate-agents.sh - Validate agent definitions
#
# Usage:
#   ./validate-agents.sh [/path/to/agents/dir]
#
# Validates:
#   - YAML frontmatter is present and valid
#   - Required fields are defined
#   - Model is valid (sonnet, opus, haiku)
#   - Tools are specified

# Don't use set -e as pattern matching can return non-zero

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get agents directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="${1:-$(dirname "$SCRIPT_DIR")/agents}"

if [[ ! -d "$AGENTS_DIR" ]]; then
    echo -e "${RED}Error: Agents directory not found: $AGENTS_DIR${NC}"
    exit 1
fi

echo "Validating agents in: $AGENTS_DIR"
echo ""

# Track results
total=0
passed=0
failed=0
warnings=0

# Validate a single agent file
validate_agent() {
    local file="$1"
    local name=$(basename "$file" .md)
    local errors=()
    local warns=()

    # Check file exists and is readable
    if [[ ! -r "$file" ]]; then
        errors+=("File not readable")
        return 1
    fi

    # Read file content
    local content=$(cat "$file")

    # Check for YAML frontmatter
    if [[ ! "$content" =~ ^--- ]]; then
        errors+=("Missing YAML frontmatter (should start with ---)")
    else
        # Extract frontmatter
        local frontmatter=$(echo "$content" | sed -n '/^---$/,/^---$/p' | sed '1d;$d')

        # Check required fields
        if [[ ! "$frontmatter" =~ model: ]]; then
            errors+=("Missing 'model' field in frontmatter")
        else
            # Validate model value
            local model=$(echo "$frontmatter" | grep "^model:" | sed 's/model:[[:space:]]*//')
            if [[ ! "$model" =~ ^(sonnet|opus|haiku)$ ]]; then
                errors+=("Invalid model '$model' (must be sonnet, opus, or haiku)")
            fi
        fi

        if [[ ! "$frontmatter" =~ description: ]]; then
            errors+=("Missing 'description' field in frontmatter")
        fi

        if [[ ! "$frontmatter" =~ tools: ]] && [[ ! "$frontmatter" =~ allowedTools: ]]; then
            warns+=("No tools specified (tools: or allowedTools:)")
        fi
    fi

    # Check for main sections
    if [[ ! "$content" =~ "## When" ]] && [[ ! "$content" =~ "### When" ]]; then
        warns+=("Consider adding 'When to Use' section")
    fi

    if [[ ! "$content" =~ "## Token" ]] && [[ ! "$content" =~ "### Token" ]]; then
        warns+=("Consider adding 'Token Efficiency' section")
    fi

    if [[ ! "$content" =~ "## Do NOT" ]] && [[ ! "$content" =~ "### Do NOT" ]]; then
        warns+=("Consider adding 'Do NOT' section")
    fi

    # Check file size
    local size=$(wc -c < "$file")
    if [[ $size -lt 500 ]]; then
        warns+=("Agent definition seems short ($size bytes)")
    fi

    # Report results
    echo -n "  $name: "

    if [[ ${#errors[@]} -gt 0 ]]; then
        echo -e "${RED}FAILED${NC}"
        for err in "${errors[@]}"; do
            echo -e "    ${RED}✗${NC} $err"
        done
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

# Process all .md files in agents directory
echo "Validating agent definitions..."
echo ""

for agent_file in "$AGENTS_DIR"/*.md; do
    if [[ -f "$agent_file" ]]; then
        validate_agent "$agent_file"
    fi
done

# Summary
echo ""
echo "=========================================="
echo "Validation Summary"
echo "=========================================="
echo -e "Total agents:  $total"
echo -e "Passed:        ${GREEN}$passed${NC}"
echo -e "Failed:        ${RED}$failed${NC}"
echo -e "Warnings:      ${YELLOW}$warnings${NC}"
echo ""

if [[ $failed -gt 0 ]]; then
    echo -e "${RED}Validation failed. Please fix the errors above.${NC}"
    exit 1
elif [[ $warnings -gt 0 ]]; then
    echo -e "${YELLOW}Validation passed with warnings.${NC}"
    exit 0
else
    echo -e "${GREEN}All validations passed!${NC}"
    exit 0
fi
