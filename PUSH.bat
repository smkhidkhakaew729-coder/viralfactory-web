@echo off
cd /d C:\Users\suriy\Downloads\ไมโต\viralfactory-web
git add -A
git commit -m "Dashboard: Hero AI style - sidebar + gradient cards + stats"
git push origin main
echo.
echo === Done! Vercel กำลัง deploy อัตโนมัติ ===
echo เปิด https://viralfactory-web.vercel.app/dashboard
pause
