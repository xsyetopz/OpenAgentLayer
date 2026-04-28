# Codex CLI Platform Spec

Verified date: 2026-04-28.

## References

- https://developers.openai.com/codex/
- https://developers.openai.com/codex/config-reference
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/subagents
- https://github.com/openai/codex

## Native Surfaces

| Surface   | Level   | OAL Use                                                              |
| --------- | ------- | -------------------------------------------------------------------- |
| rules     | native  | render short `AGENTS.md` map plus local nested docs only when needed |
| config    | native  | render model routes, tool output budgets, MCP, hook enablement       |
| agents    | native  | render OAL roles as Codex subagents/custom agents                    |
| skills    | native  | render lazy-load skills with concise frontmatter                     |
| commands  | native  | render workflow commands where supported                             |
| hooks     | native  | enforce prompt/task contracts and stop gates                         |
| MCP       | native  | render only explicit OAL MCP config, do not hide package installs    |
| workflows | partial | compose from commands, skills, and agents                            |

## OAL Adapter Decisions

- Codex is primary adapter.
- OAL must use Codex-native config, hooks, skills, and subagents directly.
- `AGENTS.md` is an index, not full policy dump.
- Hook output must be self-contained; installed hook artifacts cannot import repo source paths.
- Config precedence must be tested with temp home and project config.
- Tool-output limits must be treated as hard constraints when summarizing evidence.

## Model Policy

Allowed models from current user constraint:

- `gpt-5.5` with `medium` or `high`
- `gpt-5.3-codex` with `medium`, `high`, or `xhigh`
- `gpt-5.4-mini` with `medium`, `high`, or `xhigh`

Default routes:

| Route                   | Model                 |
| ----------------------- | --------------------- |
| plan                    | `gpt-5.5 high`        |
| research                | `gpt-5.5 high`        |
| implement               | `gpt-5.3-codex high`  |
| debug                   | `gpt-5.3-codex xhigh` |
| review                  | `gpt-5.3-codex high`  |
| utility                 | `gpt-5.4-mini medium` |
| contract classification | `gpt-5.4-mini high`   |

## Hook Plan

Codex hook adapter must support:

- prompt contract creation on prompt submit
- shell gate before shell tool use
- evidence capture after command/tool results where available
- final response validation on stop
- delegated agent validation where supported

Failure messages must name exact missing evidence or blocked command. No generic policy prose.

## Validation

- config parse test
- model route test rejects unavailable model IDs
- hook fixture tests for prompt/pre-tool/stop events
- skill frontmatter smoke
- subagent render smoke
- temp-home install/uninstall smoke
- uninstall smoke
- large-output token budget fixture
