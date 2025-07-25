@echo off
echo ====================================
echo    EMERGENCY VIDEO FIX
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage

echo [1/8] Switching to gh-pages branch...
git checkout gh-pages

echo.
echo [2/8] Pulling latest gh-pages...
git pull origin gh-pages

echo.
echo [3/8] Going back to main branch...
git checkout main

echo.
echo [4/8] Cleaning everything...
cd frontend
rmdir /s /q build
rmdir /s /q node_modules\.cache

echo.
echo [5/8] Building...
call npm run build

echo.
echo [6/8] Manually copying videos...
xcopy /s /i /y public\videos build\videos

echo.
echo [7/8] Check video date...
dir build\videos\naraddon_background_low.mp4

echo.
echo [8/8] Force deploying...
call npx gh-pages -d build -f

echo.
echo ====================================
echo    DONE! Video should be updated!
echo ====================================
echo.
echo Check in 5 minutes:
echo https://github.com/pola2025/naraddon-homepage/tree/gh-pages/videos
echo.
pause