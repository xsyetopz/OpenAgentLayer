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
- RTK integration remains optional and installer-managed; the installer builds the bundled patched RTK source when RTK support is selected, installs the managed binary at `~/.local/bin/rtk`, and adds the managed bin directory plus a direct `rtk()` redirect to Unix shell startup files. Restart the shell, or source the edited startup files (`~/.zshenv` and `~/.zshrc` for zsh), before running `rtk` directly.
