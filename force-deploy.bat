@echo off
echo ====================================
echo    FORCE REBUILD & DEPLOY
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage\frontend

echo [1/5] Cleaning old build...
rmdir /s /q build

echo.
echo [2/5] Installing dependencies...
call npm install

echo.
echo [3/5] Building fresh...
call npm run build

echo.
echo [4/5] Verifying video file...
if exist "build\videos\naraddon_background_low.mp4" (
    echo [OK] Video file found in build
) else (
    echo [!] Video file missing, copying...
    mkdir build\videos
    copy public\videos\naraddon_background_low.mp4 build\videos\
)

echo.
echo [5/5] Deploying to GitHub Pages...
call npm run deploy

echo.
echo ====================================
echo    DEPLOYMENT COMPLETE!
echo ====================================
echo.
echo IMPORTANT: 
echo 1. Wait 5 minutes
echo 2. Open: https://pola2025.github.io/naraddon-homepage/
echo 3. Press Ctrl+Shift+R (hard refresh)
echo 4. Check Developer Tools Network tab for video URL
echo.
pause