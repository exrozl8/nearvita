@echo off
REM =========================================
REM  NearVita — Start Backend (FastAPI)
REM  Run this from the project root folder
REM =========================================

echo.
echo  [NearVita] Starting backend...
echo  API will be available at http://localhost:8001
echo  API docs:               http://localhost:8001/docs
echo  Press Ctrl+C to stop.
echo.

cd /d "%~dp0backend"

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start FastAPI with auto-reload
uvicorn server:app --reload --port 8001

pause
