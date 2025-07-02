@echo off
chcp 65001 >nul

cd /d "%~dp0.."

echo ========================================
echo IT資產管理系統 - 伺服器關閉腳本
echo ========================================
echo.

echo [1/3] 檢查是否有 Node.js 程序正在運行...
tasklist /fi "imagename eq node.exe" 2>nul | find /i "node.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ 發現 Node.js 程序正在運行
    echo.
    echo [2/3] 正在關閉 Node.js 伺服器...
    taskkill /f /im node.exe >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Node.js 伺服器已成功關閉
    ) else (
        echo ❌ 關閉 Node.js 伺服器失敗
    )
) else (
    echo ℹ️  沒有發現 Node.js 程序正在運行
)

echo.
echo [3/3] 檢查埠號 3000 是否已釋放...
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  埠號 3000 仍被佔用，嘗試強制關閉...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo 正在關閉 PID: %%a
        taskkill /f /pid %%a >nul 2>&1
    )
    echo ✅ 埠號 3000 已釋放
) else (
    echo ✅ 埠號 3000 未被佔用
)

echo.
echo ========================================
echo 🛑 伺服器關閉程序完成
echo ========================================
echo.
echo 如果仍有問題，請手動檢查：
echo 1. 開啟工作管理員
echo 2. 尋找 node.exe 程序
echo 3. 右鍵選擇「結束工作」
echo.
pause 