@echo off
echo ====================================
echo    NEW VIDEO DEPLOYMENT
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage\frontend

echo [1/7] Checking new video file...
if exist "public\videos\Naraddon_main_2nd.mp4" (
    echo [OK] New video file found!
    dir public\videos\Naraddon_main_2nd.mp4
) else (
    echo [ERROR] Video file not found!
    pause
    exit
)

echo.
echo [2/7] Cleaning cache...
rmdir /s /q node_modules\.cache\gh-pages
rmdir /s /q build

echo.
echo [3/7] Building...
call npm run build

echo.
echo [4/7] Verifying video in build...
if exist "build\videos\Naraddon_main_2nd.mp4" (
    echo [OK] Video copied to build!
) else (
    echo [!] Copying video manually...
    mkdir build\videos
    copy public\videos\Naraddon_main_2nd.mp4 build\videos\
)

echo.
echo [5/7] Committing changes...
cd ..
git add .
git commit -m "Update: New video file Naraddon_main_2nd.mp4"
git push origin main

echo.
echo [6/7] Deploying to GitHub Pages...
cd frontend
call npm run deploy

echo.
echo [7/7] Opening GitHub to verify...
start https://github.com/pola2025/naraddon-homepage/tree/gh-pages/videos

echo.
echo ====================================
echo    DEPLOYMENT COMPLETE!
echo ====================================
echo.
echo New video: Naraddon_main_2nd.mp4
echo.
echo Check in 5 minutes:
echo https://pola2025.github.io/naraddon-homepage/
echo.
pause