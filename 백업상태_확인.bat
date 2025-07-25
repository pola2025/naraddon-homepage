@echo off
echo ====================================
echo 📊 나라똔 백업 상태 확인
echo ====================================
echo.

cd /d E:\Naraddon\naraddon-homepage

echo 📅 마지막 백업 정보:
git log -1 --pretty=format:"날짜: %%cd%%n메시지: %%s%%n" --date=local
echo.
echo ------------------------------------
echo.

echo 📝 현재 변경사항:
git status --short
echo.

echo 📌 GitHub 페이지:
echo https://github.com/pola2025/naraddon-homepage
echo.

pause