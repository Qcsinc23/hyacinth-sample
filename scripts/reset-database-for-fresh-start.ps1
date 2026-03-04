# Backs up existing Hyacinth database and encryption, then removes them
# so the app can start fresh with the default password.
# Run this if the app won't start due to encryption password mismatch.

$ErrorActionPreference = 'Stop'
$HyacinthData = "$env:APPDATA\Hyacinth"
$BackupDir = "$env:USERPROFILE\Desktop\Hyacinth-Reset-Backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "Backing up to: $BackupDir" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

# Backup DB and encryption
if (Test-Path "$HyacinthData\hyacinth.db") {
    Copy-Item "$HyacinthData\hyacinth.db" $BackupDir
    Copy-Item "$HyacinthData\hyacinth.db-shm" $BackupDir -ErrorAction SilentlyContinue
    Copy-Item "$HyacinthData\hyacinth.db-wal" $BackupDir -ErrorAction SilentlyContinue
}
if (Test-Path "$HyacinthData\encryption") {
    Copy-Item "$HyacinthData\encryption" $BackupDir -Recurse
}
Copy-Item "$HyacinthData\recovery.key" $BackupDir -ErrorAction SilentlyContinue

# Remove so app can start fresh
Remove-Item "$HyacinthData\hyacinth.db" -Force -ErrorAction SilentlyContinue
Remove-Item "$HyacinthData\hyacinth.db-shm" -Force -ErrorAction SilentlyContinue
Remove-Item "$HyacinthData\hyacinth.db-wal" -Force -ErrorAction SilentlyContinue
Remove-Item "$HyacinthData\encryption" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$HyacinthData\lockfile" -Force -ErrorAction SilentlyContinue

Write-Host "Done. Backup saved to Desktop. Launch Hyacinth again." -ForegroundColor Green
