#!/usr/bin/env node
/**
 * 人脸活体检测系统 - 跨平台环境配置脚本
 *
 * 功能：
 * 1. 检查 Node.js、Rust 等依赖
 * 2. 创建并配置 .env 文件
 * 3. 安装前端依赖
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { platform } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = dirname(__dirname);

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return null;
  }
}

function checkCommand(command) {
  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// 获取操作系统类型
function getOS() {
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  return 'Linux';
}

// 检查 Node.js
function checkNode() {
  log('[1/6] 检查 Node.js...', 'cyan');
  const version = runCommand('node -v');
  if (!version) {
    log('[ERROR] 未检测到 Node.js，请先安装 Node.js 18+', 'red');
    log('        下载地址：https://nodejs.org/', 'yellow');
    return false;
  }
  log(`      Node.js: ${version} - OK`, 'green');
  return true;
}

// 检查 npm
function checkNpm() {
  log('[2/6] 检查 npm...', 'cyan');
  const version = runCommand('npm -v');
  if (!version) {
    log('[ERROR] 未检测到 npm', 'red');
    return false;
  }
  log(`      npm: ${version} - OK`, 'green');
  return true;
}

// 检查 Rust
function checkRust() {
  log('[3/6] 检查 Rust...', 'cyan');
  const version = runCommand('cargo --version');
  if (!version) {
    log('[ERROR] 未检测到 Rust，请先安装 Rust 1.70+', 'red');
    log('        安装地址：https://www.rust-lang.org/tools/install', 'yellow');
    return false;
  }
  const rustVersion = version.split(' ')[1];
  log(`      Rust: ${rustVersion} - OK`, 'green');
  return true;
}

// 检查 Python
function checkPython() {
  log('[4/6] 检查 Python...', 'cyan');
  let version = runCommand('python3 --version');
  if (!version) {
    version = runCommand('python --version');
  }
  if (!version) {
    log('[WARNING] 未检测到 Python，后端检测服务可能无法运行', 'yellow');
    log('          如需运行检测功能，请安装 Python 3.8+', 'yellow');
  } else {
    log(`      Python: ${version} - OK`, 'green');
  }
  return true;
}

// 检查 Tauri 依赖（Linux only）
function checkTauriDeps() {
  if (getOS() !== 'Linux') return true;

  log('[4.5/6] 检查 Tauri 依赖 (Linux)...', 'cyan');
  const deps = ['libgtk-3-dev', 'libwebkit2gtk-4.0-dev', 'libappindicator3-dev', 'librsvg2-dev'];
  const missing = [];

  for (const dep of deps) {
    if (!checkCommand(`dpkg -l | grep -q "${dep}"`)) {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    log(`      缺失依赖：${missing.join(', ')}`, 'yellow');
    log(`      安装命令：sudo apt-get install ${missing.join(' ')}`, 'yellow');
  } else {
    log('      Tauri 依赖 - OK', 'green');
  }
  return true;
}

// 配置 .env 文件
function setupEnv() {
  log('[5/6] 配置环境变量...', 'cyan');

  const envPath = join(PROJECT_DIR, '.env');

  if (existsSync(envPath)) {
    log('      .env 文件已存在，跳过创建', 'yellow');
    return true;
  }

  // 格式化路径（Windows 需要双反斜杠）
  let projectPath = PROJECT_DIR;
  if (getOS() === 'Windows') {
    projectPath = projectPath.replace(/\\/g, '\\\\');
  }

  const envContent = `# 人脸活体检测系统 - 环境变量配置
# 项目绝对路径
PROJECT_PATH=${projectPath}

# 后端 API 基础地址
API_BASE_URL=http://localhost:8000
`;

  writeFileSync(envPath, envContent, 'utf-8');
  log('      .env 文件已创建', 'green');
  log(`      PROJECT_PATH=${PROJECT_DIR}`, 'cyan');
  return true;
}

// 安装依赖
function installDeps() {
  log('[6/6] 安装前端依赖...', 'cyan');

  const nodeModulesPath = join(PROJECT_DIR, 'node_modules');

  if (existsSync(nodeModulesPath)) {
    log('      node_modules 已存在，如需重新安装请手动删除后运行 npm install', 'yellow');
    log('      跳过依赖安装', 'yellow');
    return true;
  }

  log('      正在安装依赖...', 'cyan');
  try {
    execSync('npm install', {
      cwd: PROJECT_DIR,
      stdio: 'inherit',
      encoding: 'utf-8'
    });
    log('      依赖安装完成', 'green');
    return true;
  } catch (error) {
    log('[ERROR] 依赖安装失败', 'red');
    return false;
  }
}

// 主函数
function main() {
  const os = getOS();

  log('============================================', 'bright');
  log(`  人脸活体检测系统 - 环境配置向导 (${os})`, 'bright');
  log('============================================', 'bright');
  log('');

  // 检查依赖
  if (!checkNode()) process.exit(1);
  if (!checkNpm()) process.exit(1);
  if (!checkRust()) process.exit(1);
  checkPython();
  checkTauriDeps();

  log('', 'reset');

  // 配置环境
  setupEnv();
  log('', 'reset');

  // 安装依赖
  installDeps();
  log('', 'reset');

  log('============================================', 'bright');
  log('  环境配置完成!', 'bright', 'green');
  log('============================================', 'bright');
  log('');
  log('下一步操作:', 'cyan');
  log('  1. 确保 Python 后端服务已启动 (端口 8000)', 'yellow');
  log('  2. 运行 npm run tauri dev 启动应用', 'yellow');
  log('');
}

main();
