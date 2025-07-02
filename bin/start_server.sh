#!/bin/bash

cd "$(dirname "$0")/.."

# 設定 UTF-8 編碼
export LANG=zh_TW.UTF-8
export LC_ALL=zh_TW.UTF-8

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 建立 log 目錄
mkdir -p log

# 設定日誌檔案名稱（按日期時間）
LOG_DATE=$(date +%Y%m%d)
LOG_TIME=$(date +%H%M%S)
LOG_FILE="log/server_${LOG_DATE}_${LOG_TIME}.log"

# 日誌函數
log_message() {
    echo "$1" | tee -a "$LOG_FILE"
}

# 開始記錄日誌
log_message "========================================"
log_message "IT資產管理系統 - 伺服器啟動日誌"
log_message "啟動時間: $(date)"
log_message "========================================"
log_message ""

echo -e "${BLUE}========================================"
echo -e "IT資產管理系統 - 伺服器啟動腳本"
echo -e "日誌檔案: $LOG_FILE"
echo -e "========================================${NC}"
echo ""

log_message "========================================"
log_message "IT資產管理系統 - 伺服器啟動腳本"
log_message "日誌檔案: $LOG_FILE"
log_message "========================================"
log_message ""

# 檢查 Node.js 是否安裝
echo -e "${YELLOW}[1/5] 檢查 Node.js 安裝狀態...${NC}"
log_message "[1/5] 檢查 Node.js 安裝狀態..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 錯誤：未找到 Node.js${NC}"
    log_message "❌ 錯誤：未找到 Node.js"
    echo ""
    echo "請先安裝 Node.js："
    echo "1. 使用套件管理器安裝："
    echo "   Ubuntu/Debian: sudo apt update && sudo apt install nodejs npm"
    echo "   CentOS/RHEL: sudo yum install nodejs npm"
    echo "   Arch Linux: sudo pacman -S nodejs npm"
    echo "2. 或前往 https://nodejs.org/ 下載"
    echo "3. 重新執行此腳本"
    echo ""
    log_message "請先安裝 Node.js"
    log_message "1. 使用套件管理器安裝"
    log_message "2. 或前往 https://nodejs.org/ 下載"
    log_message "3. 重新執行此腳本"
    log_message ""
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js 已安裝：$NODE_VERSION${NC}"
    log_message "✅ Node.js 已安裝：$NODE_VERSION"
fi

# 檢查 npm 是否可用
echo ""
echo -e "${YELLOW}[2/5] 檢查 npm 可用性...${NC}"
log_message ""
log_message "[2/5] 檢查 npm 可用性..."

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 錯誤：npm 不可用${NC}"
    log_message "❌ 錯誤：npm 不可用"
    echo "請檢查 Node.js 安裝是否完整"
    log_message "請檢查 Node.js 安裝是否完整"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm 可用：$NPM_VERSION${NC}"
    log_message "✅ npm 可用：$NPM_VERSION"
fi

# 檢查 node_modules 是否存在
echo ""
echo -e "${YELLOW}[3/5] 檢查套件安裝狀態...${NC}"
log_message ""
log_message "[3/5] 檢查套件安裝狀態..."

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  未找到 node_modules 目錄${NC}"
    echo -e "${BLUE}📦 開始安裝必要套件...${NC}"
    log_message "⚠️  未找到 node_modules 目錄"
    log_message "📦 開始安裝必要套件..."
    
    if npm install >> "$LOG_FILE" 2>&1; then
        echo -e "${GREEN}✅ 套件安裝完成${NC}"
        log_message "✅ 套件安裝完成"
    else
        echo -e "${RED}❌ 套件安裝失敗${NC}"
        log_message "❌ 套件安裝失敗"
        echo "請檢查網路連線或手動執行：npm install"
        log_message "請檢查網路連線或手動執行：npm install"
        exit 1
    fi
else
    echo -e "${GREEN}✅ node_modules 目錄存在${NC}"
    log_message "✅ node_modules 目錄存在"
fi

# 檢查 package-lock.json 是否存在（確保套件版本一致）
if [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}⚠️  未找到 package-lock.json${NC}"
    echo -e "${BLUE}📦 重新安裝套件以確保版本一致...${NC}"
    log_message "⚠️  未找到 package-lock.json"
    log_message "📦 重新安裝套件以確保版本一致..."
    
    if npm install >> "$LOG_FILE" 2>&1; then
        echo -e "${GREEN}✅ 套件重新安裝完成${NC}"
        log_message "✅ 套件重新安裝完成"
    else
        echo -e "${RED}❌ 套件重新安裝失敗${NC}"
        log_message "❌ 套件重新安裝失敗"
        exit 1
    fi
fi

