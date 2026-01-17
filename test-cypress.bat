@echo off
echo.
echo ========================================
echo   SafariHub Cypress Test Runner
echo ========================================
echo.

REM Check if server is running
echo Checking if development server is running on PORT 3000...
curl -s -o NUL -w "%%{http_code}" http://localhost:3000 > temp.txt
set /p STATUS=<temp.txt
del temp.txt

if "%STATUS%"=="200" (
    echo [OK] Development server is running!
    echo.
    echo Starting Cypress tests...
    echo.
    npx cypress open
) else if "%STATUS%"=="000" (
    echo.
    echo [ERROR] Development server is NOT running!
    echo.
    echo Please start the server first:
    echo   npm run dev
    echo.
    echo Then run this script again.
    echo.
    pause
) else (
    echo.
    echo [WARNING] Server responded with status: %STATUS%
    echo Attempting to start Cypress anyway...
    echo.
    npx cypress open
)
