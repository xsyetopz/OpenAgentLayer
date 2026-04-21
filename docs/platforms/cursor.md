# Cursor

openagentsbtw installs Cursor support only when Cursor is detected.

## Surfaces

- Rules: `.cursor/rules/openagentsbtw.mdc`
- The installer does not write legacy `.cursorrules`.

## Install

`./install.sh --cursor` installs Cursor support when Cursor exists on the system.

`./install.sh --all` auto-detects Cursor and skips it when missing.

## Hook Status

Cursor has no stable native hook mapping in this release. openagentsbtw uses always-on MDC rules.
