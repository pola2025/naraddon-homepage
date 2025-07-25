@echo off
echo ====================================
echo [GIT SYNC & BACKUP] 
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage

echo [1/4] Pulling latest changes...
git pull origin main --no-edit

echo.
echo [2/4] Adding changes...
git add .

echo.
echo [3/4] Committing...
git commit -m "Auto-backup: %date% %time%"

echo.
echo [4/4] Pushing to GitHub...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Backup complete!
) else (
    echo.
    echo [ERROR] Push failed. Trying to fix...
    git pull origin main --rebase
    git push origin main
)

echo.
echo Done! Next backup in 5 minutes...
timeout /t 300 > nul

:: Loop back to start
goto :EOF
call "%~f0"