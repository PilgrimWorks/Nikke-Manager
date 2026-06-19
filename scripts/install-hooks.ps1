<#
  install-hooks.ps1
  -----------------
  Configures git to read hooks directly from scripts/hooks/ via
  core.hooksPath, so no copying is needed and the hooks are always
  in sync with the tracked source.

  Usage:  powershell -ExecutionPolicy Bypass -File scripts/install-hooks.ps1
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

# Point git at the tracked hooks folder — no copying needed
git -C $repoRoot config core.hooksPath scripts/hooks
Write-Host "Set core.hooksPath = scripts/hooks"

# Stamp once now so build-info.js is current
& (Join-Path $repoRoot 'scripts/stamp-version.ps1')
Write-Host "Done. Hooks configured and build-info.js stamped."
