#!/bin/bash

# 脚本：跨平台端口占用清理工具
# 支持 macOS、Linux 和 Windows (Git Bash/WSL)

# 默认端口 1420，允许通过参数指定
PORT="${1:-1420}"

# 颜色输出（如果终端支持）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  端口 $PORT 进程终止工具"
echo "========================================"
echo ""

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos" ;;
        Linux*)     echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)          echo "unknown" ;;
    esac
}

OS=$(detect_os)

# 查找占用端口的 PID
find_pid() {
    local pid=""
    case "$OS" in
        macos)
            pid=$(lsof -i :"$PORT" -t 2>/dev/null | head -1)
            ;;
        linux)
            pid=$(ss -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | grep -oP 'pid=\K[0-9]+' | head -1)
            if [ -z "$pid" ]; then
                pid=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1 | head -1)
            fi
            ;;
        windows)
            # Windows Git Bash: 使用 netstat 找 PID
            pid=$(netstat -ano 2>/dev/null | grep ":$PORT " | grep "LISTENING" | awk '{print $5}' | head -1)
            ;;
    esac
    echo "$pid"
}

# 获取进程信息
get_process_info() {
    local pid=$1
    case "$OS" in
        macos|linux)
            ps -p "$pid" -o pid,command 2>/dev/null
            ;;
        windows)
            echo "PID: $pid (任务管理器查看详情)"
            ;;
    esac
}

# 终止进程
kill_process() {
    local pid=$1
    case "$OS" in
        macos|linux)
            kill -9 "$pid" 2>/dev/null
            ;;
        windows)
            # Windows Git Bash 下使用 taskkill
            taskkill //F //PID "$pid" 2>/dev/null
            ;;
    esac
}

# 主流程
echo "[查找] 正在查找占用端口 $PORT 的进程..."

PID=$(find_pid)

if [ -z "$PID" ]; then
    echo -e "${GREEN}[信息]${NC} 端口 $PORT 未被占用"
    echo -e "${GREEN}[完成]${NC} 操作成功"
    exit 0
fi

echo -e "${YELLOW}[发现]${NC} 进程 PID: $PID"
echo ""
echo "[进程] 进程详情："
get_process_info "$PID"
echo ""

# 交互式确认
read -p "确定要强制终止此进程吗？(y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[取消]${NC} 用户取消操作"
    exit 0
fi

echo ""
echo "[终止] 强制终止进程..."

kill_process "$PID"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}[成功]${NC} 端口 $PORT 已释放"
    echo -e "${GREEN}[完成]${NC} 操作成功"
else
    echo -e "${RED}[错误]${NC} 终止进程失败"
    echo -e "${YELLOW}[提示]${NC} 请尝试以管理员/root 身份运行此脚本"
    exit 1
fi
