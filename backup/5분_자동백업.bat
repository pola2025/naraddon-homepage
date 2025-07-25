@echo off
echo ====================================
echo 📦 나라똔 5분 자동 백업 시스템
echo ====================================
echo.
echo ⏰ 5분마다 자동으로 GitHub에 백업합니다
echo 🛑 종료하려면 Ctrl+C 또는 창 닫기
echo.

:loop
echo.
echo 🔄 백업 시작... [%date% %time%]

cd /d E:\Naraddon\naraddon-homepage
git add .
git commit -m "Auto-backup: %date% %time%"
git push origin main

echo ✅ 백업 완료! 다음 백업까지 5분 대기...
echo.

timeout /t 300 /nobreak > nul
goto loop