@echo off
chcp 65001 >nul

cd /d "%~dp0.."

:: 建立 log 資料夾
if not exist "log" mkdir log

:: 設定日誌檔案名稱（按日期時間）
for /f "tokens=1-6 delims=/:. " %%a in ('echo %date% %time%') do (
    set LOG_DATE=%%a%%b%%c
    set LOG_TIME=%%d%%e%%f
)
set LOG_FILE=log\server_%LOG_DATE%_%LOG_TIME%.log

:: 開始記錄日誌
echo ======================================== >> "!LOG_FILE!"
echo IT資產管理系統 - 伺服器啟動日誌 >> "!LOG_FILE!"
echo 啟動時間: %date% %time% >> "!LOG_FILE!"
echo ======================================== >> "!LOG_FILE!"
echo. >> "!LOG_FILE!"

:: 同時顯示在螢幕和寫入日誌
echo ========================================
echo IT資產管理系統 - 伺服器啟動腳本
echo 日誌檔案: !LOG_FILE!
echo ========================================
echo.

echo ======================================== >> "!LOG_FILE!"
echo IT資產管理系統 - 伺服器啟動腳本 >> "!LOG_FILE!"
echo 日誌檔案: !LOG_FILE! >> "!LOG_FILE!"
echo ======================================== >> "!LOG_FILE!"
echo. >> "!LOG_FILE!"

:: 檢查 Node.js 是否安裝
echo [1/5] 檢查 Node.js 安裝狀態...
echo [1/5] 檢查 Node.js 安裝狀態... >> "!LOG_FILE!"
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤：未找到 Node.js
    echo ❌ 錯誤：未找到 Node.js >> "!LOG_FILE!"
    echo.
    echo 請先安裝 Node.js：
    echo 1. 前往 https://nodejs.org/
    echo 2. 下載並安裝 LTS 版本
    echo 3. 重新執行此腳本
    echo.
    echo. >> "!LOG_FILE!"
    echo 請先安裝 Node.js： >> "!LOG_FILE!"
    echo 1. 前往 https://nodejs.org/ >> "!LOG_FILE!"
    echo 2. 下載並安裝 LTS 版本 >> "!LOG_FILE!"
    echo 3. 重新執行此腳本 >> "!LOG_FILE!"
    echo. >> "!LOG_FILE!"
    pause
    exit /b 1
) else (
    echo ✅ Node.js 已安裝：
    echo ✅ Node.js 已安裝： >> "!LOG_FILE!"
    node --version
    node --version >> "!LOG_FILE!" 2>&1
)

:: 檢查 npm 是否可用
echo.
echo [2/5] 檢查 npm 可用性...
echo. >> "!LOG_FILE!"
echo [2/5] 檢查 npm 可用性... >> "!LOG_FILE!"
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 錯誤：npm 不可用
    echo ❌ 錯誤：npm 不可用 >> "!LOG_FILE!"
    echo 請檢查 Node.js 安裝是否完整
    echo 請檢查 Node.js 安裝是否完整 >> "!LOG_FILE!"
    pause
    exit /b 1
) else (
    echo ✅ npm 可用：
    echo ✅ npm 可用： >> "!LOG_FILE!"
    npm --version
    npm --version >> "!LOG_FILE!" 2>&1
)


:: 檢查 node_modules 是否存在
echo.
echo [3/5] 檢查套件安裝狀態...
echo. >> "!LOG_FILE!"
echo [3/5] 檢查套件安裝狀態... >> "!LOG_FILE!"
if not exist "node_modules" (
    echo ⚠️  未找到 node_modules 資料夾
    echo 📦 開始安裝必要套件...
    echo ⚠️  未找到 node_modules 資料夾 >> "!LOG_FILE!"
    echo 📦 開始安裝必要套件... >> "!LOG_FILE!"
    npm install >> "!LOG_FILE!" 2>&1
    if %errorlevel% neq 0 (
        echo ❌ 套件安裝失敗
        echo ❌ 套件安裝失敗 >> "!LOG_FILE!"
        echo 請檢查網路連線或手動執行：npm install
        echo 請檢查網路連線或手動執行：npm install >> "!LOG_FILE!"
        pause
        exit /b 1
    )
    echo ✅ 套件安裝完成
    echo ✅ 套件安裝完成 >> "!LOG_FILE!"
) else (
    echo ✅ node_modules 資料夾存在
    echo ✅ node_modules 資料夾存在 >> "!LOG_FILE!"
)

:: 檢查 package-lock.json 是否存在
if not exist "package-lock.json" (
    echo ⚠️  未找到 package-lock.json
    echo 📦 重新安裝套件以確保版本一致...
    echo ⚠️  未找到 package-lock.json >> "!LOG_FILE!"
    echo 📦 重新安裝套件以確保版本一致... >> "!LOG_FILE!"
    npm install >> "!LOG_FILE!" 2>&1
    if %errorlevel% neq 0 (
        echo ❌ 套件重新安裝失敗
        echo ❌ 套件重新安裝失敗 >> "!LOG_FILE!"
        pause
        exit /b 1
    )
    echo ✅ 套件重新安裝完成
    echo ✅ 套件重新安裝完成 >> "!LOG_FILE!"
)

