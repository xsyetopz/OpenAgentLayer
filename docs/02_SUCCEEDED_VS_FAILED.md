# Where baseline behavior Succeeded vs Fell Short

## baseline behavior succeeded

### 1. It generated real artifacts

baseline behavior generated provider-specific artifacts instead of asking users to paste a wall of instructions. It produced Claude agents/skills/hooks/templates, Codex agents/config/plugin skills/wrappers/hooks, OpenCode agents/skills/commands/plugin guardrails, and Copilot surfaces.

Carry forward: OAL must be a generator/deployer, not a prompt repository.

### 2. It had real role contracts

The core agents had detailed prompts with constraints, protocols, output formats, handoff rules, and anti-scaffolding behavior. Atalanta, Hephaestus, and Athena are examples of substantial operational prompts.

Carry forward: OAL agent/subagent artifacts must be substantial operating contracts, not role cards.

### 3. It had useful hooks

Stop gates, route context, blocker quality checks, Caveman drift checks, staged secret checks, and completion-contract enforcement were real runtime behavior.

Carry forward: OAL hooks must remain executable `.mjs` programs with fixture coverage.

### 4. It used provider-specific surfaces

Codex profiles, plugin skills, wrappers, AGENTS.md, model instruction file, hooks, and custom agents were distinct from Claude settings, agents, hooks, and skills, and distinct again from OpenCode commands/plugin/agents/skills.

Carry forward: OAL should be provider-native, not a fake cross-provider abstraction.

### 5. It cared about routing, not only persona

Routes had `routeKind` values such as readonly, edit-required, and execution-required. Hooks used route metadata to decide whether a completion was valid.

Carry forward: OAL must treat routes, permissions, validation, and completion gates as product behavior.

## baseline behavior fell short

### 1. The generator was too monolithic

`scripts/generate.mjs` did too many jobs: source loading assumptions, provider rendering, hook mapping, filesystem writing, copying references/scripts, and shell generation. That made changes risky and encouraged grab-bag additions.

OAL requirement: separate source loading, validation, provider rendering, generated output writing, deployment, uninstall, and runtime hook packaging.

### 2. Source and generated output boundaries were not strict enough

baseline behavior generated into provider folders in-repo and tests inspected those outputs. This worked, but made it easy to blur source vs generated output.

OAL requirement: every generated file must map to source and renderer; generated artifacts are output, not product source.

### 3. OpenCode was thinner than Codex in route depth

Codex `implement` route had strong completion and anti-prototype language. OpenCode `provider implement route` was much shorter. This is not automatically wrong, but OAL must intentionally decide provider-specific depth rather than accidentally under-rendering a provider.

OAL requirement: provider-native does not mean shallow. OpenCode commands/tools must be full product surfaces.

### 4. Model routing was useful but outdated

baseline behavior model tables included disallowed current OAL models such as blocked Codex models, and Claude blocked Claude model family variants. It also used `xhigh` too freely for Plus.

OAL requirement: model allowlists and effort policy must be first-class validation.

### 5. Installer/deployer behavior was powerful but complex

baseline behavior install logic handled many surfaces, wrappers, prompts, toggles, plans, RTK, Caveman, Context7, Playwright, and provider-specific paths. It was useful, but hard to reason about as one long CLI.

OAL requirement: deploy planning, apply, uninstall, manifest ownership, and config merge must be explicit product components.

### 6. Tests did not fully prove production installation

baseline behavior tested generated outputs and some install behavior, but a reboot should require fixture deploy/uninstall and runtime hook execution as acceptance conditions.

OAL requirement: `accept` must prove render + deploy + manifest + uninstall + hook fixtures + provider config parseability.

## The reboot principle

OAL is not “OAL code.” OAL is a reboot that studies baseline behavior and keeps only the proven product behaviors:

- real generation
- real deployment
- executable hooks
- provider-native surfaces
- model routing
- route contracts
- usable generated artifacts
- install/uninstall ownership

The new codebase must not mention internal `deprecated product wording` language in user-facing code or generated artifacts.
