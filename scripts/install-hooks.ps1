<#
  install-hooks.ps1
  -----------------
  Copies the tracked git hooks from scripts/hooks/ into .git/hooks/
  so the build-info stamp runs automatically. Git hooks are not
  themselves version-controlled, so run this once after cloning.

  Usage:  powershell -ExecutionPolicy Bypass -File scripts/install-hooks.ps1
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$srcDir   = Join-Path $repoRoot 'scripts/hooks'
$dstDir   = Join-Path $repoRoot '.git/hooks'

if (-not (Test-Path $dstDir)) {
  throw "No .git/hooks directory found. Are you in a git repo?"
}

Get-ChildItem -Path $srcDir -File | ForEach-Object {
  $dst = Join-Path $dstDir $_.Name
  Copy-Item $_.FullName $dst -Force
  Write-Host "Installed hook: $($_.Name)"
}

# Stamp once now so build-info.js is current
& (Join-Path $repoRoot 'scripts/stamp-version.ps1')
Write-Host "Done. Hooks installed and build-info.js stamped."