:: 檢查必要檔案是否存在
echo.
echo [4/5] 檢查必要檔案...
echo. >> "!LOG_FILE!"
echo [4/5] 檢查必要檔案... >> "!LOG_FILE!"
if not exist "config.json" (
    echo ❌ 錯誤：未找到 config.json
    echo ❌ 錯誤：未找到 config.json >> "!LOG_FILE!"
    echo 請確認資料庫連線設定檔案存在
    echo 請確認資料庫連線設定檔案存在 >> "!LOG_FILE!"
    pause
    exit /b 1
)
if not exist "server.js" (
    echo ❌ 錯誤：未找到 server.js
    echo ❌ 錯誤：未找到 server.js >> "!LOG_FILE!"
    echo 請確認伺服器檔案存在
    echo 請確認伺服器檔案存在 >> "!LOG_FILE!"
    pause
    exit /b 1
)
if not exist "init_or_check_db.js" (
    echo ❌ 錯誤：未找到 init_or_check_db.js
    echo ❌ 錯誤：未找到 init_or_check_db.js >> "!LOG_FILE!"
    echo 請確認資料庫初始化檔案存在
    echo 請確認資料庫初始化檔案存在 >> "!LOG_FILE!"
    pause
    exit /b 1
)
echo ✅ 所有必要檔案存在
echo ✅ 所有必要檔案存在 >> "!LOG_FILE!"

:: 初始化資料庫
echo.
echo [5/5] 初始化資料庫...
echo. >> "!LOG_FILE!"
echo [5/5] 初始化資料庫... >> "!LOG_FILE!"
node init_or_check_db.js >> "!LOG_FILE!" 2>&1
if %errorlevel% neq 0 (
    echo ❌ 資料庫初始化失敗
    echo ❌ 資料庫初始化失敗 >> "!LOG_FILE!"
    echo.
    echo 可能的問題：
    echo 1. 資料庫伺服器未啟動
    echo 2. config.json 中的連線設定錯誤
    echo 3. 資料庫帳號權限不足
    echo.
    echo 請檢查 config.json 中的設定：
    echo - server: 資料庫伺服器位址
    echo - database: 資料庫名稱
    echo - user: 資料庫使用者名稱
    echo - password: 資料庫密碼
    echo.
    echo. >> "!LOG_FILE!"
    echo 可能的問題： >> "!LOG_FILE!"
    echo 1. 資料庫伺服器未啟動 >> "!LOG_FILE!"
    echo 2. config.json 中的連線設定錯誤 >> "!LOG_FILE!"
    echo 3. 資料庫帳號權限不足 >> "!LOG_FILE!"
    echo. >> "!LOG_FILE!"
    echo 請檢查 config.json 中的設定： >> "!LOG_FILE!"
    echo - server: 資料庫伺服器位址 >> "!LOG_FILE!"
    echo - database: 資料庫名稱 >> "!LOG_FILE!"
    echo - user: 資料庫使用者名稱 >> "!LOG_FILE!"
    echo - password: 資料庫密碼 >> "!LOG_FILE!"
    echo. >> "!LOG_FILE!"
    pause
    exit /b 1
)
echo ✅ 資料庫初始化完成
echo ✅ 資料庫初始化完成 >> "!LOG_FILE!"

:: 啟動伺服器
echo.
echo ========================================
echo 🚀 啟動 IT資產管理系統伺服器...
echo ========================================
echo 伺服器將在 http://localhost:3000 啟動
echo 按 Ctrl+C 可停止伺服器
echo 日誌檔案: !LOG_FILE!
echo.
echo. >> "!LOG_FILE!"
echo ======================================== >> "!LOG_FILE!"
echo 🚀 啟動 IT資產管理系統伺服器... >> "!LOG_FILE!"
echo ======================================== >> "!LOG_FILE!"
echo 伺服器將在 http://localhost:3000 啟動 >> "!LOG_FILE!"
echo 按 Ctrl+C 可停止伺服器 >> "!LOG_FILE!"
echo 日誌檔案: !LOG_FILE! >> "!LOG_FILE!"
echo. >> "!LOG_FILE!"

:: 記錄伺服器啟動時間
echo 伺服器啟動時間: %date% %time% >> "!LOG_FILE!"
echo ======================================== >> "!LOG_FILE!"

:: 啟動伺服器並記錄所有輸出
node server.js >> "!LOG_FILE!" 2>&1

:: 記錄伺服器結束時間
echo. >> "!LOG_FILE%"
echo ======================================== >> "!LOG_FILE%"
echo 伺服器結束時間: %date% %time% >> "!LOG_FILE%"

:: 如果伺服器異常結束
if %errorlevel% neq 0 (
    echo.
    echo ❌ 伺服器異常結束
    echo 錯誤代碼：%errorlevel%
    echo 詳細錯誤請查看日誌檔案: !LOG_FILE!
    echo.
    echo 可能的問題：
    echo 1. 埠號 3000 已被佔用
    echo 2. 資料庫連線中斷
    echo 3. 程式碼錯誤
    echo.
    echo. >> "!LOG_FILE!"
    echo ❌ 伺服器異常結束 >> "!LOG_FILE!"
    echo 錯誤代碼：%errorlevel% >> "!LOG_FILE!"
    echo. >> "!LOG_FILE!"
    echo 可能的問題： >> "!LOG_FILE!"
    echo 1. 埠號 3000 已被佔用 >> "!LOG_FILE!"
    echo 2. 資料庫連線中斷 >> "!LOG_FILE!"
    echo 3. 程式碼錯誤 >> "!LOG_FILE!"
    echo. >> "!LOG_FILE!"
    pause
    exit /b %errorlevel%
)

echo. >> "!LOG_FILE!"
echo 伺服器正常結束 >> "!LOG_FILE!"

endlocal
pause
