@echo off
echo ====================================
echo 🔍 나라똔 자동 백업 시스템 시작
echo ====================================
echo.
echo 📁 감시 폴더: frontend\src
echo ⚡ 파일을 수정하면 자동으로 GitHub에 백업됩니다
echo 🛑 종료하려면 이 창을 닫으세요
echo.
echo ====================================
echo.

powershell -ExecutionPolicy Bypass -File "watch-and-sync.ps1"
pause