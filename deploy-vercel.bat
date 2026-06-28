@echo off
cd /d "%~dp0"
echo Installing Vercel CLI...
npm install -g vercel
echo.
echo Deploying to Vercel...
echo (จะถามให้ Login Vercel ครั้งแรก)
vercel --prod
pause
