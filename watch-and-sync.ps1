# 파일 변경 감시 및 자동 Git 커밋 스크립트
Write-Host "🔍 파일 감시 시작..." -ForegroundColor Green
Write-Host "📁 감시 폴더: E:\Naraddon\naraddon-homepage\frontend\src" -ForegroundColor Cyan
Write-Host "⚡ 종료하려면 Ctrl+C를 누르세요" -ForegroundColor Yellow

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "E:\Naraddon\naraddon-homepage\frontend\src"
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

$lastCommit = Get-Date

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $changeType = $Event.SourceEventArgs.ChangeType
    $timeNow = Get-Date
    
    # 마지막 커밋으로부터 30초 이상 지났을 때만 커밋
    if (($timeNow - $script:lastCommit).TotalSeconds -gt 30) {
        Write-Host "`n📝 변경 감지: $path" -ForegroundColor Yellow
        Write-Host "🔄 자동 커밋 준비 중..." -ForegroundColor Cyan
        
        # 5초 대기 (추가 변경사항 대기)
        Start-Sleep -Seconds 5
        
        Set-Location "E:\Naraddon\naraddon-homepage"
        
        git add .
        $fileName = Split-Path $path -Leaf
        git commit -m "Auto-save: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $changeType in $fileName"
        git push origin main
        
        Write-Host "✅ 자동 저장 완료!" -ForegroundColor Green
        Write-Host "⏰ 다음 자동 저장까지 최소 30초 대기" -ForegroundColor Gray
        
        $script:lastCommit = Get-Date
    }
}

Register-ObjectEvent $watcher "Changed" -Action $action
Register-ObjectEvent $watcher "Created" -Action $action
Register-ObjectEvent $watcher "Deleted" -Action $action
Register-ObjectEvent $watcher "Renamed" -Action $action

while ($true) { Start-Sleep -Seconds 1 }