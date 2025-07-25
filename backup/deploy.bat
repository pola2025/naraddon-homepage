@echo off
chcp 65001 > nul
cls
echo ====================================
echo    NARADDON AUTO DEPLOY SYSTEM
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage

echo [1/5] Getting latest changes...
git pull origin main

echo.
echo [2/5] Checking status...
git status

echo.
echo [3/5] Enter commit message (or press Enter for auto):
set /p commit_msg=Message: 
if "%commit_msg%"=="" (
    set commit_msg=Update: %date% %time%
)

echo.
echo [4/5] Committing and pushing...
git add .
git commit -m "%commit_msg%"
git push origin main

echo.
echo [5/5] Building and deploying to GitHub Pages...
cd frontend
call npm run deploy

echo.
echo ====================================
echo    DEPLOYMENT COMPLETE!
echo ====================================
echo.
echo Site URL: https://pola2025.github.io/naraddon-homepage/
echo.
echo Open in browser? (Y/N)
set /p open_browser=Choice: 
if /i "%open_browser%"=="Y" start https://pola2025.github.io/naraddon-homepage/

pause