Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cliPath = Join-Path $scriptDir 'scripts/build-plugin-cli.mjs'

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
	Write-Error 'node not found. openagentsbtw build-plugin requires Node.js >= 24.14.1.'
}

& $node.Source $cliPath @args
exit $LASTEXITCODE
