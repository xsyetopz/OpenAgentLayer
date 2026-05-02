# OAL Reboot Product Spec

## Product definition

OAL is a production generator/deployer for end-user agentic coding setups.

It supercharges:

- Claude Code
- Codex
- OpenCode

It generates and deploys:

- agents/subagents
- skills
- commands/routes
- OpenCode tools where useful
- executable `.mjs` hooks
- safety guards
- tailored config files
- global instruction files such as `AGENTS.md` and `CLAUDE.md`
- provider-native plugin/runtime surfaces where supported

## Non-goals

OAL is not:

- a toy experiment
- an educational sample
- a prompt-card repository
- a JSON/Markdown catalog collection
- a schema-first framework
- a generic harness
- fake provider-parity middleware
- a decorative Greek-agent generator
- a baseline behavior compatibility wrapper

## Product rule

A file belongs in OAL only if it is one of these:

1. authored source consumed by the generator;
2. executable product code;
3. executable `.mjs` hook runtime;
4. provider renderer;
5. deploy/install/uninstall/manifest logic;
6. validation/acceptance logic;
7. generated output;
8. documentation for actual behavior;
9. baseline behavior reference under `reference notes`.

Anything else is suspect.

## baseline behavior reference rule

`reference notes/` is study/reference only.

OAL product code must not import it, mutate it, regenerate it, or depend on it at runtime.

Useful baseline behavior behavior can be recovered only by re-implementing it as OAL behavior.

## Naming rule

Internal discussions may call this `deprecated product wording`. Product code and generated artifacts must not.

Allowed product language:

- `OAL`
- `OpenAgentLayer`
- `openagentlayer`
- `oal`

Disallowed in OAL user-facing output:

- `deprecated product wording`
- `deprecated product wording`
- `OAL`
- `deprecated baseline behavior`

## Production-quality bar

OAL is production-quality when it can:

- load authored source;
- validate source and model rules;
- render Codex provider-native artifacts;
- render Claude Code provider-native artifacts;
- render OpenCode provider-native artifacts;
- parse/validate generated provider configs;
- write generated output;
- deploy into fixture and real targets;
- preserve user-owned config values;
- write manifest ownership records;
- uninstall only owned material;
- package and run executable `.mjs` hooks outside the source repo;
- prove OpenCode commands/tools are wired, not just described;
- reject unsupported models;
- reject generated/source drift;
- keep baseline behavior reference isolated;
- pass a single full-product acceptance command.
