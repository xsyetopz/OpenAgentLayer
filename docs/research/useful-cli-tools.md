# Useful CLI tools for AI agents

## Purpose

AI agents waste tokens when they pull whole files, full logs, full diffs, or broad search results into context before they know what matters. A local CLI toolbox prevents that by turning large repo state into small, targeted evidence packets.

Use this page as a research guide for OAL tool records, install planning, and agent runbooks. It is not a normative spec. The source of truth for required tools remains `specs/providers-tools-models.md` and `source/tools/tools.json`.

## Rationale

CLI tools are useful for agents because they can:

- narrow unknowns before reading files
- return file names before content
- return structured fields before full JSON/YAML
- show short failing output before verbose logs
- prove behavior with commands instead of guesswork
- keep source paths visible for citations and explain maps

The agent pattern is:

1. map with stats, names, and shallow trees
2. search with exact identifiers and path limits
3. read small line ranges
4. run targeted validation
5. expand only when the result proves that more context is needed

This keeps prompt context for reasoning, not raw terminal noise.

## OAL policy fit

OAL should prefer tools that can produce compact, deterministic, source-cited output.

- Use RTK first when it has a wrapper for the command. Rationale: RTK compresses command output before it reaches the agent.
- Use native CLI commands when RTK has no wrapper. Rationale: direct tools still beat dumping files into context.
- Prefer JSON selectors and line ranges. Rationale: agents need exact fields and evidence, not whole config files.
- Probe optional tools before relying on them. Rationale: OAL installs required tools, but optional tools must skip cleanly.
- Keep generated output out of source input. Rationale: render loops become unstable when agents read generated artifacts as authority.

## Install sets

### Required baseline

These tools are source-backed as required in `source/tools/tools.json`:

```bash
brew install oven-sh/bun/bun
brew install rtk-ai/tap/rtk
brew install ripgrep fd ast-grep jq
```

Canonical ids are `bun`, `rtk`, `rg`, `fd`, `ast-grep`, and `jq`. Aliases such as `ripgrep`, `fdfind`, and `sg` are documented in source, not treated as separate tools.

### High-value optional set

These tools are useful for agents, but are not required for OAL startup:

```bash
brew install bat tree yq gh git-delta just shellcheck shfmt hyperfine watchexec mise uv
```

### Specialized set

```bash
brew install semgrep duckdb sqlite-utils httpie tokei act direnv
```

For Node projects:

```bash
bun i -g bun-check-updates knip depcheck typescript tsx
```

For Python projects:

```bash
uv tool install ruff
uv tool install mypy
uv tool install pytest
```

## Agent-centric command patterns

### Repo mapping without context bloat

Start with:

```bash
git diff --stat
git status --short
fd . src tests specs docs -d 3
tree -L 2 -I 'node_modules|.git|dist|coverage|generated'
```

Expand only after choosing a target:

```bash
rg "specificIdentifier" -n src tests
bat --line-range 40:120 src/file.ts
```

Rationale: file names and stats are enough to choose the next read. Full trees and full files usually enter context before they are relevant.

### Symbol tracing

Use:

```bash
rg "functionName|className|typeName" -n src tests
rg "functionName" -n -C 2 src tests
ast-grep --pattern 'function $NAME($$$) { $$$ }' src
```

Avoid:

```bash
cat src/large-module.ts
rg "commonWord" .
```

Rationale: exact identifiers and small context windows preserve call-site evidence without importing unrelated code.

### Config and dependency inspection

Use selectors:

```bash
jq '.scripts' package.json
jq '{dependencies, devDependencies}' package.json
yq '.jobs.test.steps[].run' .github/workflows/ci.yml
```

Use summaries for lockfiles:

```bash
jq '.packages | keys | length' package-lock.json
```

Rationale: agents normally need one config branch or dependency count, not the entire file.

### Test and debug loop

Start targeted:

```bash
bun test tests/oal.test.ts
uv run pytest tests/test_auth.py -q --tb=short
bunx tsc --noEmit --pretty false
```

End broad:

```bash
just check
bun run check
uv run pytest
```

Rationale: targeted checks shorten the edit loop. Broad validation belongs at acceptance gates.

### PR and issue inspection

Start with metadata:

```bash
gh pr view 123 --json title,body,files
gh pr diff 123 --name-only
gh issue view 456 --json title,body,labels
```

Expand only when needed:

```bash
gh pr diff 123 -- src/file.ts
gh issue view 456 --comments
```

Rationale: most review planning needs file lists and summary first. Full comments and full diffs are expensive and often irrelevant.

### Logs, services, and data

Limit output:

```bash
docker compose logs --tail=100 api
docker compose ps
duckdb -c "select count(*), status from read_csv_auto('events.csv') group by status"
sqlite-utils rows app.db users --limit 10
```

