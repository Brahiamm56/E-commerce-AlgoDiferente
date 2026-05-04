# Script to push all .env variables to Vercel project
# Run this AFTER: vercel login
# Usage: .\scripts\vercel-env-push.ps1

$envFile = Join-Path $PSScriptRoot "..\\.env"
$projectDir = Join-Path $PSScriptRoot ".."

if (-not (Test-Path $envFile)) {
    Write-Error ".env file not found at $envFile"
    exit 1
}

Write-Host "Reading .env file..." -ForegroundColor Cyan

$lines = Get-Content $envFile | Where-Object { $_ -match "^[A-Z_]+=.+" -and $_ -notmatch "^#" }

foreach ($line in $lines) {
    $key, $value = $line -split "=", 2
    $key = $key.Trim()
    $value = $value.Trim()

    if ([string]::IsNullOrEmpty($key) -or [string]::IsNullOrEmpty($value)) {
        continue
    }

    Write-Host "Setting $key..." -ForegroundColor Yellow

    # Add to production, preview, and development environments
    $value | vercel env add $key production --cwd $projectDir 2>&1 | Out-Null
    $value | vercel env add $key preview --cwd $projectDir 2>&1 | Out-Null
}

Write-Host "`nDone! All env vars pushed to Vercel." -ForegroundColor Green
Write-Host "Triggering new deployment..." -ForegroundColor Cyan
vercel --prod --cwd $projectDir 2>&1
