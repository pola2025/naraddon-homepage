@echo off
:start
cls
echo AUTO BACKUP SYSTEM - NARADDON
echo ==============================
echo.

cd /d E:\Naraddon\naraddon-homepage

:: 먼저 최신 변경사항 가져오기
echo Syncing with GitHub...
git pull origin main --no-edit > nul 2>&1

:: 변경사항 추가
echo Adding changes...
git add . > nul 2>&1

:: 커밋
echo Creating backup...
git commit -m "Auto-backup: %date% %time%" > nul 2>&1

:: 푸시
echo Uploading to GitHub...
git push origin main > nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [OK] Backup successful!
) else (
    echo [!] Sync issue detected, fixing...
    git pull origin main --rebase > nul 2>&1
    git push origin main > nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Fixed and backed up!
    ) else (
        echo [ERROR] Please check manually
    )
)

echo.
echo Next backup in 5 minutes...
echo Press Ctrl+C to stop

timeout /t 300 > nul
goto start