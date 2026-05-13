#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

default_optional="${OAL_OPTIONAL_TOOLS:-ctx7,skill-frontend-design,skill-react-best-practices}"

if ! command -v bun >/dev/null 2>&1; then
  echo "error: Bun is required before running OAL install." >&2
  echo "Install Bun, then rerun ./install.sh." >&2
  exit 1
fi

if [[ -d .git ]]; then
  git submodule update --init --recursive
fi

bun install --frozen-lockfile
printf 'installed-by=openagentlayer\n' > .openagentlayer-install

if [[ $# -eq 0 ]]; then
  set -- setup --scope global --provider all --toolchain --optional "$default_optional"
fi

bun packages/cli/src/main.ts "$@"
