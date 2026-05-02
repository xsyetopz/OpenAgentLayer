# OAL Reboot Product Requirements

OAL is a reboot, not an “deprecated product wording” codebase. The product may be called OpenAgentLayer or OAL. Product code and generated artifacts must not mention “deprecated product wording.” baseline behavior is reference material only.

## Product definition

OAL is a provider-native generator/deployer that supercharges Claude Code, Codex, and OpenCode for vibe-coders. It generates, validates, deploys, updates, and uninstalls real end-user artifacts:

- agents and subagents;
- skills;
- commands and routes;
- OpenCode tools where useful;
- executable `.mjs` runtime hooks;
- safety guards;
- tailored provider configs;
- AGENTS.md;
- CLAUDE.md;
- provider instructions;
- model routing;
- manifest-owned installs.

## Non-negotiable product bar

OAL is not complete unless the product can do all of this as running code:

1. Load authored OAL source.
2. Validate source ownership and provider support.
3. Render real Codex artifacts.
4. Render real Claude Code artifacts.
5. Render real OpenCode artifacts.
6. Parse or validate generated configs where possible.
7. Deploy rendered artifacts into fixture project/user roots.
8. Preserve user-owned config during deployment.
9. Write manifests for OAL-owned files, text blocks, and structured config keys.
10. Uninstall only manifest-owned material.
11. Execute `.mjs` hook fixtures.
12. Verify OpenCode tools/commands are wired when generated.
13. Enforce allowed model sets.
14. Prove reference notes is reference-only and not imported by OAL.
15. Detect generated/source drift.

## File validity rule

A file belongs in OAL only if at least one is true:

- it is imported by product code;
- it is loaded as authored source by the generator;
- it is rendered into provider output;
- it is deployed or uninstalled by the deployer;
- it is executable runtime hook/tool code;
- it is used by validation or fixture tests;
- it is documentation of actual implemented behavior;
- it is baseline behavior reference material under `reference notes`.

Everything else is suspect. A disconnected Markdown/JSON catalog is not product.

## Generated artifact quality

Generated artifacts must be provider-usable. They must not be shallow placeholders.

### Codex output must include real surfaces such as

- config TOML fragments or full managed config payloads;
- agent TOML files with complete developer instructions;
- skills with full skill bodies and metadata;
- AGENTS.md/global instructions;
- hook/runtime references where Codex supports them;
- wrapper/profile/plan behavior only when actually supported.

### Claude Code output must include real surfaces such as

- settings JSON or merge payloads;
- agents/subagents with complete operational prompts;
- skills;
- CLAUDE.md/global instructions;
- hook bindings and executable hook scripts.

### OpenCode output must include real surfaces such as

- config JSON/JSONC;
- agents;
- commands;
- tools;
- instructions;
- permissions;
- plugin/hook surfaces where supported.

## Runtime hooks

Hooks are `.mjs`. They must be executable after deployment and must not require the source repo unless explicitly documented as development-only.

A hook is not valid if it is only a description. It must process real provider input or fixture input and return a provider-usable result.

Minimum hook families:

- completion/route contract gate;
- placeholder/prototype rejection;
- destructive command guard;
- secret guard;
- protected branch guard;
- generated/source drift guard;
- validation evidence gate;
- route/subagent context injection where provider supports it.

## Tools

Tools are not metadata. A tool is valid only if it is runnable or rendered into a provider surface that can call it.

OpenCode tools should be treated as real provider-native integrations, not as names in a command description.

## Commands and routes

A route/command is valid only if it includes:

- stable id;
- purpose;
- owner/primary agent or role;
- provider support;
- permissions/write contract;
- required skills;
- hook expectations;
- operational prompt body;
- validation behavior;
- provider-native rendered artifact.

A command like “Output: Decision and rationale” is not enough.

## Agent/subagent artifacts

Agent artifacts are valid only if they are generated from authored source and include complete operational instructions. A one-paragraph role card is invalid.

At minimum, every real agent/subagent needs:

- identity;
- trigger conditions;
- non-goals;
- tool/write/sandbox contract;
- provider support;
- model routing;
- skill access;
- route ownership;
- workflow/protocol;
- validation behavior;
- final-output contract;
- handoff/escalation rules.

## Model policy

Allowed Codex models:

- `gpt-5.5`
- `gpt-5.4-mini`
- `gpt-5.3-codex`

Forbidden Codex models:

- `blocked Codex model`
- `blocked Codex model`

Allowed Claude models:

- `claude-opus-4-7`
- `claude-opus-4-7[1m]`
- `claude-sonnet-4-6`
- `claude-haiku-4-5`

Forbidden Claude models:

- `blocked Claude model`
- `blocked Claude long-context model`

Avoid `xhigh` and `1m` except when explicitly justified by a route or large-context requirement.

## Acceptance principle

OAL must not be judged by whether it contains lots of files. It is judged by whether the full generator/deployer product works.

A passing implementation must prove:

- source is consumed;
- provider artifacts are generated;
- provider artifacts are usable;
- hooks execute;
- tools run or are provider-callable;
- deploy writes real installs;
- uninstall removes only owned material;
- manifests record ownership;
- unsupported models/provider features fail validation;
- baseline behavior remains reference-only.
