function q(value) {
	return JSON.stringify(value);
}

export function renderCodexWrapper(commandName, modes) {
	const cases = modes
		.map((mode) => {
			if (mode.nativeResume === true) {
				return `    ${mode.mode})
        PROFILE=${q(mode.profile)}
        exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/run-codex-filtered.mjs" resume --profile "$PROFILE" "$@"
        ;;`;
			}
			const configOverrides = (mode.configOverrides ?? [])
				.map((entry) => `        CODEX_CONFIG_ARGS+=(-c ${q(entry)})`)
				.join("\n");
			const contractLines = [
				`OPENAGENTSBTW_ROUTE=${mode.mode}`,
				`OPENAGENTSBTW_CONTRACT=${mode.routeKind ?? "readonly"}`,
				`OPENAGENTSBTW_ALLOW_BLOCKED=${mode.allowBlocked !== false ? "true" : "false"}`,
				`OPENAGENTSBTW_ALLOW_DOCS_ONLY=${mode.allowDocsOnly !== false ? "true" : "false"}`,
				`OPENAGENTSBTW_ALLOW_TESTS_ONLY=${mode.allowTestsOnly !== false ? "true" : "false"}`,
				`OPENAGENTSBTW_REJECT_PROTOTYPE_SCAFFOLDING=${mode.rejectPrototypeScaffolding === true ? "true" : "false"}`,
			]
				.map((line) => `        CONTRACT_LINES+=(${q(line)})`)
				.join("\n");
			return `    ${mode.mode})
        PROFILE=${q(mode.profile)}
        SYSTEM_PROMPT=${q(mode.prompt)}
${contractLines}
${configOverrides ? `${configOverrides}\n` : ""}        ;;`;
		})
		.join("\n");
	const utilityModes = [
		"  memory      Inspect or manage openagentsbtw Codex memory",
		"  queue       Inspect or manage deferred openagentsbtw prompts",
	].join("\n");
	const modeLines = [
		...modes.map(
			(mode) => `  ${mode.mode.padEnd(11)} Generated openagentsbtw Codex route`,
		),
		utilityModes,
	].join("\n");

	return `#!/bin/bash
set -euo pipefail

usage() {
    cat <<'EOF' >&2
Usage: ${commandName} <mode> [prompt...]
       ${commandName} <mode> [--source deepwiki] [--approval auto] [--speed fast] [--runtime long] [prompt...]

Modes:
${modeLines}

Memory commands:
  ${commandName} memory show [path]
  ${commandName} memory forget-project [path]
  ${commandName} memory prune

Queue commands:
  ${commandName} queue list
  ${commandName} queue add <message>
  ${commandName} queue next
  ${commandName} queue clear
  ${commandName} queue retry <id>
EOF
    exit 1
}

[[ $# -ge 1 ]] || usage

MODE="$1"
shift

if [[ "$MODE" == "memory" ]]; then
    [[ $# -ge 1 ]] || usage
    exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/memory-manage.mjs" "$@"
fi

if [[ "$MODE" == "queue" ]]; then
    [[ $# -ge 1 ]] || usage
    exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/queue-manage.mjs" "$@"
fi

if [[ "$MODE" == "resume" ]]; then
    case "$MODE" in
${cases}
        *)
            usage
            ;;
    esac
fi

PROFILE="openagentsbtw"
SYSTEM_PROMPT=""
CODEX_CONFIG_ARGS=()
CONTRACT_LINES=()
SOURCE_MODE=""
APPROVAL_MODE=""
SPEED_MODE=""
RUNTIME_MODE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source)
            SOURCE_MODE="\${2:-}"
            shift 2
            ;;
        --approval)
            APPROVAL_MODE="\${2:-}"
            shift 2
            ;;
        --speed)
            SPEED_MODE="\${2:-}"
            shift 2
            ;;
        --runtime)
            RUNTIME_MODE="\${2:-}"
            shift 2
            ;;
        --)
            shift
            break
            ;;
        --*)
            usage
            ;;
        *)
            break
            ;;
    esac
done

if [[ $# -gt 0 ]]; then
    PROMPT="$*"
elif [[ ! -t 0 ]]; then
    PROMPT="$(cat)"
else
    usage
fi

case "$MODE" in
${cases}
    *)
        usage
        ;;
esac

if [[ "$APPROVAL_MODE" == "auto" ]]; then
    PROFILE="openagentsbtw-approval-auto"
fi

if [[ "$SPEED_MODE" == "fast" ]]; then
    CODEX_CONFIG_ARGS+=(-c "features.fast_mode = true")
    CODEX_CONFIG_ARGS+=(-c 'service_tier = "fast"')
fi

if [[ "$RUNTIME_MODE" == "long" ]]; then
    PROFILE="openagentsbtw-runtime-long"
fi

if [[ "$SOURCE_MODE" == "deepwiki" ]]; then
    if ! grep -Eq '^[[:space:]]*\\[mcp_servers\\.deepwiki\\]' "$HOME/.codex/config.toml" 2>/dev/null; then
        echo "DeepWiki is not configured. Reinstall with --deepwiki-mcp or drop --source deepwiki." >&2
        exit 1
    fi
    if [[ ! -d .git ]] || ! git remote get-url origin 2>/dev/null | grep -Eq '^https://github\\.com/|^git@github\\.com:'; then
        echo "DeepWiki source expects a GitHub repository." >&2
        exit 1
    fi
    SYSTEM_PROMPT="$SYSTEM_PROMPT

Use DeepWiki MCP tools first for public GitHub repository understanding, then verify exact local file or line claims with repo reads before stating them."
fi

PROMPT_HEADER=""
if [[ \${#CONTRACT_LINES[@]} -gt 0 ]]; then
    PROMPT_HEADER="$(printf '%s\n' "\${CONTRACT_LINES[@]}")"
fi

FULL_PROMPT="$SYSTEM_PROMPT"
if [[ -n "$PROMPT_HEADER" ]]; then
    FULL_PROMPT="$FULL_PROMPT

$PROMPT_HEADER"
fi
FULL_PROMPT="$FULL_PROMPT

Task:
$PROMPT"

if [[ \${#CODEX_CONFIG_ARGS[@]} -gt 0 ]]; then
    exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/run-codex-filtered.mjs" exec --profile "$PROFILE" "\${CODEX_CONFIG_ARGS[@]}" "$FULL_PROMPT"
fi

exec node "$HOME/.codex/openagentsbtw/hooks/scripts/session/run-codex-filtered.mjs" exec --profile "$PROFILE" "$FULL_PROMPT"
`;
}
