# Build zip via PowerShell Compress-Archive (Windows native - may work better on Liara)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$tempDir = Join-Path $root "liara\temp-deploy"
$zipPath = Join-Path $root "liara\newray.zip"

$exclude = @("node_modules", "dist", "liara", ".git", ".cursor", "*.zip")
$excludeNames = @("node_modules", "dist", "liara", ".git", ".cursor")

if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory $tempDir -Force | Out-Null

function Copy-Project {
    param($src, $dst)
    $entries = Get-ChildItem $src -Force
    foreach ($e in $entries) {
        $name = $e.Name
        if ($name -match '^\.' -or $name -eq "node_modules" -or $name -eq "dist" -or $name -eq "liara" -or $name -eq ".git" -or $name -match "\.zip$") { continue }
        $dstPath = Join-Path $dst $name
        if ($e.PSIsContainer) {
            New-Item -ItemType Directory $dstPath -Force | Out-Null
            Copy-Project $e.FullName $dstPath
        } else {
            Copy-Item $e.FullName $dstPath -Force
        }
    }
}

Copy-Project $root $tempDir

# liara.json
@{
    platform = "react"
    build = @{ output = "dist" }
} | ConvertTo-Json | Set-Content (Join-Path $tempDir "liara.json") -Encoding UTF8

# Create zip - contents at root (not temp-deploy folder)
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -CompressionLevel Optimal

Remove-Item $tempDir -Recurse -Force

Write-Host "`nliara/newray.zip ready (PowerShell)"
