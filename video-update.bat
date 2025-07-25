@echo off
echo ====================================
echo    VIDEO UPDATE FORCE DEPLOY
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage\frontend

echo [1/7] Cleaning gh-pages cache...
rmdir /s /q node_modules\.cache\gh-pages

echo.
echo [2/7] Cleaning build folder...
rmdir /s /q build

echo.
echo [3/7] Building fresh...
call npm run build

echo.
echo [4/7] Checking video in build...
dir build\videos\*.mp4

echo.
echo [5/7] Copying video to ensure update...
copy /Y public\videos\naraddon_background_low.mp4 build\videos\

echo.
echo [6/7] Showing video file info...
echo Video size and date:
dir build\videos\naraddon_background_low.mp4

echo.
echo [7/7] Force deploying with clean cache...
call npx gh-pages -d build --no-cache

echo.
echo ====================================
echo    FORCED VIDEO UPDATE COMPLETE!
echo ====================================
echo.
echo WAIT 5-10 minutes then check:
echo https://pola2025.github.io/naraddon-homepage/
echo.
echo If still old video, check:
echo https://github.com/pola2025/naraddon-homepage/tree/gh-pages/videos
echo.
pause