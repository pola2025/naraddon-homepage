# PowerShell Script to fix all authOptions imports
# 작성일: 2025-01-25

$ErrorActionPreference = "Stop"

# 수정할 파일 목록
$files = @(
    "app/api/auth/logout/route.ts",
    "app/api/users/[id]/route.ts",
    "app/api/users/[id]/stats/route.ts",
    "app/api/policy-news/upload-image/route.ts",
    "app/api/users/[id]/activities/route.ts",
    "app/api/policy-news/route.ts",
    "app/api/policy-news/[id]/route.ts",
    "app/api/naraddon-tube/get-password/route.ts",
    "app/api/consultations/[id]/status/route.ts",
    "app/api/consultations/route.ts",
    "app/api/consultations/[id]/assign/route.ts",
    "app/api/consultations/[id]/review/route.ts",
    "app/api/consultations/[id]/route.ts",
    "app/api/admin/users/[id]/upgrade/route.ts",
    "app/api/admin/users/route.ts",
    "app/api/admin/stats/route.ts",
    "app/api/admin/examiners/[id]/route.ts",
    "app/api/admin/examiners/[id]/activities/route.ts",
    "app/api/admin/examiners/route.ts"
)

# 백업 디렉토리 생성
$backupDir = "backups/auth-imports-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Write-Host "🔄 Fixing authOptions imports in all files..." -ForegroundColor Cyan
Write-Host "📁 Backup directory: $backupDir" -ForegroundColor Yellow

$successCount = 0
$errorCount = 0

foreach ($file in $files) {
    try {
        if (Test-Path $file) {
            # 백업 생성
            $backupPath = Join-Path $backupDir $file
            $backupDirPath = Split-Path $backupPath -Parent
            New-Item -ItemType Directory -Path $backupDirPath -Force | Out-Null
            Copy-Item $file $backupPath -Force

            # 파일 읽기
            $content = Get-Content $file -Raw

            # 다양한 패턴 교체
            $patterns = @(
                "@/app/api/auth/\[...nextauth\]/route",
                "@/api/auth/\[...nextauth\]/route",
                "../../auth/\[...nextauth\]/route",
                "../../../auth/\[...nextauth\]/route",
                "../../../../auth/\[...nextauth\]/route",
                "../../../api/auth/\[...nextauth\]/route"
            )

            $modified = $false
            foreach ($pattern in $patterns) {
                if ($content -match [regex]::Escape($pattern)) {
                    $content = $content -replace [regex]::Escape($pattern), "@/lib/auth-options"
                    $modified = $true
                }
            }

            if ($modified) {
                # 파일 저장
                Set-Content -Path $file -Value $content -NoNewline
                Write-Host "✅ Updated: $file" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "⏭️  Skipped: $file (already updated or pattern not found)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Not found: $file" -ForegroundColor Red
            $errorCount++
        }
    } catch {
        Write-Host "❌ Error processing $file : $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Successfully updated: $successCount files" -ForegroundColor Green
Write-Host "   ❌ Errors: $errorCount files" -ForegroundColor Red
Write-Host "   📁 Backup saved in: $backupDir" -ForegroundColor Yellow

if ($errorCount -eq 0) {
    Write-Host "`n🎉 All files updated successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some files had errors. Check the output above." -ForegroundColor Yellow
}