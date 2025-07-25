@echo off
echo Testing video file...
cd /d E:\Naraddon\naraddon-homepage\frontend

echo Building...
call npm run build

echo Deploying test page...
call npm run deploy

echo.
echo Test URLs:
echo 1. https://pola2025.github.io/naraddon-homepage/video-test.html
echo 2. https://pola2025.github.io/naraddon-homepage/videos/Naraddon_main_2nd.mp4
echo.
start https://pola2025.github.io/naraddon-homepage/video-test.html
pause