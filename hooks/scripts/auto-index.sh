#!/bin/bash

set -e

MEMORY_DIR="${CLAUDE_PROJECT_ROOT:-.}/.claude/memory"
INDEX_FILE="$MEMORY_DIR/project-index.md"
DIRTY_MARKER="$MEMORY_DIR/.index-dirty"
LOCKS_FILE="$MEMORY_DIR/locks.md"
MAX_INDEX_AGE=86400

now() {
    date +%s
}

file_mtime() {
    if [[ -f "$1" ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            stat -f %m "$1"
        else
            stat -c %Y "$1"
        fi
    else
        echo "0"
    fi
}

check_index() {
    if [[ ! -f "$INDEX_FILE" ]]; then
        echo "NOTICE: No project index found at $INDEX_FILE"
        echo "Consider running: @indexer Index this project"
        exit 0
    fi
    local index_age=$(( $(now) - $(file_mtime "$INDEX_FILE") ))
    if [[ $index_age -gt $MAX_INDEX_AGE ]]; then
        echo "NOTICE: Project index is $(( index_age / 3600 )) hours old"
        echo "Consider running: @indexer Refresh the project index"
    fi
    if [[ -f "$DIRTY_MARKER" ]]; then
        local dirty_time=$(file_mtime "$DIRTY_MARKER")
        local index_time=$(file_mtime "$INDEX_FILE")
        if [[ $dirty_time -gt $index_time ]]; then
            echo "NOTICE: Files have been modified since last index"
            echo "Consider running: @indexer Incremental index update"
        fi
    fi
}

mark_dirty() {
    mkdir -p "$MEMORY_DIR"
    touch "$DIRTY_MARKER"
}

cleanup_locks() {
    if [[ ! -f "$LOCKS_FILE" ]]; then
        exit 0
    fi
    local current_time=$(now)
    local lock_timeout=3600
    local temp_file=$(mktemp)
    local header_done=false
    while IFS= read -r line; do
        if [[ "$line" =~ ^\|.*File.*\| ]] || [[ "$line" =~ ^\|[-]+\| ]]; then
            echo "$line" >> "$temp_file"
            header_done=true
            continue
        fi
        if [[ -z "$line" && "$header_done" == false ]]; then
            echo "$line" >> "$temp_file"
            continue
        fi
        if [[ "$line" =~ ^\|[[:space:]]*[^|]+\|[[:space:]]*[^|]+\|[[:space:]]*([0-9T:-]+Z?)\| ]]; then
            local lock_time="${BASH_REMATCH[1]}"
            if command -v gdate &> /dev/null; then
                local lock_epoch=$(gdate -d "$lock_time" +%s 2>/dev/null || echo "0")
            else
                local lock_epoch=$(date -d "$lock_time" +%s 2>/dev/null || echo "0")
            fi
            local age=$(( current_time - lock_epoch ))
            if [[ $age -lt $lock_timeout ]]; then
                echo "$line" >> "$temp_file"
            else
                echo "Removed stale lock: $line"
            fi
        else
            echo "$line" >> "$temp_file"
        fi
    done < "$LOCKS_FILE"
    mv "$temp_file" "$LOCKS_FILE"
}

case "${1:-check}" in
    check)
        check_index
        ;;
    mark-dirty)
        mark_dirty
        ;;
    cleanup-locks)
        cleanup_locks
        ;;
    *)
        echo "Usage: $0 {check|mark-dirty|cleanup-locks}"
        exit 1
        ;;
esac
