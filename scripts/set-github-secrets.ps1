# از .env.local یا .env مقدار VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را می‌خواند و در GitHub Secrets ست می‌کند.
# پیش‌نیاز: gh auth login و قرار گرفتن در ریشهٔ پروژه
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.local"
if (-not (Test-Path $envFile)) {
    $envFile = Join-Path $root ".env"
}
if (-not (Test-Path $envFile)) {
    Write-Error ".env.local or .env not found under $root"
    exit 1
}

$url = $null
$key = $null
Get-Content $envFile -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^VITE_SUPABASE_URL=(.+)$') {
        $url = $matches[1].Trim().Trim('"').Trim("'")
    }
    if ($line -match '^VITE_SUPABASE_ANON_KEY=(.+)$') {
        $key = $matches[1].Trim().Trim('"').Trim("'")
    }
}

if (-not $url -or -not $key) {
    Write-Error "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found or empty in .env"
    exit 1
}

# حذف هر گونه newline از مقدار (اگر در .env چندخطی کپی شده)
$url = ($url -replace "`r`n|`n|`r", "").Trim()
$key = ($key -replace "`r`n|`n|`r", "").Trim()

Write-Host "Setting SUPABASE_URL (length $($url.Length))..."
$url | gh secret set SUPABASE_URL
Write-Host "Setting SUPABASE_ANON_KEY (length $($key.Length))..."
$key | gh secret set SUPABASE_ANON_KEY
Write-Host "Done. Trigger deploy: gh workflow run 'Deploy to GitHub Pages' --ref main"
