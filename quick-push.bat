@echo off
echo 📝 빠른 커밋 및 푸시
cd /d E:\Naraddon\naraddon-homepage

git add .
git commit -m "Quick update: %date% %time%"
git push origin main

echo ✅ GitHub 푸시 완료!
echo 💡 GitHub Pages 배포를 원하면 auto-deploy.bat를 실행하세요.
pause