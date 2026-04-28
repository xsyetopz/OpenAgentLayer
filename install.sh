#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=0
ALL=0
PLATFORMS=()

usage() {
	cat <<'HELP'
OpenAgentLayer installer

Usage: ./install.sh [--codex] [--claude] [--opencode] [--all] [--dry-run]

Options:
  --codex       Install Codex support
  --claude      Install Claude Code support
  --opencode    Install OpenCode support
  --all         Install all primary systems
  --dry-run     Print exact install actions without writing files
  -h, --help    Show help
HELP
}

add_platform() {
	local platform="$1"
	for existing in "${PLATFORMS[@]}"; do
		[[ "$existing" == "$platform" ]] && return 0
	done
	PLATFORMS+=("$platform")
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--codex) add_platform codex ;;
		--claude) add_platform claude ;;
		--opencode) add_platform opencode ;;
		--all) ALL=1 ;;
		--dry-run) DRY_RUN=1 ;;
		-h|--help) usage; exit 0 ;;
		*) echo "unknown option: $1" >&2; usage >&2; exit 2 ;;
	esac
	shift
done

if [[ "$ALL" -eq 1 || "${#PLATFORMS[@]}" -eq 0 ]]; then
	PLATFORMS=(codex claude opencode)
fi

cd "$ROOT"

run_oal() {
	cargo run -p oal-cli -- "$@"
}

platform_home_default() {
	case "$1" in
		codex) printf '%s/.codex' "$HOME" ;;
		claude) printf '%s/.claude' "$HOME" ;;
		opencode) printf '%s/.config/opencode' "$HOME" ;;
		*) echo "unknown platform: $1" >&2; return 2 ;;
	esac
}

ensure_platform_env() {
	case "$1" in
		codex) export CODEX_HOME="${CODEX_HOME:-$(platform_home_default codex)}" ;;
		claude) export CLAUDE_HOME="${CLAUDE_HOME:-$(platform_home_default claude)}" ;;
		opencode) export OPENCODE_CONFIG_DIR="${OPENCODE_CONFIG_DIR:-$(platform_home_default opencode)}" ;;
		*) echo "unknown platform: $1" >&2; return 2 ;;
	esac
}

install_paths() {
	local platform="$1"
	python3 - "$ROOT/source/platforms/$platform.toml" <<'PY'
import os
import sys
import tomllib
from pathlib import Path

source = Path(sys.argv[1])
with source.open("rb") as handle:
    data = tomllib.load(handle)

for raw in data["adapter_plan"]["install_paths"]:
    print(os.path.expandvars(raw))
PY
}

path_kind() {
	local path="$1"
	local base="${path##*/}"
	case "$base" in
		AGENTS.md|CLAUDE.md|config.toml|settings.json|*.json|*.toml|*.md) printf 'file' ;;
		*) printf 'dir' ;;
	esac
}

write_file() {
	local platform="$1"
	local path="$2"
	mkdir -p "$(dirname "$path")"
	cat > "$path" <<EOF
# managed by OpenAgentLayer
platform = $platform
source = source/platforms/$platform.toml
EOF
}

install_path() {
	local platform="$1"
	local path="$2"
	local kind
	kind="$(path_kind "$path")"
	if [[ "$DRY_RUN" -eq 1 ]]; then
		printf 'would %s %s %s\n' "$kind" "$platform" "$path"
		return 0
	fi
	if [[ "$kind" == file ]]; then
		write_file "$platform" "$path"
	else
		mkdir -p "$path"
	fi
	printf 'installed %s %s -> %s\n' "$kind" "$platform" "$path"
}

run_oal check source >/dev/null
for platform in "${PLATFORMS[@]}"; do
	run_oal check "$platform" >/dev/null
	run_oal check hooks "$platform" >/dev/null
done

for platform in "${PLATFORMS[@]}"; do
	ensure_platform_env "$platform"
	while IFS= read -r path; do
		[[ -n "$path" ]] || continue
		install_path "$platform" "$path"
	done < <(install_paths "$platform")
done

if [[ "$DRY_RUN" -eq 1 ]]; then
	printf 'OpenAgentLayer dry-run ok:'
	printf ' %s' "${PLATFORMS[@]}"
	printf '\n'
fi
