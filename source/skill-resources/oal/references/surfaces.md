# OAL surfaces

A valid OAL feature connects these layers:

1. authored source under `source/`;
2. loading and validation in `packages/source`;
3. provider rendering in `packages/adapter`;
4. deploy, update, uninstall, and manifest ownership;
5. provider-native artifact output for Codex, Claude Code, or OpenCode;
6. acceptance checks that fail when the surface drifts.

Do not add docs, JSON, or plugin files that are not consumed by this chain.
