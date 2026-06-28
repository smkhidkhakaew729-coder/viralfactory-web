@echo off
cd /d "%~dp0"
echo Installing dependencies...
npm install
echo.
echo Starting ViralFactory Web...
npm run dev
pause
