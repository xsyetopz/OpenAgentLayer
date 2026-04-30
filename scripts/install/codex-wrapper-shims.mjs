import path from "node:path";

import { PATHS } from "./shared.mjs";

export const CODEX_WRAPPER_NAMES = [
	"openagentsbtw-codex",
	"oabtw-codex",
	"openagentsbtw-codex-peer",
	"oabtw-codex-peer",
];

export function renderCodexWrapperShim(name) {
	const target = path.join(PATHS.codexWrapperBinDir, name);
	return `#!/bin/bash
set -euo pipefail
exec "${target}" "$@"
`;
}

export function renderCodexWrapperPs1(name) {
	const target = path
		.join(PATHS.codexWrapperBinDir, name)
		.replaceAll("\\", "\\\\");
	return [
		"Set-StrictMode -Version Latest",
		"$ErrorActionPreference = 'Stop'",
		"$bash = Get-Command bash -ErrorAction SilentlyContinue",
		"if (-not $bash) {",
		"  Write-Error 'bash is required for openagentsbtw Codex wrapper shims on Windows.'",
		"}",
		`& $bash.Source "${target}" @args`,
		"exit $LASTEXITCODE",
	].join("\n");
}

export function renderCodexWrapperCmd(name) {
	return [
		"@echo off",
		`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0${name}.ps1" %*`,
	].join("\r\n");
}
