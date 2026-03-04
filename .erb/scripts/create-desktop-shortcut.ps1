# Creates a desktop shortcut for Hyacinth.
# If the app is not built yet, runs a Windows "dir" build first (unpacked exe, no installer).

param([switch]$SkipBuild)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$BuildDir = Join-Path $ProjectRoot "release\build"
$UnpackedDir = Join-Path $BuildDir "win-unpacked"
$ExeName = "Hyacinth.exe"
$ExePath = Join-Path $UnpackedDir $ExeName
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop "Hyacinth.lnk"

# Build if the exe doesn't exist (unless -SkipBuild)
if (-not (Test-Path -LiteralPath $ExePath)) {
    if ($SkipBuild) {
        Write-Error "Hyacinth is not built yet. Run: npm run package:win (or npm run desktop-shortcut without -SkipBuild)"
    }
    Write-Host "Hyacinth executable not found. Building app (this may take a few minutes)..." -ForegroundColor Cyan
    Push-Location $ProjectRoot
    try {
        $buildResult = cmd /c "npm run build 2>&1"
        if ($LASTEXITCODE -ne 0) { throw "Build failed (exit code $LASTEXITCODE)" }
        $builderResult = cmd /c "npx electron-builder build --win dir --x64 --publish never 2>&1"
        if ($LASTEXITCODE -ne 0) { throw "electron-builder failed (exit code $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }
    if (-not (Test-Path -LiteralPath $ExePath)) {
        Write-Error "Build completed but $ExePath was not found."
    }
}

# Create PowerShell launcher (reliably sets HYACINTH_MASTER_PASSWORD for encryption)
# Uses a lock file to prevent double-click from spawning two instances (second would exit as "another instance")
$LauncherPath = Join-Path $UnpackedDir "LaunchHyacinth.ps1"
@"
# Launcher lock: prevent double-click from spawning two Hyacinth processes
`$scriptDir = Split-Path -Parent `$MyInvocation.MyCommand.Path
`$lockFile = Join-Path `$scriptDir '.hyacinth-launcher.lock'
`$stream = `$null
try {
  `$stream = [System.IO.File]::Open(`$lockFile, [System.IO.FileMode]::Create, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
} catch {
  exit 0
}
`$env:HYACINTH_MASTER_PASSWORD = 'hyacinth-desktop-default'
Set-Location `$scriptDir
Start-Process -FilePath (Join-Path `$scriptDir 'Hyacinth.exe') -WorkingDirectory `$scriptDir
Start-Sleep -Seconds 2
try { `$stream.Close(); Remove-Item `$lockFile -Force -ErrorAction SilentlyContinue } catch {}
"@ | Set-Content -Path $LauncherPath -Encoding UTF8

# Create shortcut (points to PowerShell launcher so env var is set)
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = 'powershell.exe'
$Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$LauncherPath`""
$Shortcut.WorkingDirectory = $UnpackedDir
$Shortcut.Description = "Hyacinth Medication Dispensing & Inventory System"
$Shortcut.IconLocation = "$ExePath,0"
$Shortcut.Save()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WshShell) | Out-Null

Write-Host "Desktop shortcut created: $ShortcutPath" -ForegroundColor Green
Write-Host "You can launch Hyacinth by double-clicking 'Hyacinth' on your desktop." -ForegroundColor Green
