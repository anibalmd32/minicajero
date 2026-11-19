param(
    [switch]$SinCompilarApp
)

$ErrorActionPreference = 'Stop'
$installerDir = $PSScriptRoot
$appDir = Join-Path (Split-Path -Parent $installerDir) 'app'
$distDir = Join-Path $installerDir 'dist'
$output = Join-Path $distDir 'MiniCajero-Setup.exe'

if (-not $SinCompilarApp) {
    Write-Host 'Compilando la app (bun run build)...'
    Push-Location $appDir
    try {
        bun run build
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar la app. Si MiniCajero está abierto desde app/dist, ciérralo y vuelve a intentarlo.' }
    }
    finally {
        Pop-Location
    }
}

Write-Host 'Compilando el instalador (cargo build --release)...'
cargo build --release --manifest-path (Join-Path $installerDir 'Cargo.toml')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar el instalador.' }

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
Copy-Item -Force (Join-Path $installerDir 'target\release\MiniCajero-Setup.exe') $output
$sizeMb = [math]::Round((Get-Item $output).Length / 1MB, 1)
Write-Host "Instalador listo: $output ($sizeMb MB)"
