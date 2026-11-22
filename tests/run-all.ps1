# Runs the whole suite: mock tests -> project check -> MDL microflow tests -> Playwright UI tests.
# Usage: powershell -ExecutionPolicy Bypass -File tests/run-all.ps1 [-SkipUi] [-SkipMdl]
param([switch]$SkipUi, [switch]$SkipMdl)
$ErrorActionPreference = 'Continue'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$mpr = 'GenAIShowcaseStarterApp.mpr'
$results = [ordered]@{}
$times = [ordered]@{}
$suiteTimer = [Diagnostics.Stopwatch]::StartNew()
function Step($name, [scriptblock]$body) {
  Write-Host "`n=== $name ===" -ForegroundColor Cyan
  $sw = [Diagnostics.Stopwatch]::StartNew()
  & $body
  $script:times[$name] = $sw.Elapsed.TotalSeconds
  $ok = ($LASTEXITCODE -eq 0)
  $script:results[$name] = $ok
  if ($ok) { Write-Host "PASS: $name" -ForegroundColor Green } else { Write-Host "FAIL: $name" -ForegroundColor Red }
}

Step 'Mock server tests' { node --test bedrock-local-emulator/aws-mock/server.test.js }
Step 'Project check (mxcli docker check)' { mxcli docker check -p $mpr }
Step 'Domain model layout (no overlapping entities)' { node --test tests/domain-layout.test.js }

if (-not $SkipMdl) {
  Step 'MDL microflow tests' {
    Remove-Item tests/mdl-results.xml -ErrorAction SilentlyContinue
    mxcli test tests/mdl -p $mpr --local --db-type hsqldb --app-port 8191 --admin-port 8192 --serve-port 8193 --junit tests/mdl-results.xml
    # mxcli test holds its own project lock while it cleans up, so the temporary MxTest module and the after-startup setting
    # can be left behind (and the exit code is then non-zero although the tests passed). Clean up here, and judge by the JUnit file.
    Start-Sleep 3
    if (mxcli -p $mpr -c 'SHOW MODULES' 2>&1 | Select-String -SimpleMatch 'MxTest') {
      Write-Host 'Cleaning up the MxTest module left by mxcli test' -ForegroundColor Yellow
      mxcli -p $mpr -c "ALTER SETTINGS RUNTIME (AfterStartupMicroflow: 'General.ASU_MigrateData')" | Out-Host
      mxcli -p $mpr -c 'DROP MODULE MxTest' | Out-Host
    }
    $xml = Get-Content tests/mdl-results.xml -Raw -ErrorAction SilentlyContinue
    if ($xml -and $xml -notmatch 'failures="[1-9]' -and $xml -notmatch 'errors="[1-9]' -and $xml -match 'tests="[1-9]') { $global:LASTEXITCODE = 0 } else { $global:LASTEXITCODE = 1 }
  }
}

if (-not $SkipUi) {
  # The UI tests need the mock on :8787 in hash mode and the app with the demo user enabled.
  $pidFile = 'bedrock-local-emulator/.runtime/mock.pid'
  if (Test-Path $pidFile) { Stop-Process -Id (Get-Content $pidFile) -Force -ErrorAction SilentlyContinue }
  $env:MOCK_BACKEND = 'hash'
  powershell -NoProfile -ExecutionPolicy Bypass -File bedrock-local-emulator/start-mock.ps1 | Out-Host
  mxcli run stop -p $mpr | Out-Null
  Start-Sleep 3
  mxcli exec bedrock-local-emulator/enable_test_user.mdl -p $mpr | Out-Host
  try {
    # --detach returns once the app serves (or fails); starting it hidden with a polling loop hung when a stale run state existed.
    mxcli run --local --detach --db-type hsqldb --app-port 8091 --admin-port 8092 --serve-port 8093 -p $mpr *> .mxcli/ui-start.log
    Get-Content .mxcli/ui-start.log | Out-Host   # a pipe straight from the detached runtime can keep this script waiting for as long as the app lives
    $up = $false
    try { $up = (Invoke-WebRequest http://localhost:8091/ -UseBasicParsing -TimeoutSec 10).StatusCode -eq 200 } catch {}
    if (-not $up) { Write-Host 'App did not start on :8091' -ForegroundColor Red; $results['UI tests (Playwright)'] = $false }
    else {
      Push-Location tests/ui
      if (-not (Test-Path node_modules)) { npm install | Out-Host }
      Step 'UI tests (Playwright)' { npx playwright test }
      Pop-Location
    }
  } finally {
    mxcli run stop -p $mpr | Out-Null
    Start-Sleep 3
    mxcli exec bedrock-local-emulator/disable_test_user.mdl -p $mpr | Out-Host
  }
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
$results.GetEnumerator() | ForEach-Object { '{0,-6} {1,6}s  {2}' -f ($(if ($_.Value) {'PASS'} else {'FAIL'})), [int]$script:times[$_.Key], $_.Key }
Write-Host ('Total: {0}s' -f [int]$suiteTimer.Elapsed.TotalSeconds)
if ($results.Values -contains $false) { exit 1 } else { exit 0 }