Rationale: logs and datasets grow without semantic boundaries. Limits and aggregation turn them into evidence.

### Pool related reads into one tool call

Agents also spend tokens on tool-call overhead. If several cheap, read-only checks answer one question, pool them into one labeled command.

Repo snapshot:

```bash
printf "\n--- diff ---\n"; git diff --stat
printf "\n--- status ---\n"; git status --short
printf "\n--- files ---\n"; fd . src tests specs docs -d 3
```

Targeted evidence packet:

```bash
printf "\n--- status ---\n"; git status --short
printf "\n--- matches ---\n"; rg "specificIdentifier" -n src tests
printf "\n--- scripts ---\n"; jq '.scripts' package.json
```

RTK-shaped variant:

```bash
rtk --ultra-compact run 'printf "\n--- status ---\n"; git status --short; printf "\n--- files ---\n"; fd . src tests -d 3'
```

Rationale: one labeled output packet is cheaper than many tiny tool calls, and labels keep the pooled result parseable.

Guardrails:

- Pool only cheap, read-only evidence commands.
- Keep output bounded with paths, selectors, `--tail`, `--stat`, or line ranges.
- Do not chain destructive commands.
- Do not hide failures with `|| true`.
- Do not mix commands that need different permissions, escalation, or sandbox behavior.
- Keep long-running tests and flaky network commands in separate calls.

## Tool matrix

| Tool             | Best first command                          | Expand command                                | Avoid                               | Rationale                                 |
| ---------------- | ------------------------------------------- | --------------------------------------------- | ----------------------------------- | ----------------------------------------- |
| `rtk`            | `rtk --ultra-compact <command>`             | `rtk read -n file`                            | raw broad command output            | Compresses before context.                |
| `rg`             | `rg "symbol" -n src tests`                  | `rg "symbol" -n -C 2 src tests`               | `rg "the" .`                        | Finds evidence without file dumps.        |
| `fd`             | `fd 'auth\|session' src tests`              | `fd '\\.config\\.(js\|ts\|json)$'`            | recursive `ls` for discovery        | Lists candidate files fast.               |
| `bat`            | `bat --line-range 1:120 file`               | another narrow range                          | full large files                    | Reads only relevant lines.                |
| `tree`           | `tree -L 2 -I 'node_modules\|.git\|dist'`   | `tree src -L 3`                               | `tree .`                            | Shows shape without noise.                |
| `jq`             | `jq '.scripts' package.json`                | `jq '{scripts,dependencies}' package.json`    | full JSON paste                     | Extracts exact fields.                    |
| `yq`             | `yq '.jobs' workflow.yml`                   | `yq '.jobs.test.steps[].run' workflow.yml`    | full workflow dump                  | Extracts exact YAML fields.               |
| `gh`             | `gh pr view --json title,body,files`        | `gh pr diff --name-only`                      | all comments and diffs first        | Keeps GitHub context small.               |
| `git-delta`      | `git diff --stat`                           | `git diff -- path`                            | full repo diff first                | Scales review from summary to detail.     |
| `ast-grep`       | `ast-grep --pattern 'console.log($$$)' src` | language-specific patterns                    | regex over syntax-heavy code        | Finds code structure safely.              |
| `semgrep`        | `semgrep scan --config auto --json`         | pipe to `jq` for path/message fields          | full JSON output                    | Keeps security findings compact.          |
| `shellcheck`     | `shellcheck scripts/deploy.sh`              | `shellcheck scripts/*.sh`                     | manual shell reasoning first        | Finds shell hazards directly.             |
| `shfmt`          | `shfmt -d scripts/*.sh`                     | `shfmt -w scripts/*.sh`                       | write formatting before review      | Shows intended changes first.             |
| `just`           | `just --list`                               | `just check`                                  | pasted command recipes              | Provides stable validation names.         |
| `uv`             | `uv run pytest -q --tb=short`               | `uv run pytest tests/file.py -q`              | verbose full suite during iteration | Keeps Python loops short.                 |
| `ruff`           | `uv run ruff check app tests`               | `uv run ruff check . --output-format=concise` | manual style cleanup first          | Emits fixable style evidence.             |
| `mypy`           | `uv run mypy app/auth.py`                   | `uv run mypy .`                               | full type logs first                | Targets type evidence.                    |
| `pytest`         | `uv run pytest tests/file.py -q --tb=short` | full suite after fix                          | full tracebacks first               | Short failure output is enough initially. |
| `tsc`            | `bunx tsc --noEmit --pretty false`          | package-specific typecheck                    | pretty output in agent logs         | Removes terminal decoration.              |
| `knip`           | `knip --reporter compact`                   | full report                                   | deleting from one tool result only  | Finds dead JS/TS code candidates.         |
| `depcheck`       | `depcheck`                                  | inspect false positives                       | automatic dependency removal        | Dynamic imports can fool it.              |
| `mise`           | `mise list`                                 | `mise exec -- node -v`                        | system runtime assumptions          | Prevents environment drift.               |
| `direnv`         | `direnv status`                             | `direnv allow`                                | secrets in tracked files            | Loads project env safely.                 |
| `watchexec`      | `watchexec -e ts,tsx,json 'bun test'`       | language-specific watch loops                 | one-shot agent watch loops          | Best for human loops.                     |
| `hyperfine`      | `hyperfine --warmup 1 'bun run build'`      | compare two commands                          | subjective timing claims            | Produces repeatable timing evidence.      |
| `duckdb`         | aggregate query                             | limited rows query                            | full dataset dump                   | Summarizes large local data.              |
| `sqlite-utils`   | `sqlite-utils tables app.db`                | `sqlite-utils rows app.db table --limit 10`   | exporting full tables               | Limits database context.                  |
| `httpie`         | `http --headers GET :3000/api/health`       | `http --body GET :3000/api/users?page=1`      | headers and body when one is enough | Splits HTTP evidence.                     |
| `tokei`          | `tokei src tests`                           | full repo sizing                              | using LOC as architecture proof     | Gives size only.                          |
| `docker compose` | `docker compose ps`                         | `docker compose logs --tail=100 api`          | full logs                           | Limits service noise.                     |
| `act`            | `act -j test`                               | full `act pull_request`                       | pushing just to test CI             | Reproduces CI locally.                    |

