@echo off
echo Renaming video file...

cd /d E:\Naraddon\naraddon-homepage\frontend\public\videos

:: 새 파일명으로 복사
copy naraddon_background_low.mp4 naraddon_bg_new.mp4

echo Video file copied to: naraddon_bg_new.mp4
echo.
echo Now update the code to use the new filename!
pause