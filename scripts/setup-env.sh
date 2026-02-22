#!/bin/bash
# ============================================
# 人脸活体检测系统 - macOS/Linux 环境配置脚本
# ============================================
# 功能:
#   1. 检查 Node.js、Rust 等依赖
#   2. 创建并配置 .env 文件
#   3. 安装前端依赖
#   4. 检查 Python 后端服务
# ============================================

set -e

echo "============================================"
echo "  人脸活体检测系统 - 环境配置向导 (macOS/Linux)"
echo "============================================"
echo ""

# --- 检查 Node.js ---
echo "[1/6] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] 未检测到 Node.js，请先安装 Node.js 18+"
    echo "        macOS: brew install node"
    echo "        Linux: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
NODE_VERSION=$(node -v)
echo "      Node.js: $NODE_VERSION - OK"
echo ""

# --- 检查 npm ---
echo "[2/6] 检查 npm..."
if ! command -v npm &> /dev/null; then
    echo "[ERROR] 未检测到 npm"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo "      npm: $NPM_VERSION - OK"
echo ""

# --- 检查 Rust ---
echo "[3/6] 检查 Rust..."
if ! command -v cargo &> /dev/null; then
    echo "[ERROR] 未检测到 Rust，请先安装 Rust 1.70+"
    echo "        安装命令：curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi
RUST_VERSION=$(cargo --version | awk '{print $2}')
echo "      Rust: $RUST_VERSION - OK"
echo ""

# --- 检查 Python ---
echo "[4/6] 检查 Python..."
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[WARNING] 未检测到 Python，后端检测服务可能无法运行"
    echo "          如需运行检测功能，请安装 Python 3.8+"
    echo "          macOS: brew install python@3.11"
    echo "          Linux: sudo apt-get install python3"
else
    PYTHON_CMD=""
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    fi

    if [ -n "$PYTHON_CMD" ]; then
        PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
        echo "      Python: $PYTHON_VERSION - OK"
    fi
fi
echo ""

# --- 检查 Tauri 依赖 (Linux only) ---
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "[4.5/6] 检查 Tauri 依赖 (Linux)..."
    TAURI_DEPS=("libgtk-3-dev" "libwebkit2gtk-4.0-dev" "libappindicator3-dev" "librsvg2-dev" "libssl-dev")
    MISSING_DEPS=()

    for dep in "${TAURI_DEPS[@]}"; do
        if ! dpkg -l | grep -q "$dep"; then
            MISSING_DEPS+=("$dep")
        fi
    done

    if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
        echo "      缺失依赖：${MISSING_DEPS[*]}"
        echo "      安装命令：sudo apt-get install ${MISSING_DEPS[*]}"
    else
        echo "      Tauri 依赖 - OK"
    fi
    echo ""
fi

# --- 配置 .env 文件 ---
echo "[5/6] 配置环境变量..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$PROJECT_DIR/.env" ]; then
    echo "      .env 文件已存在，跳过创建"
else
    echo "      创建 .env 文件..."

    cat > "$PROJECT_DIR/.env" << EOF
# 人脸活体检测系统 - 环境变量配置
# 项目绝对路径
PROJECT_PATH=$PROJECT_DIR

# 后端 API 基础地址
API_BASE_URL=http://localhost:8000
EOF

    echo "      .env 文件已创建"
    echo "      PROJECT_PATH=$PROJECT_DIR"
fi
echo ""

# --- 安装前端依赖 ---
echo "[6/6] 安装前端依赖..."
if [ -d "$PROJECT_DIR/node_modules" ]; then
    echo "      node_modules 已存在，如需重新安装请手动删除后运行 npm install"
    echo "      跳过依赖安装"
else
    echo "      正在安装依赖..."
    cd "$PROJECT_DIR"
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] 依赖安装失败"
        exit 1
    fi
    echo "      依赖安装完成"
fi
echo ""

echo "============================================"
echo "  环境配置完成!"
echo "============================================"
echo ""
echo "下一步操作:"
echo "  1. 确保 Python 后端服务已启动 (端口 8000)"
echo "  2. 运行 npm run tauri dev 启动应用"
echo ""
