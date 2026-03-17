# ClaudeAgents

7 agents, 11 skills, 13 hooks, custom output style + statusline. Targets CC v2.1.76+.

## Agents

| Agent       | File          | pro    | max    | Purpose                                  |
| ----------- | ------------- | ------ | ------ | ---------------------------------------- |
| @athena     | athena.md     | sonnet | opus   | Design, plan, architect                  |
| @hephaestus | hephaestus.md | sonnet | sonnet | Write code, fix bugs, build features     |
| @nemesis    | nemesis.md    | sonnet | opus   | Review code, security audit              |
| @atalanta   | atalanta.md   | haiku  | haiku  | Run tests, parse failures, root causes   |
| @calliope   | calliope.md   | haiku  | haiku  | Write/edit documentation (markdown only) |
| @hermes     | hermes.md     | sonnet | sonnet | Research, explore codebase, cite sources |
| @odysseus   | odysseus.md   | sonnet | opus   | Multi-step delegation, progress tracking |

**Built-in subagents disabled**: `Explore`, `Plan`, and `general-purpose` are denied via `permissions.deny`. Use `@hermes` (explore), `@athena` (plan), `@odysseus` (general-purpose) instead.

## Skills

Plugin install (`claude plugin install cca`) gives the `cca:` prefix. Manual install (`install.sh`) uses the `cca-` prefix.

| Skill            | Plugin                | Manual                | Status |
| ---------------- | --------------------- | --------------------- | ------ |
| `review-code`    | `/cca:review-code`    | `/cca-review-code`    | Active |
| `desloppify`     | `/cca:desloppify`     | `/cca-desloppify`     | Active |
| `ship`           | `/cca:ship`           | `/cca-ship`           | Active |
| `decide`         | `/cca:decide`         | `/cca-decide`         | Active |
| `audit-security` | `/cca:audit-security` | `/cca-audit-security` | Active |
| `test-patterns`  | `/cca:test-patterns`  | `/cca-test-patterns`  | Active |
| `document`       | `/cca:document`       | `/cca-document`       | Active |
| `optimize`       | `/cca:optimize`       | `/cca-optimize`       | Active |
| `handle-errors`  | `/cca:handle-errors`  | `/cca-handle-errors`  | Active |
| `session-export` | `/cca:session-export` | `/cca-session-export` | Active |
| `style-detect`   | `/cca:style-detect`   | `/cca-style-detect`   | Active |

## Hooks

Lifecycle-organized in `hooks/scripts/{pre,post,session}/`.

**User-level** (`~/.claude/hooks/`):

- `pre-secrets.mjs` — guards .env, credentials, force-push

**Project-level** (`hooks.json` → `hooks/scripts/`):

- `pre/validate-input.mjs` — schema validation for tool inputs
- `pre/bash-guard.mjs` — guards dangerous bash commands
- `pre/http-proxy.mjs` — optional HTTP DLP forwarding
- `post/write-quality.mjs` — auto-format + placeholder + slop scan
- `post/bash-redact.mjs` — redacts secrets from output
- `post/failure-circuit.mjs` — retry loop detection
- `post/http-proxy.mjs` — optional HTTP DLP forwarding
- `post/subagent-scan.mjs` — placeholder scan on subagent stop
- `post/stop-scan.mjs` — placeholder scan on session stop
- `session/start-budget.mjs` — line budget warnings
- `session/end-cleanup.mjs` — cleanup + audit summary
- `session/prompt-git-context.mjs` — git context injection
- `session/teammate-idle-resume.mjs` — force idle agent continuation
- `session/notification-audit.mjs` — audit logging
- `session/permission-audit.mjs` — audit trail

## Model Strategy

- **Pro** (`--pro`): `opusplan` orchestrator (opus planning, sonnet execution). All subagents sonnet/haiku.
- **Max** (`--max`): `opusplan` orchestrator. Athena/Nemesis/Odysseus get opus. Rest sonnet/haiku.
- Env vars pin model versions: `ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-4-6`, etc.
- Output style: CCA (positive identity framing, evidence-based, developer-facing).
- Statusline: model, context %, cost, git branch.

## Development

```bash
make lint      # shellcheck + jsonlint
make test      # node --test
make build     # build plugin
make validate  # lint + test + build
```

## File Structure

```text
.claude-plugin/  plugin.json (marketplace manifest)
.github/         workflows/ (ci.yml, release.yml), ISSUE_TEMPLATE/, CONTRIBUTING.md
agents/          7 agent definitions (athena, hephaestus, nemesis, atalanta, calliope, hermes, odysseus)
skills/          11 skill directories (review-code, desloppify, ship, style-detect, etc.)
hooks/           configs/ (base.json, pro.json, max.json)
                 user/ (pre-secrets.mjs, rtk-rewrite.sh)
                 scripts/ (_lib.mjs, pre/, post/, session/)
constraints/     shared.md, pro.md, max.md, zen.md
templates/       CLAUDE.md, settings-global.json
output-styles/   cca.md (custom output style)
statusline/      statusline-command.sh (context/cost/git statusline)
tests/           node:test tests for all hooks
install.sh       Package flags, model substitution, validation
build-plugin.sh  Builds marketplace-ready dist from source
```

@RTK.md