# 檢查必要檔案是否存在
echo ""
echo -e "${YELLOW}[4/5] 檢查必要檔案...${NC}"
log_message ""
log_message "[4/5] 檢查必要檔案..."

if [ ! -f "config.json" ]; then
    echo -e "${RED}❌ 錯誤：未找到 config.json${NC}"
    log_message "❌ 錯誤：未找到 config.json"
    echo "請確認資料庫連線設定檔案存在"
    log_message "請確認資料庫連線設定檔案存在"
    exit 1
fi

if [ ! -f "server.js" ]; then
    echo -e "${RED}❌ 錯誤：未找到 server.js${NC}"
    log_message "❌ 錯誤：未找到 server.js"
    echo "請確認伺服器檔案存在"
    log_message "請確認伺服器檔案存在"
    exit 1
fi

if [ ! -f "init_or_check_db.js" ]; then
    echo -e "${RED}❌ 錯誤：未找到 init_or_check_db.js${NC}"
    log_message "❌ 錯誤：未找到 init_or_check_db.js"
    echo "請確認資料庫初始化檔案存在"
    log_message "請確認資料庫初始化檔案存在"
    exit 1
fi

echo -e "${GREEN}✅ 所有必要檔案存在${NC}"
log_message "✅ 所有必要檔案存在"

# 初始化資料庫
echo ""
echo -e "${YELLOW}[5/5] 初始化資料庫...${NC}"
log_message ""
log_message "[5/5] 初始化資料庫..."

if node init_or_check_db.js >> "$LOG_FILE" 2>&1; then
    echo -e "${GREEN}✅ 資料庫初始化完成${NC}"
    log_message "✅ 資料庫初始化完成"
else
    echo -e "${RED}❌ 資料庫初始化失敗${NC}"
    log_message "❌ 資料庫初始化失敗"
    echo ""
    echo "可能的問題："
    echo "1. 資料庫伺服器未啟動"
    echo "2. config.json 中的連線設定錯誤"
    echo "3. 資料庫帳號權限不足"
    echo ""
    echo "請檢查 config.json 中的設定："
    echo "- server: 資料庫伺服器位址"
    echo "- database: 資料庫名稱"
    echo "- user: 資料庫使用者名稱"
    echo "- password: 資料庫密碼"
    echo ""
    log_message "可能的問題："
    log_message "1. 資料庫伺服器未啟動"
    log_message "2. config.json 中的連線設定錯誤"
    log_message "3. 資料庫帳號權限不足"
    log_message ""
    log_message "請檢查 config.json 中的設定："
    log_message "- server: 資料庫伺服器位址"
    log_message "- database: 資料庫名稱"
    log_message "- user: 資料庫使用者名稱"
    log_message "- password: 資料庫密碼"
    log_message ""
    exit 1
fi

# 啟動伺服器
echo ""
echo -e "${BLUE}========================================"
echo -e "🚀 啟動 IT資產管理系統伺服器..."
echo -e "========================================${NC}"
echo -e "伺服器將在 ${GREEN}http://localhost:3000${NC} 啟動"
echo -e "按 ${YELLOW}Ctrl+C${NC} 可停止伺服器"
echo -e "日誌檔案: ${BLUE}$LOG_FILE${NC}"
echo ""

log_message ""
log_message "========================================"
log_message "🚀 啟動 IT資產管理系統伺服器..."
log_message "========================================"
log_message "伺服器將在 http://localhost:3000 啟動"
log_message "按 Ctrl+C 可停止伺服器"
log_message "日誌檔案: $LOG_FILE"
log_message ""

# 記錄伺服器啟動時間
log_message "伺服器啟動時間: $(date)"
log_message "========================================"

# 啟動伺服器並記錄所有輸出
if node server.js >> "$LOG_FILE" 2>&1; then
    # 記錄伺服器正常結束時間
    log_message ""
    log_message "========================================"
    log_message "伺服器正常結束時間: $(date)"
    log_message "伺服器正常結束"
else
    # 記錄伺服器異常結束時間
    log_message ""
    log_message "========================================"
    log_message "伺服器異常結束時間: $(date)"
    log_message "❌ 伺服器異常結束"
    log_message "錯誤代碼：$?"
    log_message ""
    log_message "可能的問題："
    log_message "1. 埠號 3000 已被佔用"
    log_message "2. 資料庫連線中斷"
    log_message "3. 程式碼錯誤"
    log_message ""
    
    echo ""
    echo -e "${RED}❌ 伺服器異常結束${NC}"
    echo -e "錯誤代碼：$?"
    echo -e "詳細錯誤請查看日誌檔案: ${BLUE}$LOG_FILE${NC}"
    echo ""
    echo "可能的問題："
    echo "1. 埠號 3000 已被佔用"
    echo "2. 資料庫連線中斷"
    echo "3. 程式碼錯誤"
    echo ""
    exit $?
fi 