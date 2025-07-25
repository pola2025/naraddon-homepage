@echo off
:: 나라똔 자동백업을 시작 프로그램에 등록하는 스크립트

echo 🔧 나라똔 자동백업 시작 프로그램 등록
echo.

:: 시작 프로그램 폴더에 바로가기 생성
set startup_folder=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set shortcut_name=나라똔_자동백업.lnk

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%startup_folder%\%shortcut_name%'); $Shortcut.TargetPath = '%~dp05분_자동백업.bat'; $Shortcut.WindowStyle = 7; $Shortcut.Save()"

if %ERRORLEVEL% EQU 0 (
    echo ✅ 시작 프로그램에 등록 완료!
    echo 💡 다음 부팅 시 자동으로 백업이 시작됩니다.
    echo.
    echo 📌 제거하려면: Win+R → shell:startup → 나라똔_자동백업.lnk 삭제
) else (
    echo ❌ 등록 실패
)

pause