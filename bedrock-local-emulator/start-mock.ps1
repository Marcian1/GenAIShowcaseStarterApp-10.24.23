# Starts the local AWS mock and (optionally) the Mendix app wired to it through the standard AWS env vars.
# Usage:  .\bedrock-local-emulator\start-mock.ps1            -> mock only
#         .\bedrock-local-emulator\start-mock.ps1 -RunApp    -> mock + Mendix runtime (hsqldb, default config)
param([switch]$RunApp)
$root  = Split-Path $PSScriptRoot -Parent
$dir   = Join-Path $PSScriptRoot '.runtime'
New-Item -ItemType Directory -Force $dir | Out-Null
$token = Join-Path $dir 'web-identity-token'
Set-Content $token 'mock-web-identity-token-from-runtime' -NoNewline

# Same variables an IRSA / web-identity runtime provides, plus AWS_ENDPOINT_URL to redirect STS + Bedrock to the mock.
$env:AWS_WEB_IDENTITY_TOKEN_FILE = $token
$env:AWS_ROLE_ARN                = 'arn:aws:iam::000000000000:role/mock-bedrock-role'
$env:AWS_ROLE_SESSION_NAME       = 'mendix-local'
$env:AWS_REGION                  = 'eu-central-1'
$env:AWS_ENDPOINT_URL            = 'http://127.0.0.1:8787'

try { Invoke-RestMethod http://127.0.0.1:8787/health -TimeoutSec 2 | Out-Null; Write-Host 'mock already running on 8787'; $already = $true } catch { $already = $false }
if (-not $already) {
$node = Start-Process node -ArgumentList (Join-Path $PSScriptRoot 'aws-mock\server.js') -PassThru -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $dir 'mock.log') -RedirectStandardError (Join-Path $dir 'mock.err.log')
$node.Id | Set-Content (Join-Path $dir 'mock.pid')
Write-Host "mock pid $($node.Id), log: $dir\mock.log"
}
if ($RunApp) {
  Set-Location $root
  mxcli run stop -p GenAIShowcaseStarterApp.mpr
  mxcli run --local --detach --db-type hsqldb --app-port 8085 --admin-port 8086 --serve-port 8087 -p GenAIShowcaseStarterApp.mpr
}
