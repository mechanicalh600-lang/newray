# Restore Supabase pg_dump (custom format) to local PostgreSQL for NewRay dev
# Usage:
#   $env:POSTGRES_PASSWORD = 'your-postgres-password'
#   .\scripts\restore-supabase-backup.ps1
#
# Optional:
#   -BackupPath "E:\Backup\SUpabase.sql"
#   -DbName "newray"
#   -PostgresUser "postgres"
#   -PgHost "127.0.0.1"

param(
  [string]$BackupPath = "E:\Backup\SUpabase.sql",
  [string]$DbName = "newray",
  [string]$PostgresUser = "postgres",
  [string]$PgHost = "127.0.0.1",
  [int]$Port = 5432
)

$ErrorActionPreference = "Stop"
$PgBin = "C:\Program Files\PostgreSQL\18\bin"
$psql = Join-Path $PgBin "psql.exe"
$pgrestore = Join-Path $PgBin "pg_restore.exe"
$createdb = Join-Path $PgBin "createdb.exe"
$rolesSql = Join-Path $PSScriptRoot "local-postgres-supabase-roles.sql"
$logDir = Join-Path $PSScriptRoot "logs"
$logFile = Join-Path $logDir "restore-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

if (-not (Test-Path $psql)) {
  throw "psql not found at $psql"
}
if (-not (Test-Path $BackupPath)) {
  throw "Backup not found: $BackupPath"
}
if (-not $env:POSTGRES_PASSWORD) {
  $envLocal = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
  if (Test-Path $envLocal) {
    Get-Content $envLocal | ForEach-Object {
      if ($_ -match '^\s*POSTGRES_PASSWORD\s*=\s*(.+)\s*$') {
        $env:POSTGRES_PASSWORD = $Matches[1].Trim().Trim('"').Trim("'")
      }
    }
  }
}
if (-not $env:POSTGRES_PASSWORD) {
  throw "Set POSTGRES_PASSWORD environment variable first (local postgres user password)."
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$env:PGPASSWORD = $env:POSTGRES_PASSWORD

function Invoke-Pg {
  param([string[]]$PgArgs)
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $psql -h $PgHost -p $Port -U $PostgresUser @PgArgs 2>&1 | Tee-Object -FilePath $logFile -Append
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($code -ne 0) { throw "psql failed (exit $code): $($PgArgs -join ' ')" }
}

Write-Host "==> Testing connection..."
Invoke-Pg @("-c", "SELECT version();")

Write-Host "==> Creating Supabase-compatible roles..."
Invoke-Pg @("-f", $rolesSql)

$dbExists = & $psql -h $PgHost -p $Port -U $PostgresUser -tAc "SELECT 1 FROM pg_database WHERE datname = '$DbName';"
if ($dbExists -ne "1") {
  Write-Host "==> Creating database '$DbName'..."
  & $createdb -h $PgHost -p $Port -U $PostgresUser $DbName
  if ($LASTEXITCODE -ne 0) { throw "createdb failed" }
} else {
  Write-Host "==> Database '$DbName' already exists."
}

Write-Host "==> Ensuring extensions in '$DbName'..."
$extSql = Join-Path $PSScriptRoot "local-postgres-extensions.sql"
$schemaSql = Join-Path $PSScriptRoot "local-postgres-schemas.sql"
Invoke-Pg @("-d", $DbName, "-f", $schemaSql)
Invoke-Pg @("-d", $DbName, "-f", $extSql)

Write-Host "==> Restoring schemas: public, extensions, storage (errors for missing Supabase-only objects are expected)..."
$restoreArgs = @(
  "-h", $PgHost,
  "-p", "$Port",
  "-U", $PostgresUser,
  "-d", $DbName,
  "--no-owner",
  "--no-acl",
  "--clean",
  "--if-exists",
  "-n", "public",
  "-n", "extensions",
  "-n", "storage",
  "--verbose",
  $BackupPath
)

$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& $pgrestore @restoreArgs 2>&1 | Tee-Object -FilePath $logFile -Append
$restoreExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap

Write-Host "==> Granting API roles on public schema..."
Invoke-Pg @("-d", $DbName, "-c", "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;")
Invoke-Pg @("-d", $DbName, "-c", "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;")
Invoke-Pg @("-d", $DbName, "-c", "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;")
Invoke-Pg @("-d", $DbName, "-c", "GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;")

$tableCount = & $psql -h $PgHost -p $Port -U $PostgresUser -d $DbName -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
Write-Host ""
Write-Host "Restore finished. public tables: $tableCount"
Write-Host "Log: $logFile"
if ($restoreExit -ne 0) {
  Write-Warning "pg_restore exit code: $restoreExit (some Supabase-only objects may be skipped - check log)."
}
