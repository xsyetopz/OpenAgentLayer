# Windsurf Source and Docs Dive

Primary site: https://windsurf.com/
Docs: https://docs.windsurf.com/
Status: official docs-backed planning. Source implementation is not public in the same way as Codex/OpenCode/Kilo.

## Classification

Windsurf is an editor product with Cascade agent features and plugin/extension surfaces. v4 must not treat it as a standalone CLI.

## Native Surfaces

- Cascade memories
- Cascade workflows
- Cascade MCP
- Cascade hooks
- Editor rules/context surfaces
- Plugin/extension integration surfaces

## Hooks

Windsurf Cascade hooks are documented as a native surface. v4 can classify hooks as `native`, but adapter implementation must verify:

- hook config path
- event names
- payload schema
- transcript path access
- blocking semantics
- worktree hook behavior

## v4 Implications

- Split conceptually into `windsurf-editor` and possible `windsurf-plugin`.
- Render editor-visible rules/workflows/memories first.
- Treat transcript access as sensitive.
- Do not claim custom-agent support until official docs prove an artifact format.
- Do not install plugin artifacts until plugin packaging is verified.

## Edge Cases

- Hooks may expose transcript paths that contain sensitive prompts and tool output.
- Worktree events can run outside expected repo root.
- Editor context differs from CLI context; path resolution must use workspace APIs or documented paths.
- Extension/plugin installs may differ between Windsurf and VS Code even if extension ecosystems overlap.
