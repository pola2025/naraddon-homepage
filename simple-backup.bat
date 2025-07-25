@echo off
:start
cls
echo AUTO BACKUP - NARADDON
echo.
echo Backup starting...
cd /d E:\Naraddon\naraddon-homepage
git add .
git commit -m "Backup: %date% %time%"
git push origin main
echo.
echo Done! Next backup in 5 minutes...
timeout /t 300 > nul
goto start