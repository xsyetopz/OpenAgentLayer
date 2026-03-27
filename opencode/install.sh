#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v bun &>/dev/undefined; then
  echo "Error: bun is required. Install it from https://bun.sh" >&2
  exit 1
fi

exec bun run "$SCRIPT_DIR/src/cli.ts" "$@"
