# AGENTS.md - Coding Guidelines for Face Liveness Detection Frontend

## Project Overview

人脸活体检测系统前端 - Tauri + React + TypeScript 桌面应用

- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4
- **Backend**: Rust with Tauri v2
- **Features**: 单模态/融合模式检测, 批量图片上传, 实时结果显示, YAML配置支持

## Build Commands

### Frontend
```bash
npm run dev              # Start Vite dev server on port 1420
npm run build            # TypeScript compile + Vite build
npm run preview          # Preview production build locally
```

### Tauri
```bash
npm run tauri dev        # Start Tauri dev mode with hot reload
npm run tauri build      # Build Tauri application for distribution
npm run tauri -- --help  # Show Tauri CLI help
```

### Type Checking & Linting
```bash
npx tsc --noEmit         # Type check without emitting files
cd src-tauri && cargo clippy  # Rust linting
```

### Rust Backend
```bash
cd src-tauri
cargo check              # Fast compilation check
cargo build              # Build Rust code
cargo test               # Run all Rust tests
cargo test <name>        # Run specific test by name (e.g., cargo test detect)
```

## Testing

No test framework is currently configured. To add tests:

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom

# Run tests
npx vitest               # Run all tests in watch mode
npx vitest run           # Run all tests once
npx vitest run <pattern> # Run specific test file (e.g., "Button")
```

## Code Style Guidelines

### TypeScript/React (Frontend)

**Imports** (按顺序分组):
1. React imports: `import { useState, useCallback } from "react"`
2. Third-party: `import { invoke } from "@tauri-apps/api/core"`
3. Internal types: `import type { DetectionMode } from "../types"`
4. Internal components/hooks: `import { Header } from "./components"`
5. Styles: `import "./App.css"`

**Formatting**:
- 2-space indentation
- Double quotes for strings
- Semicolons required
- Max line length: 100 characters

**Types**:
- Define prop interfaces at component top, before component
- Use explicit return types: `: React.ReactElement`
- Prefer `type` for unions, `interface` for object shapes
- Export types from `src/types/index.ts`
- Use `BaseProps` interface for common className prop

**Naming**:
- Components: PascalCase (e.g., `ModeSelector.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useDetection`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE for true constants
- Types: PascalCase
- CSS classes: kebab-case
- Rust commands: snake_case

**Error Handling**:
- Use try/catch for async Tauri calls
- Always handle Promise rejections
- Display errors in UI with error states
- Prefix unused params with `_`

**React Patterns**:
- Functional components with hooks
- Custom hooks for state management in `src/hooks/`
- Use `useCallback` for event handlers and passed functions
- Components export as named exports from `src/components/index.ts`

### Rust (Backend)

**Naming**:
- Functions/variables: snake_case
- Types/structs: PascalCase
- Constants: SCREAMING_SNAKE_CASE

**Error Handling**:
- Return `Result<T, String>` for fallible commands
- Use `?` operator for error propagation
- Use `.expect()` only in main

**Tauri Commands**:
```rust
#[tauri::command]
pub async fn detect_single_mode(
    request: SingleModeRequest
) -> Result<BatchDetectionResult, String> {
    // implementation
}
```

## Project Structure

```
.env                      # 环境变量（本地配置，不提交）
.env.example             # 环境变量示例
src/
├── api/                   # Tauri 命令封装
│   ├── tauri.ts          # Tauri invoke 封装
│   └── commands.d.ts     # 命令类型定义
├── components/            # React 组件
│   ├── index.ts          # 统一导出
│   ├── Header.tsx
│   ├── ModeSelector.tsx
│   ├── ImageUploader.tsx
│   ├── ResultPanel.tsx
│   ├── DetectionCard.tsx
│   └── ConfidenceBar.tsx
├── hooks/                 # 自定义 Hooks
│   └── useDetection.ts
├── types/                 # 全局类型定义
│   └── index.ts
├── utils/                 # 工具函数
│   └── imageUtils.ts
├── App.tsx               # 主应用组件
└── main.tsx              # 入口

src-tauri/
└── src/
    ├── main.rs           # 应用入口
    ├── lib.rs            # Tauri 命令注册
    ├── util.rs           # 检测命令实现
    └── config.rs         # 配置管理
```

## Configuration

### 环境变量

项目使用 `.env` 文件存储环境变量：

```bash
# .env 文件位于项目根目录

# 项目绝对路径
PROJECT_PATH=E:\heli_code\frontend  # Windows
PROJECT_PATH=/home/user/project    # macOS/Linux

# 后端API基础地址
API_BASE_URL=http://localhost:8000
```

**注意：**
- `.env` 文件已被 `.gitignore` 排除，不会提交到版本控制
- 首次设置请复制 `.env.example` 为 `.env` 并修改路径
- Rust后端通过 `dotenv` crate 读取环境变量
- `API_BASE_URL` 默认为 `http://localhost:8000`，生产环境请修改为实际地址

### 应用配置

配置文件位于 `src-tauri/config/config.yaml`：

```yaml
image:
  supported_formats:
    - jpg
    - jpeg
    - png
    - bmp
    - webp
  max_file_size_mb: 10
```

**配置路径解析逻辑：**
1. 从 `.env` 读取 `PROJECT_PATH`
2. 拼接路径: `{PROJECT_PATH}/src-tauri/config/config.yaml`
3. 配置文件通过 `ConfigState` 在 Rust 中共享

