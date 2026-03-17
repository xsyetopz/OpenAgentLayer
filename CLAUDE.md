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

- `pre-secrets.py` — guards .env, credentials, force-push

**Project-level** (`hooks.json` → `hooks/scripts/`):

- `pre/validate-input.py` — schema validation for tool inputs
- `pre/bash-guard.py` — guards dangerous bash commands
- `pre/http-proxy.py` — optional HTTP DLP forwarding
- `post/write-quality.py` — auto-format + placeholder + slop scan
- `post/bash-redact.py` — redacts secrets from output
- `post/failure-circuit.py` — retry loop detection
- `post/http-proxy.py` — optional HTTP DLP forwarding
- `post/subagent-scan.py` — placeholder scan on subagent stop
- `post/stop-scan.py` — placeholder scan on session stop
- `session/start-budget.py` — line budget warnings
- `session/end-cleanup.py` — cleanup + audit summary
- `session/prompt-git-context.py` — git context injection
- `session/teammate-idle-resume.py` — force idle agent continuation
- `session/notification-audit.py` — audit logging
- `session/permission-audit.py` — audit trail

## Model Strategy

- **Pro** (`--pro`): `opusplan` orchestrator (opus planning, sonnet execution). All subagents sonnet/haiku.
- **Max** (`--max`): `opusplan` orchestrator. Athena/Nemesis/Odysseus get opus. Rest sonnet/haiku.
- Env vars pin model versions: `ANTHROPIC_DEFAULT_OPUS_MODEL=claude-opus-4-6`, etc.
- Output style: CCA (positive identity framing, evidence-based, developer-facing).
- Statusline: model, context %, cost, git branch.

## Development

```bash
make lint      # shellcheck + ruff + jsonlint
make test      # pytest
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
                 user/ (pre-secrets.py, rtk-rewrite.sh)
                 scripts/ (_lib.py, pre/, post/, session/)
constraints/     shared.md, pro.md, max.md, zen.md
templates/       CLAUDE.md, settings-global.json
output-styles/   cca.md (custom output style)
statusline/      cca-statusline.sh (context/cost/git statusline)
tests/           pytest tests for all hooks
install.sh       Package flags, model substitution, validation
build-plugin.sh  Builds marketplace-ready dist from source
```

@RTK.md
