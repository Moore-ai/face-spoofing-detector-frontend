# AGENTS.md - Coding Guidelines for Face Liveness Detection Frontend

## Project Overview

人脸活体检测系统前端 - Tauri + React + TypeScript 桌面应用

- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4
- **Backend**: Rust with Tauri v2
- **Features**: 单模态/融合模式检测, 批量图片上传, 实时结果显示

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server on port 1420
npm run tauri dev        # Start Tauri dev mode with hot reload

# Production Build
npm run build            # TypeScript compile + Vite build
npm run tauri build      # Build Tauri application for distribution

# Preview
npm run preview          # Preview production build locally

# Tauri CLI
npm run tauri -- --help  # Show Tauri CLI help
```

## Testing

No test framework is currently configured. To add tests:

```bash
# Install testing libraries
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Run tests
npx vitest               # Run all tests in watch mode
npx vitest run           # Run all tests once
npx vitest run <pattern> # Run specific test file (e.g., "Button")
npx vitest --ui          # Run with UI
```

## Code Style Guidelines

### TypeScript/React (Frontend)

**Imports** (按顺序分组):
1. React imports: `import { useState } from "react"`
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
- Define prop interfaces at component top: `interface ButtonProps extends BaseProps`
- Use explicit return types: `: React.ReactElement`
- Prefer `type` for unions, `interface` for object shapes
- Export types from `src/types/index.ts`

**Naming Conventions**:
- Components: PascalCase (e.g., `ModeSelector.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useDetection.ts`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Types: PascalCase
- CSS classes: kebab-case
- Rust commands: snake_case

**Component Structure**:
```typescript
// 1. Type imports
import type { DetectionMode, BaseProps } from "../types";

// 2. Interface definition
interface ModeSelectorProps extends BaseProps {
  currentMode: DetectionMode;
  onModeChange: (mode: DetectionMode) => void;
}

// 3. JSDoc comment
/**
 * 组件描述
 */

// 4. Component implementation
export function ModeSelector({ ... }: ModeSelectorProps): React.ReactElement {
  // implementation
}
```

**Error Handling**:
- Use try/catch for async Tauri calls
- Always handle Promise rejections
- Display errors in UI with error states
- Prefix unused params with `_`

**React Patterns**:
- Functional components with hooks
- Custom hooks for state management (see `useDetection.ts`)
- `React.StrictMode` in development
- `useCallback` for event handlers

### Rust (Backend)

**Naming**:
- Functions/variables: snake_case
- Types/structs: PascalCase
- Constants: SCREAMING_SNAKE_CASE

**Error Handling**:
- Return `Result<T, String>` for fallible commands
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
│   ├── tauri.ts
│   └── commands.d.ts
├── components/            # React 组件 (每个组件单独文件)
│   ├── ModeSelector.tsx
│   ├── ImageUploader.tsx
│   ├── DetectionCard.tsx
│   ├── ResultPanel.tsx
│   ├── ConfidenceBar.tsx
│   ├── Header.tsx
│   └── index.ts          # 组件统一导出
├── hooks/                 # 自定义 Hooks
│   └── useDetection.ts
├── types/                 # 全局类型定义
│   └── index.ts
├── App.tsx               # 主应用组件
├── App.css               # 全局样式
└── main.tsx              # 入口

src-tauri/
└── src/
    └── lib.rs            # Tauri 命令实现
```

## Key Conventions

- **CSS**: Use `@import "tailwindcss"` in v4 (not @tailwind directives)
- **Tauri**: Invoke via `invoke("command_name", args)`
- **Images**: Support drag-drop and click upload, max 50 files
- **Types**: All shared types in `src/types/index.ts`
- **External links**: Use `rel="noopener noreferrer"`
