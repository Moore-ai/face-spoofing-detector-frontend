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

应用配置位于 `src-tauri/config/config.yaml`：

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

- 修改支持格式需同时更新前端验证和后端配置
- 配置文件通过 `ConfigState` 在 Rust 中共享

## Key Conventions

- **CSS**: Use `@import "tailwindcss"` in v4
- **Tauri**: Invoke via `invoke("command_name", args)`
- **Images**: Support drag-drop and click upload, max 50 files
- **Types**: All shared types in `src/types/index.ts`
- **External links**: Use `rel="noopener noreferrer"`
