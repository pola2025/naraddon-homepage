@echo off
echo ====================================
echo    CLEAN DEPLOY SYSTEM
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage

:: 상태 확인
git status --porcelain > temp.txt
set /p status=<temp.txt
del temp.txt

if not "%status%"=="" (
    echo [!] Uncommitted changes found
    echo.
    echo Adding all changes...
    git add .
    git commit -m "Auto-save before deploy: %date% %time%"
)

echo [1/3] Syncing with GitHub...
git pull origin main --no-edit

echo.
echo [2/3] Pushing changes...
git push origin main

echo.
echo [3/3] Deploying to GitHub Pages...
cd /d E:\Naraddon\naraddon-homepage\frontend
call npm run deploy

echo.
echo ====================================
echo    DEPLOYMENT SUCCESSFUL!
echo ====================================
echo.
echo URL: https://pola2025.github.io/naraddon-homepage/
echo.
timeout /t 10