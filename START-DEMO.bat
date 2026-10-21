@echo off
title TANAVIA - Production
color 0A

echo.
echo ========================================
echo  TANAVIA Startup (Production - Fast)
echo ========================================
echo.

echo [1/3] MySQL Service...
sc query XAMPPMySQL | findstr "RUNNING" >nul
if errorlevel 1 (
    echo     Starting MySQL...
    net start XAMPPMySQL
    timeout /t 5 /nobreak >nul
)
echo     MySQL OK
echo.

echo [2/3] Backend (port 4000)...
start "TANAVIA Backend" cmd /k "cd /d F:\Tanavia\apps\api && pnpm dev"
timeout /t 6 /nobreak >nul
echo     Backend started
echo.

echo [3/3] Frontend (production, port 3000)...
cd /d F:\Tanavia\apps\web
if not exist ".next\BUILD_ID" (
    echo     Building production ^(60-90 sec^)...
    call pnpm build
)
start "TANAVIA Frontend" cmd /k "cd /d F:\Tanavia\apps\web && pnpm start"
timeout /t 5 /nobreak >nul
echo     Frontend started
echo.

timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo  READY!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:4000
echo ========================================
echo.
echo Press any key to close
pause >nul