## Anti-bloat rules

### Use summary before body

```diff
- cat large-file.ts
+ rg "specificSymbol" -n src tests
+ bat --line-range 40:120 src/file.ts
```

Rationale: summaries identify relevance. Bodies consume context.

### Use selectors before full config

```diff
- cat package.json
+ jq '.scripts' package.json
```

Rationale: config files are maps. Agents usually need one branch.

### Use line ranges before whole files

```diff
- bat src/auth/session.ts
+ bat --line-range 80:160 src/auth/session.ts
```

Rationale: line ranges preserve citations and avoid unrelated code.

### Use compact failures before verbose failures

```diff
- uv run pytest
+ uv run pytest tests/test_auth.py -q --tb=short
```

Rationale: first failure often decides the next edit. Verbose suites belong after the fix.

### Use generated manifests instead of generated trees

```diff
- tree generated
+ jq '.files[].path' generated/.oal/render-manifest.json
```

Rationale: manifests are stable evidence. Generated trees can be huge and should not become source authority.

## OAL variants

### Codex agent run

Use RTK-wrapped commands when hooks require RTK:

```bash
rtk --ultra-compact run "git diff --stat"
rtk --ultra-compact rg "OpenAgentLayer" specs plans source
rtk --ultra-compact read -n specs/source-schema.md
```

Rationale: Codex sessions are context-budget sensitive. RTK reduces terminal noise and keeps command shape policy-visible.

### Claude Code agent run

Prefer named commands and short traces:

```bash
just --list
just check
rg "failingSymbol" -n -C 2 src tests
```

Rationale: named commands reduce tool-choice ambiguity across subagents.

### OpenCode agent run

Prefer config and permission inspection before edits:

```bash
jq '.permission' opencode.json
jq '.agent' opencode.json
rg "default_agent|permission|mcp" -n .
```

Rationale: OpenCode behavior depends heavily on config surfaces. Inspect exact keys before changing generated output.

### Review agent run

Start with changed files:

```bash
git diff --stat
git diff --name-only
git diff -- path/to/file
```

Rationale: review should follow change impact, not reread the whole repo.

### Validation agent run

Run the narrowest reproducer, then the acceptance gate:

```bash
bun test tests/oal.test.ts
bun run check
```

Rationale: narrow tests find the break. Acceptance gates prove integration.

## Bad patterns

Avoid:

```bash
cat large-file.ts
cat package-lock.json
tree .
docker compose logs
rg "the" .
bun test -- --verbose
gh pr view 123 --comments
```

Prefer:

```bash
bat --line-range 1:120 large-file.ts
jq '.packages | keys | length' package-lock.json
tree -L 3 -I 'node_modules|.git|dist|coverage|generated'
docker compose logs --tail=100 api
rg "specificIdentifier" src tests
bun test tests/specific.test.ts
gh pr view 123 --json title,body,files
```

## General rule

Start with names, stats, selectors, and small context windows. Expand only when a result points to a relevant file, field, symbol, failure, or generated manifest entry. Every expansion should have a reason.
