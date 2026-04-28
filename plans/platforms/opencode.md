# OpenCode Platform Spec

Verified date: 2026-04-28.

## References

- https://opencode.ai/docs/
- https://opencode.ai/docs/config/
- https://opencode.ai/docs/models/
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/zen
- https://github.com/anomalyco/opencode

## Native Surfaces

| Surface     | Level   | OAL Use                                                                 |
| ----------- | ------- | ----------------------------------------------------------------------- |
| config      | native  | render model, small model, permissions, MCP, compaction where supported |
| agents      | native  | render OAL roles into agent/mode definitions                            |
| skills      | native  | render OAL skills into native OpenCode skill path                       |
| permissions | native  | allow `oal-runner`, gate raw shell and risky tools                      |
| commands    | partial | render only when native path is source-backed                           |
| hooks       | partial | use permissions/local plugin if proven; document unsupported events       |
| MCP         | native  | render explicit config only                                             |
| workflows   | partial | compose from agents, skills, and commands                               |

## OAL Adapter Decisions

- OpenCode is primary adapter after Codex.
- Use local generated files, not package plugin installs, by default.
- Treat skill discovery overlap with `.claude` and `.agents` as collision risk.
- Config precedence must be tested because OpenCode merges multiple layers.
- Use OpenCode-native permissions to make `oal-runner` the preferred shell path.

## Free Model Fallbacks

Initial fallback set from current user constraint:

- `opencode/nemotron-3-super-free`
- `opencode/minimax-m2.5-free`
- `opencode/ling-2.6-flash-free`
- `opencode/hy3-preview-free`
- `opencode/big-pickle`

Initial route order is defined in `plans/model-routing.md`; it must be benchmarked before release.

## Validation

- config parse test
- model route test for every fallback ID
- agent render fixture
- skill render fixture
- permission gate fixture allowing `oal-runner`
- raw-shell denial fixture
- skill collision fixture
- config precedence fixture
- temp-home install/uninstall smoke