- 修改支持格式需同时更新前端验证和后端配置

## Key Conventions

- **CSS**: Use `@import "tailwindcss"` in v4
- **Tauri**: Invoke via `invoke("command_name", args)`
- **Images**: Support drag-drop and click upload, max 50 files
- **Types**: All shared types in `src/types/index.ts`
- **External links**: Use `rel="noopener noreferrer"`

## Architecture Details

### 状态管理 (State Management)

所有应用状态集中在 `useDetection` hook：
- **模式**: `mode` - "single" 或 "fusion"
- **图片**: `images` - ImageInfo[] 数组
- **状态**: `status` - "idle" | "detecting" | "success" | "error"
- **结果**: `results` - 批量检测结果
- **错误**: `error` - 错误信息字符串

状态操作：
```typescript
const {
  mode, setMode,
  images, addImages, removeImage, clearImages,
  status, results, error,
  startDetection, reset
} = useDetection();
```

### 数据处理流程

**单模态模式:**
1. 用户上传图片 → `ImageInfo[]`
2. `fileToBase64()` 转换 File → base64（移除 `data:image/xxx;base64,` 前缀）
3. `detectSingleMode()` → Rust → Python后端 `/infer/single`
4. 显示结果

**融合模式:**
1. 按文件名配对：`rgb_XXX.ext` ↔ `ir_XXX.ext`
2. 验证配对完整性（检查未配对图片）
3. 分别转换 RGB 和 IR 图片为 base64
4. `detectFusionMode()` → Rust → Python后端 `/infer/fusion`
5. 显示结果

### 图像配对规则（融合模式）

文件名必须遵循命名规范：
- RGB图片: `rgb_标识符.扩展名`（如 `rgb_001.jpg`）
- IR图片: `ir_标识符.扩展名`（如 `ir_001.png`）
- 标识符必须匹配才能配对

**配对示例:**
```
✓ rgb_001.jpg + ir_001.png  → 配对成功
✓ rgb_002.jpeg + ir_002.jpg → 配对成功（扩展名可以不同）
✗ rgb_001.jpg + ir_002.png  → 配对失败（标识符不匹配）
✗ photo_001.jpg             → 格式错误（缺少rgb/ir前缀）
```

**错误检测:**
- 命名格式不正确的文件
- 缺少对应 IR 的 RGB 图片
- 缺少对应 RGB 的 IR 图片
- 完全无法配对的图片

### 后端API接口

Rust后端转发请求到 Python 服务。API基础地址通过环境变量 `API_BASE_URL` 配置（默认 `http://localhost:8000`）：

| 端点 | 方法 | 描述 |
|-----|------|-----|
| `{API_BASE_URL}/infer/single` | POST | 单模态检测 |
| `{API_BASE_URL}/infer/fusion` | POST | 融合模式检测 |

**请求格式（单模态）:**
```json
{
  "mode": "single",
  "modality": "rgb",
  "images": ["base64string1", "base64string2"]
}
```

**请求格式（融合）:**
```json
{
  "mode": "fusion",
  "pairs": [
    {"rgb": "base64string1", "ir": "base64string2"},
    {"rgb": "base64string3", "ir": "base64string4"}
  ]
}
```

### Tauri Managed State

Rust后端管理的状态（在 `lib.rs` 中初始化）：
- `Client` - reqwest HTTP 客户端（用于调用 Python 后端）
- `ConfigState` - 应用配置（包含支持格式、文件大小限制等）

### CSS设计系统

Apple-inspired 设计，使用 CSS 变量（在 `App.css` :root 中定义）：

**颜色系统:**
- `--color-background`: #f5f5f7（背景）
- `--color-surface`: #ffffff（卡片背景）
- `--color-accent`: #0071e3（主蓝色）
- `--color-success`: #34c759（成功绿）
- `--color-danger`: #ff3b30（危险红）

**间距系统:**
- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 16px
- `--spacing-lg`: 24px
- `--spacing-xl`: 32px

**圆角系统:**
- `--radius-sm`: 8px
- `--radius-md`: 12px
- `--radius-lg`: 16px
- `--radius-full`: 9999px（胶囊形）

### 错误处理模式

**Rust后端:**
```rust
#[tauri::command]
pub async fn command_name() -> Result<T, String> {
    // 使用 ? 传播错误，统一返回 String 错误信息
    operation().map_err(|e| format!("错误描述: {}", e))?;
    Ok(result)
}
```

**前端处理:**
```typescript
try {
  await startDetection();
} catch (err) {
  setError(err instanceof Error ? err.message : "检测失败");
  setStatus("error");
}
```

**错误显示:** 使用 `.error-message` CSS 类显示红色警告框

### 文件验证

检测前自动验证：
1. 调用 `validateImage(imagePath)` 检查文件存在性
2. 检查后缀名是否在 `supported_formats` 列表中
3. 验证失败的文件名将显示在错误信息中

### 工具函数

**`src/utils/imageUtils.ts`:**
- `getModalityFromFilename(filename)` - 从文件名提取模态类型（rgb/ir）

**`src/hooks/useDetection.ts` 内部函数:**
- `fileToBase64(file)` - File 转 base64（自动移除 data URI 前缀）
- `pairImagesByFilename(images)` - 按文件名配对 RGB/IR 图片
