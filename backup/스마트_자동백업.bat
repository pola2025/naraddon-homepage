@echo off
echo ====================================
echo 🔍 나라똔 스마트 자동 백업
echo ====================================
echo.
echo 📁 파일 변경 시 자동 백업됩니다
echo ⏰ 최소 30초 간격으로 백업
echo 🛑 종료: Ctrl+C 또는 창 닫기
echo.

cd /d E:\Naraddon\naraddon-homepage

:: chokidar 설치 확인
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js가 설치되어 있지 않습니다.
    echo 💡 대신 5분_자동백업.bat을 사용하세요.
    pause
    exit
)

:: chokidar 설치
if not exist node_modules\chokidar (
    echo 📦 필요한 패키지 설치 중...
    npm install chokidar
)

:: 자동 백업 실행
node auto-backup.js

pause