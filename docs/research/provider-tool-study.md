# Provider and tool study

## Provider policy

Providers are upstream-first. OAL overlays upstream content; it does not recreate upstream packages by hand.

Provider sync is git-based. `providers/<name>/upstream` is a git checkout controlled by OAL sync commands. `providers/<name>/overlay` is OAL-owned and never modified by upstream pulls.

| Provider         | Required | Sync mode       | Default         | macOS install                  | Probe                                                | Git upstream                                       |
| ---------------- | -------- | --------------- | --------------- | ------------------------------ | ---------------------------------------------------- | -------------------------------------------------- |
| `caveman`        | true     | git-exact       | sync-only       | n/a                            | n/a                                                  | `https://github.com/juliusbrussee/caveman.git`     |
| `rtk`            | true     | external-binary | external-binary | `brew install rtk-ai/tap/rtk`  | `rtk --version`; `rtk gain`; `rtk rewrite <command>` | `https://github.com/rtk-ai/rtk.git`                |
| `bmad-method`    | true     | git-extract     | sync-extract    | n/a                            | n/a                                                  | `https://github.com/bmad-code-org/BMAD-METHOD.git` |
| `taste-skill`    | true     | git-exact       | sync-only       | n/a                            | n/a                                                  | `https://github.com/leonxlnx/taste-skill.git`      |
| `context7`       | false    | optional-cli    | cli-only        | `bunx --bun @upstash/context7` | `context7 --version`; `ctx7 --version`               | `https://github.com/upstash/context7.git`          |
| `playwright-cli` | false    | optional-cli    | cli-only        | `bunx playwright-cli`          | `playwright-cli --help`                              | `https://github.com/microsoft/playwright-cli.git`  |
| `deepwiki`       | false    | optional-cli    | cli-only        | `bunx deepwiki`                | `deepwiki --help`                                    | `https://www.deepwiki.sh/`                         |

## Provider sync modes

### git-exact

OAL clones or fetches upstream into `providers/<name>/upstream`, checks out configured branch/ref, records current commit SHA, and reads content directly from that checkout. Local additions stay in overlay.

### git-extract

OAL clones or fetches upstream into `providers/<name>/upstream`, checks out configured branch/ref, records current commit SHA, and extracts selected files into structured generated/source records. Extracted records include repo URL, branch/ref, commit SHA, upstream path, license note, and transform description.

### external-binary

OAL tracks upstream git provenance, but runtime uses installed binary. RTK uses this mode: git checkout is source/provenance, `rtk` binary remains external.

### optional-cli

OAL probes CLI availability and documents install command. Git checkout is optional and only used when provider docs/source provenance is requested.

## Git sync behavior

`oal provider sync <provider>`:

1. clones `repo_url` into `providers/<name>/upstream` when missing
2. rejects dirty upstream checkouts
3. fetches configured remote
4. checks out configured branch or locked ref
5. records current commit SHA
6. runs extraction when provider mode is `git-extract`
7. leaves `providers/<name>/overlay` untouched

`oal provider sync --all` runs required providers in deterministic order:

1. `caveman`
2. `rtk`
3. `bmad-method`
4. `taste-skill`

Optional providers sync only when explicitly enabled.

## Required tools

Canonical source ids live in `source/tools/tools.json`. Human-facing names such as `ripgrep` and `playwright-cli` must appear there as aliases when they differ from the source id.

| Tool       | Purpose                      | Required | Probe                                | Policy                         |
| ---------- | ---------------------------- | -------- | ------------------------------------ | ------------------------------ |
| `bun`      | runtime and package runner   | true     | `bun --version`                      | primary runtime                |
| `rtk`      | shell rewrite and compaction | true     | `rtk --version`; `rtk gain`          | prefer where capability exists |
| `ripgrep`  | text search                  | true     | `rg --version`                       | targeted repo search           |
| `fd`       | file discovery               | true     | `fd --version`; `fdfind --version`   | targeted file discovery        |
| `ast-grep` | AST search/rewrite           | true     | `sg --version`; `ast-grep --version` | syntax-aware audits            |
| `jq`       | JSON processing              | true     | `jq --version`                       | shell JSON inspection          |

## Optional tools

| Tool             | Purpose                       | Probe                                           | Policy                                           |
| ---------------- | ----------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `homebrew`       | macOS package manager         | `brew --version`                                | macOS only; install if missing                   |
| `rust`           | upstream Rust provider builds | `rustup --version`; `cargo --version`           | install only when upstream build path needs it   |
| `node`           | Node CLI fallback             | `node --version`                                | prefer Bun; use Node when upstream requires Node |
| `repomix`        | repo context packing          | `repomix --version`                             | use via `bunx` when snapshot needed              |
| `gh`             | GitHub CLI                    | `gh --version`                                  | use for GitHub workflows                         |
| `just`           | task runner                   | `just --version`                                | use when repo has justfile                       |
| `mise`           | tool version manager          | `mise --version`                                | use when repo declares mise config               |
| `uv`             | Python runner                 | `uv --version`                                  | use for uv projects                              |
| `ruff`           | Python lint/format            | `ruff --version`                                | use when project selects Ruff                    |
| `hyperfine`      | benchmark runner              | `hyperfine --version`                           | use for measured performance changes             |
| `act`            | local GitHub Actions          | `act --version`                                 | use when requested                               |
| `eza`            | directory inspection          | `eza --version`                                 | optional readable inspection                     |
| `bat`            | file viewing                  | `bat --version`; `batcat --version`             | optional readable viewing                        |
| `gum`            | interactive shell UI          | `gum --version`                                 | explicit interactive flows only                  |
| `context7`       | docs CLI                      | `context7 --version`; `ctx7 --version`          | optional third-party docs CLI                    |
| `playwright-cli` | browser automation CLI        | `playwright-cli --help`; `playwright --version` | optional CLI path, not MCP                       |
| `deepwiki`       | repository docs lookup        | `deepwiki --help`                               | optional CLI path                                |

## Host install policy

macOS:

1. probe `brew --version`
2. install Homebrew only when missing
3. install required packages through Homebrew where package exists
4. use upstream install scripts only when Homebrew path is unavailable or upstream requires it

Linux:

1. detect distro/package manager
2. support apt, dnf, pacman, apk, zypper
3. install distro package when available
4. use upstream install script only when package path is unavailable

OAL must never hard-code one Linux package manager.

## Context7 CLI integration

Context7 is optional CLI, not MCP.

Use cases:

- third-party library/API docs lookup during research
- platform adapter docs checks
- provider upstream checks

OAL behavior:

- probe `context7 --version`
- probe `ctx7 --version`
- install via upstream CLI package path when requested
- expose through `oal doctor tools`
- never require Context7 for base OAL install

## RTK integration

RTK is required external binary.

OAL uses RTK in three places:

1. shell command rewrite
2. command output compaction
3. shell safety classification

RTK probes:

- `rtk --version`
- `rtk gain`
- `rtk rewrite <command>`

OAL rules:

- use visible RTK command shape when RTK is active
- avoid bundled RTK copies
- use upstream install path
- call plain `rtk init` only when initialization is needed
- do not guess tool-specific RTK init variants
