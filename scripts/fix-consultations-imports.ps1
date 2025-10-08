# Fix consultations imports
$files = @(
    "app/api/consultations/route.ts",
    "app/api/consultations/`[id`]/status/route.ts",
    "app/api/consultations/`[id`]/assign/route.ts",
    "app/api/consultations/`[id`]/review/route.ts",
    "app/api/consultations/`[id`]/route.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "@/app/api/auth/`\[...nextauth`\]/route", "@/lib/auth-options"
        Set-Content -Path $file -Value $content -NoNewline
        Write-Host "✅ Fixed: $file"
    }
}