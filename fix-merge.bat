@echo off
echo ====================================
echo    GIT CONFLICT RESOLVER
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage

echo [1/6] Adding all changes...
git add .

echo.
echo [2/6] Completing merge...
git commit -m "Merge: Resolve conflicts and update files"

echo.
echo [3/6] Pushing to GitHub...
git push origin main

echo.
echo [4/6] Checking status...
git status

echo.
echo [5/6] Building frontend...
cd frontend
call npm run build

echo.
echo [6/6] Deploying to GitHub Pages...
call npm run deploy

echo.
echo ====================================
echo    ALL CONFLICTS RESOLVED!
echo ====================================
echo.
echo Site: https://pola2025.github.io/naraddon-homepage/
echo.
pause