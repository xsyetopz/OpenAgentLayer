#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$repo_root"

default_officialskills="skill-openai-gh-fix-ci,skill-openai-gh-address-comments,skill-openai-yeet,skill-openai-playwright,skill-trailofbits-audit-context-building,skill-trailofbits-differential-review,skill-trailofbits-static-analysis,skill-trailofbits-testing-handbook-skills,skill-getsentry-sentry-workflow,skill-anthropics-mcp-builder"
default_optional="${OAL_OPTIONAL_TOOLS:-ctx7,${default_officialskills}}"

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
