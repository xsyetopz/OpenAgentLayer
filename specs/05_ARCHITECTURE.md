# Architecture Under the Hood

This file is the high-level map for AI coding agents changing OAL internals.
Use it before touching renderer, deployer, hook, MCP, plugin, or acceptance
behavior.

## System Layers

```mermaid
flowchart TD
    User[User command or provider runtime] --> CLI[packages/cli]
    CLI --> Source[packages/source]
    CLI --> Adapter[packages/adapter]
    CLI --> Deploy[packages/deploy]
    CLI --> Plugins[packages/plugins]
    CLI --> Inspect[packages/inspect]
    CLI --> Toolchain[packages/toolchain]

    Source --> Policy[packages/policy]
    Adapter --> Artifact[packages/artifact]
    Adapter --> Runtime[packages/runtime]
    Deploy --> Manifest[packages/manifest]
    Plugins --> Adapter
    Inspect --> Adapter
    Accept[packages/accept] --> CLI
    Accept --> Source
    Accept --> Adapter
    Accept --> Deploy
    Accept --> Runtime
    Accept --> Plugins
    Accept --> Manifest
```

OAL is intentionally package-owned. Avoid moving behavior into the CLI because
that makes provider tools, MCP servers, acceptance, and setup drift from each
other.

## Data Model

```mermaid
erDiagram
    OalSource ||--o{ AgentRecord : owns
    OalSource ||--o{ SkillRecord : owns
    OalSource ||--o{ RouteRecord : owns
    OalSource ||--o{ HookRecord : owns
    OalSource ||--o{ ToolRecord : owns
    OalSource ||--|| ProductSource : owns
    ArtifactSet ||--o{ Artifact : contains
    Manifest ||--o{ ManifestEntry : tracks
    Artifact ||--|| ManifestEntry : becomes
```

Source records are intent. Artifacts are rendered output. Manifest entries are
installed ownership. These are separate types and should stay separate.

## CLI Commands

```mermaid
flowchart LR
    main[packages/cli/src/main.ts] --> check
    main --> preview
    main --> render
    main --> deploy
    main --> uninstall
    main --> setup
    main --> plugins
    main --> inspect
    main --> mcp
    main --> rtk
```

Important command ownership:

- `check` loads source, validates policy, and proves renderability
- `preview` renders and prints paths or contents
- `render` writes rendered artifacts to an output directory
- `deploy` writes into project or global targets through deploy plans
- `uninstall` acts from manifest ownership
- `setup` orchestrates toolchain, deploy, plugin sync, binary shim, and checks
- `plugins` syncs provider plugin payloads
- `inspect` returns shared reports from `packages/inspect`
- `mcp` serves OAL-owned MCP servers over stdio

## Renderer Architecture

```mermaid
flowchart TD
    Source[OalSource] --> Common[adapter/common.ts]
    Source --> Codex[adapter/codex.ts]
    Source --> Claude[adapter/claude.ts]
    Source --> OpenCode[adapter/opencode.ts]
    Runtime[runtime files] --> Hooks[adapter/hooks.ts]
    Skills[adapter/skills.ts] --> Codex
    Skills --> Claude
    Skills --> OpenCode
    Hooks --> Codex
    Hooks --> Claude
    Hooks --> OpenCode
    Codex --> ArtifactSet
    Claude --> ArtifactSet
    OpenCode --> ArtifactSet
```

Provider renderers should share helpers only when the provider behavior is truly
shared. If a provider has a different native surface, keep that difference in
the provider renderer and acceptance tests.

## Deploy Architecture

```mermaid
sequenceDiagram
    participant CLI
    participant Adapter
    participant Deploy
    participant Target
    participant Manifest

    CLI->>Adapter: render artifacts
    Adapter-->>CLI: ArtifactSet
    CLI->>Deploy: planDeploy(target, artifacts)
    Deploy->>Target: read current files/config
    Deploy->>Manifest: read ownership
    Deploy-->>CLI: DeployPlan
    CLI->>Deploy: applyDeploy(plan)
    Deploy->>Target: write files, blocks, config keys
    Deploy->>Manifest: write ownership entries
```

`DeployPlan` is the boundary between preview and mutation. Dry-run output should
come from the plan, and apply should execute the plan.

## Plugin Architecture

Provider plugin payloads are generated from the same artifacts and source
records as project deploys. Plugin sync writes provider-level payloads and prunes
stale OAL-owned caches.

```mermaid
flowchart TD
    Source --> Adapter
    Adapter --> PluginPayloads[plugin payload roots]
    PluginPayloads --> CodexPlugin[Codex marketplace + cache]
    PluginPayloads --> ClaudePlugin[Claude marketplace/plugin root]
    PluginPayloads --> OpenCodePlugin[OpenCode plugin root]
```

Plugin activation is provider-native. Missing provider CLIs should not block
payload sync when OAL can still write owned payloads safely.

## Inspect and MCP

`oal inspect` and `oal mcp serve oal-inspect` are the same conceptual surface.
They load source, render artifacts, and ask `packages/inspect` for reports.

```mermaid
sequenceDiagram
    participant Caller as CLI, MCP, or OpenCode tool
    participant Inspect as packages/inspect
    participant Source as packages/source
    participant Adapter as packages/adapter

    Caller->>Source: loadSource
    Caller->>Adapter: renderAllProviders
    Caller->>Inspect: inspectTopic
    Inspect-->>Caller: report text or JSON
```

OpenCode custom tools should call `oal inspect` rather than duplicating report
logic.

## Acceptance Architecture

Acceptance is a product simulation. It is not a unit-test collection.

```mermaid
flowchart TD
    Accept[runAcceptance] --> SourceCheck[source inventory and policy]
    Accept --> RenderCheck[provider render checks]
    Accept --> DeployFixture[deploy fixture root]
    DeployFixture --> HookFixture[execute hooks]
    DeployFixture --> ToolFixture[execute OpenCode tools]
    DeployFixture --> UninstallFixture[uninstall and preserve user content]
    Accept --> ReleaseCheck[version, cask, CI, message style]
```

Acceptance should fail when a product surface is shallow, disconnected, or
unowned. Add acceptance coverage when changing behavior that crosses package
boundaries.
