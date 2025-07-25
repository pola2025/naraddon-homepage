@echo off
chcp 65001 > nul
echo ====================================
echo [AUTO BACKUP SYSTEM - NARADDON]
echo ====================================
echo.
echo Every 5 minutes, auto backup to GitHub
echo Press Ctrl+C or close window to stop
echo.

:loop
echo.
echo [BACKUP] Starting... [%date% %time%]

cd /d E:\Naraddon\naraddon-homepage
git add .
git commit -m "Auto-backup: %date% %time%"
git push origin main

echo [DONE] Backup complete! Waiting 5 minutes...
echo.

timeout /t 300 /nobreak > nul
goto loop