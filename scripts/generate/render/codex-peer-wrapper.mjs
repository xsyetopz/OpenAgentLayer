export function renderCodexPeerWrapper(commandName) {
	return `#!/bin/bash
set -euo pipefail

usage() {
    local exit_code="\${1:-1}"
    cat <<'EOF' >&2
Usage: ${commandName} <batch|tmux> [--dry-run] [task...]

Modes:
  batch       Run orchestrator, validate, worker, and review as top-level Codex exec jobs
  tmux        Create a tmux session with orchestrator, validate, worker, and review panes

Options:
  --dry-run   Print the generated peer-run plan without launching it
EOF
    exit "$exit_code"
}

[[ $# -ge 1 ]] || usage

if [[ "$1" == "--help" || "$1" == "help" ]]; then
    usage 0
fi

MODE="$1"
shift

case "$MODE" in
    batch|tmux) ;;
    *)
        usage
        ;;
esac

if [[ $# -gt 0 && "$1" == "--help" ]]; then
    usage 0
fi

ARGS=()
if [[ $# -gt 0 && "$1" == "--dry-run" ]]; then
    ARGS+=("$1")
    shift
fi

if [[ $# -gt 0 ]]; then
    TASK="$*"
elif [[ ! -t 0 ]]; then
    TASK="$(cat)"
else
    usage
fi

if [[ \${#ARGS[@]} -gt 0 ]]; then
    exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/peer-run.mjs" "$MODE" "\${ARGS[@]}" "$TASK"
fi

exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/peer-run.mjs" "$MODE" "$TASK"
`;
}
