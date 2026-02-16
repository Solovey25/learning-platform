$ErrorActionPreference = "Stop"

Set-Location -Path $PSScriptRoot

Write-Host "== Starting database and backend via Docker ==" -ForegroundColor Cyan

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose up -d
}
elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose up -d
}
else {
    Write-Error "Docker is not installed or not available in PATH. Please install Docker Desktop and try again."
    exit 1
}

Write-Host "== Starting frontend dev server ==" -ForegroundColor Cyan

Set-Location -Path (Join-Path $PSScriptRoot "front")

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found, running npm install..." -ForegroundColor Yellow
    npm install
}

npm run dev