#!/bin/bash

if [[ -z "${BASH_VERSION:-}" ]]; then
	exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_PATH="$SCRIPT_DIR/scripts/build-plugin-cli.mjs"

if ! command -v node >/dev/null 2>&1; then
	echo "Error: node not found. openagentsbtw build-plugin requires Node.js >= 24.14.1." >&2
	exit 1
fi

exec node "$CLI_PATH" "$@"
