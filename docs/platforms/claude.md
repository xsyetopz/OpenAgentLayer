# Claude

openagentsbtw uses documented Claude Code plugin surfaces:

- plugin manifest (`.claude-plugin/plugin.json`)
- generated agents
- generated skills
- generated hooks
- managed global `CLAUDE.md`

## Notes

- Hooks and instruction assets are generated from canonical source catalogs under `source/`.
- Caveman runtime behavior is managed by generated hook scripts and shared Caveman contract rules.
- RTK integration remains optional and installer-managed; the installer verifies an official `rtk-ai/rtk` binary with `rtk gain`, installs from the upstream project when no verified binary is present, and runs plain upstream `rtk init` best-effort.
