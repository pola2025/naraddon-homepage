@echo off
echo ================================
echo 🚀 나라똔 자동 배포 시작
echo ================================

cd /d E:\Naraddon\naraddon-homepage

echo.
echo 📥 최신 변경사항 가져오기...
git pull origin main

echo.
echo 📝 변경사항 확인...
git status

echo.
echo 💬 커밋 메시지 입력 (Enter만 누르면 자동 메시지 사용):
set /p commit_msg="커밋 메시지: "
if "%commit_msg%"=="" (
    for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set today=%%c-%%a-%%b
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set now=%%a:%%b
    set commit_msg=Update: %today% %now%
)

echo.
echo 📝 변경사항 추가...
git add .

echo.
echo 💾 커밋 중...
git commit -m "%commit_msg%"

echo.
echo 📤 GitHub에 푸시...
git push origin main

echo.
echo 🏗️  빌드 및 GitHub Pages 배포...
cd frontend
call npm run deploy

echo.
echo ================================
echo ✅ 배포 완료!
echo 📌 사이트: https://pola2025.github.io/naraddon-homepage/
echo ================================
echo.
echo 브라우저에서 확인하시겠습니까? (Y/N)
set /p open_browser="선택: "
if /i "%open_browser%"=="Y" start https://pola2025.github.io/naraddon-homepage/

pause