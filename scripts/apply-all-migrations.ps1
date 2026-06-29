# Apply all SQL migrations to local PostgreSQL (idempotent files only)
# Usage: $env:POSTGRES_PASSWORD='...'; .\scripts\apply-all-migrations.ps1

param(
  [string]$PgHost = "127.0.0.1",
  [string]$PostgresUser = "postgres",
  [string]$DbName = "newray",
  [string]$MigrationsDir = ""
)

$ErrorActionPreference = "Stop"
if (-not $MigrationsDir) {
  $MigrationsDir = Join-Path (Split-Path $PSScriptRoot -Parent) "supabase\migrations"
}
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

if (-not (Test-Path $psql)) { throw "psql not found" }

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
if (-not $env:POSTGRES_PASSWORD) { throw "POSTGRES_PASSWORD required" }
$env:PGPASSWORD = $env:POSTGRES_PASSWORD

# Order matters for dependencies; skip verify-only scripts
$skip = @(
  'supabase_verify_app_settings.sql',
  'supabase_migration_database_architecture_report.sql',
  'supabase_migration_rls_hardening.sql',
  'supabase_migration_rls_restrict_write_policies.sql'
)

$files = Get-ChildItem $MigrationsDir -Filter "*.sql" | Sort-Object Name
$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "apply-migrations-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

Write-Host "Applying migrations to $DbName ..."
foreach ($f in $files) {
  if ($skip -contains $f.Name) {
    Write-Host "  skip $($f.Name)"
    continue
  }
  Write-Host "  -> $($f.Name)"
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & $psql -h $PgHost -U $PostgresUser -d $DbName -v ON_ERROR_STOP=1 -f $f.FullName 2>&1 | Tee-Object -FilePath $logFile -Append | Out-Null
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($code -ne 0) {
    Write-Warning "Failed: $($f.Name) (see $logFile)"
    exit $code
  }
}

Write-Host "Done. Log: $logFile"
& (Join-Path $PSScriptRoot "check-db-schema.ps1") -PgHost $PgHost -PostgresUser $PostgresUser -DbName $DbName
