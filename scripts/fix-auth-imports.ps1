# PowerShell Script to safely update authOptions imports
# 작성일: 2025-01-25
# 목적: authOptions import 경로를 안전하게 수정

$ErrorActionPreference = "Stop"

# 수정할 파일 목록
$files = @(
    "app/api/admin/grant-role/route.ts",
    "app/api/admin/logs/route.ts",
    "app/api/admin/users/[id]/role/route.ts",
    "app/api/admin/users/[id]/upgrade/route.ts",
    "app/api/auth/logout/route.ts",
    "app/api/consultations/route.ts",
    "app/api/consultations/[id]/assign/route.ts",
    "app/api/consultations/[id]/review/route.ts",
    "app/api/consultations/[id]/route.ts",
    "app/api/consultations/[id]/status/route.ts",
    "app/api/naraddon-tube/get-password/route.ts",
    "app/api/policy-news/route.ts",
    "app/api/policy-news/upload-image/route.ts",
    "app/api/policy-news/[id]/route.ts",
    "app/api/users/[id]/activities/route.ts",
    "app/api/users/[id]/route.ts",
    "app/api/users/[id]/stats/route.ts"
)

# 백업 디렉토리 생성
$backupDir = "backups/auth-imports-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Write-Host "🔄 Starting authOptions import path update..." -ForegroundColor Cyan
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

            # 패턴 교체
            $oldPattern = "@/app/api/auth/\[...nextauth\]/route"
            $newPattern = "@/lib/auth-options"

            if ($content -match [regex]::Escape($oldPattern)) {
                $newContent = $content -replace [regex]::Escape($oldPattern), $newPattern

                # 파일 저장
                Set-Content -Path $file -Value $newContent -NoNewline

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

Write-Host "`n💡 To rollback, run:" -ForegroundColor Cyan
Write-Host "   Copy-Item -Path '$backupDir/*' -Destination . -Recurse -Force" -ForegroundColor White