@echo off
chcp 65001 >nul

cd /d "%~dp0.."

echo [1] 檢查 Node.js...
node --version || (echo 未安裝 Node.js & pause & exit /b 1)
echo.

echo [2] 檢查 npm...
npm --version || (echo 未安裝 npm & pause & exit /b 1)
echo.

echo [3] 啟動伺服器...
node server.js

echo 伺服器已結束
pause 