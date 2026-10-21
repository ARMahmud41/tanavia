@echo off
title TANAVIA Demo (Production Mode)
color 0A

echo.
echo ========================================
echo  TANAVIA Demo - Production Mode
echo ========================================
echo.

echo [1/4] Checking MySQL service...
sc query XAMPPMySQL | findstr "RUNNING" >nul
if errorlevel 1 (
    echo     Starting MySQL...
    net start XAMPPMySQL
    timeout /t 5 /nobreak >nul
)
echo     MySQL OK
echo.

echo [2/4] Starting Backend...
start "TANAVIA Backend" cmd /k "cd /d F:\Tanavia\apps\api && pnpm dev"
timeout /t 8 /nobreak >nul
echo     Backend started (port 4000)
echo.

echo [3/4] Starting Frontend (production build)...
cd /d F:\Tanavia\apps\web
call pnpm build
start "TANAVIA Frontend" cmd /k "cd /d F:\Tanavia\apps\web && pnpm start"
timeout /t 8 /nobreak >nul
echo     Frontend started (port 3000)
echo.

echo [4/4] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo  READY - Fast Production Mode
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:4000
echo ========================================
echo.
echo Press any key to close (servers stay running)
pause >nul
