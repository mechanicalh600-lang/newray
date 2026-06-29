# Verify required tables/RPCs exist in local newray database
# Usage: $env:POSTGRES_PASSWORD='...'; .\scripts\check-db-schema.ps1

param(
  [string]$PgHost = "127.0.0.1",
  [string]$PostgresUser = "postgres",
  [string]$DbName = "newray"
)

$ErrorActionPreference = "Stop"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"

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

$requiredTables = @(
  'production_reports', 'control_room_reports',
  'personnel_missions', 'factory_goods_exits', 'service_repair_requests',
  'app_users', 'personnel', 'work_orders', 'parts', 'equipment',
  'shift_reports', 'lab_reports', 'messages', 'report_definitions'
)

$requiredIndexes = @(
  'ix_personnel_missions_personnel_id',
  'ix_service_repair_requests_equipment_id',
  'ix_shift_reports_supervisor_id',
  'ix_part_requests_work_order_id'
)

$requiredRpcs = @(
  'get_next_tracking_code', 'get_report_matrix_cell_value',
  'list_public_tables', 'exec_read_only_query'
)

$missing = @()

foreach ($t in $requiredTables) {
  $exists = & $psql -h $PgHost -U $PostgresUser -d $DbName -tAc "SELECT to_regclass('public.$t') IS NOT NULL;"
  if ($exists -ne 't') { $missing += "table: $t" }
}

foreach ($r in $requiredRpcs) {
  $exists = & $psql -h $PgHost -U $PostgresUser -d $DbName -tAc "SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='$r');"
  if ($exists -ne 't') { $missing += "rpc: $r" }
}

foreach ($idx in $requiredIndexes) {
  $exists = & $psql -h $PgHost -U $PostgresUser -d $DbName -tAc "SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='$idx');"
  if ($exists -ne 't') { $missing += "index: $idx" }
}

# Verify all prefixes used by app resolve via RPC
$prefixTests = @('CR-', 'PR-', 'MIS', 'FEX', 'SRV', 'LAB-', 'WH-', 'HSE-', 'PROJ', 'WO')
$prefixFails = @()
foreach ($p in $prefixTests) {
  $code = & $psql -h $PgHost -U $PostgresUser -d $DbName -tAc "SELECT get_next_tracking_code('$p');"
  if (-not $code -or $code.Length -lt 4) { $prefixFails += $p }
}
if ($prefixFails.Count -gt 0) {
  Write-Host "WARN: tracking code prefix issues: $($prefixFails -join ', ')"
} else {
  Write-Host "OK: tracking code prefixes"
}

$auditCount = & $psql -h $PgHost -U $PostgresUser -d $DbName -tAc "SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' AND t.tgname LIKE 'trg_audit_%';"
Write-Host "Audit triggers: $auditCount"

$rlsBlocked = & $psql -h $PgHost -U $PostgresUser -d $DbName -tAc @"
SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.tablename=c.relname);
"@

Write-Host "=== Schema check ($DbName) ==="
if ($missing.Count -eq 0) {
  Write-Host "OK: all required tables and RPCs exist"
} else {
  Write-Host "MISSING:"
  $missing | ForEach-Object { Write-Host "  - $_" }
}

if ($rlsBlocked) {
  Write-Host "WARN: RLS enabled without policies:"
  $rlsBlocked -split "`n" | Where-Object { $_.Trim() } | ForEach-Object { Write-Host "  - $_" }
} else {
  Write-Host "OK: no RLS tables without policies"
}

if ($missing.Count -gt 0) { exit 1 }
