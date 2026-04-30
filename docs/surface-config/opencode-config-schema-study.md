# OpenCode config schema study

Purpose: extract current OpenCode config keys useful for OpenAgentLayer's OpenCode adapter.

Authority: study input for `../specs/surface-config-contract.md`.

Source:

- `https://opencode.ai/config.json`

Retrieval date: 2026-04-30.

## File format

OpenCode config schema:

- JSON Schema draft 2020-12;
- JSON config with comments/trailing commas allowed by schema metadata;
- top-level object with additional properties disabled.

OAL rule: adapter must emit only schema-known keys.

## Top-level OAL emit allowlist

| Key                  | Use in OAL                            | Notes                                                                     |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------- |
| `$schema`            | schema validation                     | Always emit in generated config.                                          |
| `shell`              | default terminal/bash shell           | User/project choice.                                                      |
| `logLevel`           | log filtering                         | Usually leave unset.                                                      |
| `server`             | serve/web command config              | Emit only if OAL owns OpenCode server behavior.                           |
| `command`            | command definitions                   | Core OAL OpenCode adapter output.                                         |
| `skills`             | additional skill folder paths or URLs | Core OAL skill integration.                                               |
| `watcher`            | ignore patterns                       | Useful for generated output and large dirs.                               |
| `snapshot`           | filesystem snapshot tracking          | Route/permission policy.                                                  |
| `plugin`             | plugin list and plugin options        | Core OAL runtime integration.                                             |
| `share`              | sharing behavior                      | Use `manual`, `auto`, or `disabled`; do not emit old boolean sharing key. |
| `autoupdate`         | update behavior                       | OAL can leave unset unless user opts in.                                  |
| `disabled_providers` | provider filtering                    | Use only when model policy requires.                                      |
| `enabled_providers`  | strict provider set                   | Use only when model policy requires.                                      |
| `model`              | default model                         | Profile/model route default.                                              |
| `small_model`        | small-task model                      | title/utility model.                                                      |
| `default_agent`      | default primary agent                 | OAL may set to generated primary agent.                                   |
| `agent`              | agent definitions                     | Core OAL role output.                                                     |
| `provider`           | provider definitions                  | Emit only when OAL owns provider settings.                                |
| `mcp`                | MCP server definitions                | Use for explicit MCP integrations.                                        |
| `formatter`          | formatter commands                    | Not core; emit only if route needs it.                                    |
| `lsp`                | language server config                | Not core; emit only for project-specific integration.                     |
| `instructions`       | instruction files/patterns            | Core OAL project guidance integration.                                    |
| `permission`         | tool permission defaults/rules        | Core OAL route contract mapping.                                          |
| `tools`              | tool enable/disable flags             | Core OAL tool surface.                                                    |
| `enterprise`         | enterprise URL                        | Leave unset unless explicitly configured.                                 |
| `tool_output`        | truncation thresholds                 | Harness-engineering budget control.                                       |
| `experimental`       | experimental flags                    | Do not emit by default.                                                   |

## Command config

`command` is an object keyed by command name. Each command requires:

- `template`

Optional fields:

- `description`
- `agent`
- `model`
- `subtask`

OAL mapping:

- command record ID -> command key;
- prompt template -> `template`;
- owner role -> `agent`;
- route model override -> `model`;
- subtask route -> `subtask`.

## Skills config

`skills` supports:

- `paths`: additional local skill folder paths;
- `urls`: skill URLs such as `.well-known/skills/`.

OAL mapping:

- project install -> local generated skills path;
- global install -> user/global generated skills path;
- remote skill catalogs only when explicitly configured.

## Instructions config

OAL emits `instructions` with the generated `.opencode/openagentlayer/instructions.md` path so project-wide prompt layers are native OpenCode config, not hidden plugin state.

## Plugin config

`plugin` is an array. Items can be:

- string plugin specifier;
- tuple of plugin specifier plus options object.

OAL mapping:

- generated OpenCode plugin path -> plugin item;
- plugin options -> OAL runtime settings.

## Agent config

OpenCode `agent` config defines agents and must distinguish primary agents from subagents where schema requires. `default_agent` must be a primary agent.

OAL mapping:

- role records -> `agent` entries;
- primary role -> `default_agent`;
- route contract -> agent permission and prompt fields.

## Provider/model config

Useful keys:

- `model`
- `small_model`
- `provider`
- `enabled_providers`
- `disabled_providers`

OAL rule: model routing spec decides these values. Adapter validates model strings against OpenCode/model schema format.

## MCP config

MCP entries support local and remote server objects:

- local: command-based server with command, args, env, enabled, timeout;
- remote: URL-based server with headers, OAuth, enabled, timeout.

OAL rule: emit MCP only from explicit OAL source records.

## Permissions

OpenCode `permission` supports global action or object rules.

Actions:

- `ask`
- `allow`
- `deny`

Tool-specific keys include:

- `read`
- `edit`
- `glob`
- `grep`
- `list`
- `bash`
- `task`
- `external_directory`
- `todowrite`
- `question`
- `webfetch`
- `websearch`
- `codesearch`
- `lsp`
- `doom_loop`
- `skill`

OAL mapping:

- route contract -> permission defaults;
- safety policies -> `deny` rules;
- route allowances -> `allow` rules.

## Replacement table

| Do not emit      | Emit instead                                                   | Reason                                                   |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------- |
| `autoshare`      | `share = "auto"` or `share = "manual"` or `share = "disabled"` | Schema marks boolean sharing key as replaced by `share`. |
| `layout`         | none                                                           | Schema says layout is fixed to stretch.                  |
| `experimental.*` | none by default                                                | Experimental keys are not adapter baseline.              |

## OAL adapter decisions

- Emit `$schema`.
- Emit `command`, `skills`, `plugin`, `agent`, `instructions`, and `permission` from source graph.
- Emit provider/model keys only from model-routing source.
- Do not emit removed/replaced/no-op keys.
- Validate generated config against OpenCode schema and source/schemas/upstream/manifest.json provenance.

## Provenance checkpoint

- Raw schema cache: `source/schemas/upstream/opencode-config.schema.json`.
- Manifest entry: `opencode-config-schema` in `source/schemas/upstream/manifest.json`.
- Extraction policy: include current config keys only; skip replaced sharing keys, fixed-layout/no-op keys, and experimental defaults.
