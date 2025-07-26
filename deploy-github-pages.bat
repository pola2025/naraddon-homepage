@echo off
echo ====================================
echo GitHub Pages 배포 스크립트
echo ====================================
echo.

:: 현재 디렉토리 저장
set ROOT_DIR=%cd%

:: frontend 폴더 존재 확인
if not exist "frontend" (
    echo ERROR: frontend 폴더를 찾을 수 없습니다!
    echo 현재 위치: %cd%
    pause
    exit /b 1
)

:: frontend 폴더로 이동
cd frontend

:: package.json 존재 확인
if not exist "package.json" (
    echo ERROR: frontend/package.json 파일을 찾을 수 없습니다!
    pause
    exit /b 1
)

:: homepage 설정 확인 및 추가
echo homepage 설정 확인 중...
findstr /C:"homepage" package.json > nul
if errorlevel 1 (
    echo homepage 필드 추가 중...
    powershell -Command "(Get-Content package.json) -replace '\"name\": \"frontend\",', '\"name\": \"frontend\",`n  \"homepage\": \"https://pola2025.github.io/naraddon-homepage/\",' | Set-Content package.json"
    if errorlevel 1 (
        echo ERROR: package.json 수정 실패!
        pause
        exit /b 1
    )
)

:: gh-pages로 배포 (자동으로 빌드도 실행됨)
echo.
echo GitHub Pages에 배포 중...
call npm run deploy
if errorlevel 1 (
    echo.
    echo ERROR: 배포 중 오류가 발생했습니다!
    echo npm run deploy 명령이 실패했습니다.
    pause
    exit /b 1
)

:: 루트로 돌아가기
cd %ROOT_DIR%

echo.
echo ====================================
echo 배포 완료!
echo 몇 분 후 다음 주소에서 확인하세요:
echo https://pola2025.github.io/naraddon-homepage/
echo ====================================
echo.
pause
