# Contracts

## Harness boundary

OAL layers over existing tools. It does not replace model execution, editor UI, RTK filtering, Context7 docs, or Caveman mode rules.

## Task contract

Prompt hooks create task contracts. Stop hooks enforce them.

Required evidence depends on route:

- research: paths, commands, citations
- plan: decision-complete plan
- implement: edits and validation
- review: warranted findings
- validate: command, exit status, high-signal output

## Runner contract

The runner chooses command handling from repo evidence and integration capabilities. It must not coerce npm when the repo uses Bun, pnpm, Yarn, Cargo, Go, or another native tool.

## Install contract

Install writes a manifest. Uninstall removes only manifest-owned files.

## Provider contract

Provider upstream content is exact-sync by default. OAL overlays may add adapter metadata, install glue, and route mapping, but raw upstream snapshots are not editable.

Required providers:

- Caveman: exact upstream
- RTK: exact upstream external binary/provider
- Taste Skill: exact upstream
- BMAD-METHOD: upstream extraction with provenance

Optional CLI providers:

- Context7 CLI, not MCP
- Playwright CLI, not MCP
- DeepWiki
