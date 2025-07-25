@echo off
cd /d E:\Naraddon\naraddon-homepage
git pull origin main
git add .
git commit -m "Quick deploy: %date% %time%"
git push origin main
cd frontend
npm run deploy
echo.
echo DONE! Check: https://pola2025.github.io/naraddon-homepage/
timeout /t 5