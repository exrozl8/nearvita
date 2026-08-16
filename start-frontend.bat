@echo off
REM =========================================
REM  NearVita — Start Frontend (React)
REM  Run this from the project root folder
REM =========================================

echo.
echo  [NearVita] Starting frontend dev server...
echo  App will open at http://localhost:3000
echo  Press Ctrl+C to stop.
echo.

cd /d "%~dp0frontend"

npm.cmd start

pause
