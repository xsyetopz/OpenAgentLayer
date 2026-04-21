# Roo Code

openagentsbtw installs Roo Code support only when Roo Code is detected or tests explicitly set a fake detector.

## Surfaces

- Project rules: `.roo/rules/openagentsbtw.md`
- Managed modes: `.roomodes`

## Install

`./install.sh --roo` installs Roo Code support when Roo Code exists on the system.

`./install.sh --all` auto-detects Roo Code and skips it when missing.

## Hook Status

Roo Code hook parity is not documented as a stable native surface here. openagentsbtw uses rules and modes only.
