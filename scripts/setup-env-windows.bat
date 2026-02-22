@echo off
REM ============================================
REM 人脸活体检测系统 - Windows 环境配置脚本
REM ============================================
REM 功能：
REM   1. 检查 Node.js、Rust 等依赖
REM   2. 创建并配置 .env 文件
REM   3. 安装前端依赖
REM   4. 检查 Python 后端服务
REM ============================================

setlocal EnableDelayedExpansion

echo ============================================
echo   人脸活体检测系统 - 环境配置向导 (Windows)
echo ============================================
echo.

REM --- 检查 Node.js ---
echo [1/6] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未检测到 Node.js，请先安装 Node.js 18+
    echo        下载地址：https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo        Node.js: %NODE_VERSION% - OK
echo.

REM --- 检查 npm ---
echo [2/6] 检查 npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未检测到 npm
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo        npm: %NPM_VERSION% - OK
echo.

REM --- 检查 Rust ---
echo [3/6] 检查 Rust...
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未检测到 Rust，请先安装 Rust 1.70+
    echo        下载地址：https://www.rust-lang.org/tools/install
    exit /b 1
)
for /f "tokens=3" %%i in ('cargo --version') do set RUST_VERSION=%%i
echo        Rust: %RUST_VERSION% - OK
echo.

REM --- 检查 Python ---
echo [4/6] 检查 Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] 未检测到 Python，后端检测服务可能无法运行
    echo          如需运行检测功能，请安装 Python 3.8+
    echo          下载地址：https://www.python.org/
) else (
    for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo        Python: %PYTHON_VERSION% - OK
)
echo.

REM --- 配置 .env 文件 ---
echo [5/6] 配置环境变量...
if exist ".env" (
    echo        .env 文件已存在，跳过创建
) else (
    echo        创建 .env 文件...

    REM 获取当前目录的绝对路径
    for %%I in (.) do set PROJECT_DIR=%%~fI
    set PROJECT_DIR_ESCAPED=!PROJECT_DIR:\=\\!

    echo # 人脸活体检测系统 - 环境变量配置 > .env
    echo # 项目绝对路径 >> .env
    echo PROJECT_PATH=!PROJECT_DIR_ESCAPED! >> .env
    echo. >> .env
    echo # 后端 API 基础地址 >> .env
    echo API_BASE_URL=http://localhost:8000 >> .env

    echo        .env 文件已创建
    echo        PROJECT_PATH=!PROJECT_DIR!
)
echo.

REM --- 安装前端依赖 ---
echo [6/6] 安装前端依赖...
if exist "node_modules" (
    echo        node_modules 已存在，如需重新安装请手动删除后运行 npm install
    echo        跳过依赖安装
) else (
    echo        正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] 依赖安装失败
        exit /b 1
    )
    echo        依赖安装完成
)
echo.

echo ============================================
echo   环境配置完成!
echo ============================================
echo.
echo 下一步操作:
echo   1. 确保 Python 后端服务已启动 (端口 8000)
echo   2. 运行 npm run tauri dev 启动应用
echo.

endlocal
exit /b 0
