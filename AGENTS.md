# AGENTS.md - Coding Guidelines for Frontend

## Project Overview

Tauri + React + TypeScript desktop application with Rust backend.

- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4
- **Backend**: Rust with Tauri v2

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
# Install testing libraries (recommended)
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom

# Run tests once configured
npx vitest               # Run all tests
npx vitest run <pattern> # Run tests matching pattern
npx vitest --ui          # Run with UI
```

## Code Style Guidelines

### TypeScript/React (Frontend)

**Imports**:
- Group imports: React, third-party, internal, styles
- Use named imports for React hooks: `import { useState, useEffect } from 'react'`
- Use `@tauri-apps/api/core` for invoking Rust commands

**Formatting**:
- 2-space indentation
- Double quotes for strings
- Semicolons required
- Max line length: 100 characters

**Types**:
- Enable strict TypeScript mode (already configured)
- Always define prop interfaces for components
- Use explicit return types for exported functions
- Prefer `type` over `interface` for object shapes

**Naming Conventions**:
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Functions/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Hooks: prefix with `use` (e.g., `useAuth`)
- CSS classes: kebab-case

**Error Handling**:
- Use try/catch for async operations
- Always handle Promise rejections from Tauri commands
- Use type assertions with null checks for DOM elements

**React Patterns**:
- Prefer functional components with hooks
- Use `React.StrictMode` in development
- Handle form submissions with `e.preventDefault()`
- Use `useState` and `useEffect` appropriately

### Rust (Backend)

**Naming**:
- Functions/variables: snake_case
- Types/traits: PascalCase
- Constants: SCREAMING_SNAKE_CASE

**Error Handling**:
- Use `.expect()` only for unrecoverable errors in main
- Return `Result<T, E>` for fallible operations
- Use `?` operator for error propagation

**Tauri Commands**:
- Mark with `#[tauri::command]`
- Keep parameter types simple (String, &str, primitives)
- Return serializable types

## Project Structure

```
src/
├── App.tsx          # Main React component
├── App.css          # Component styles
├── main.tsx         # Entry point
├── assets/          # Static assets
└── vite-env.d.ts    # Vite type declarations

src-tauri/
├── src/
│   ├── main.rs      # Application entry
│   └── lib.rs       # Tauri commands and setup
├── Cargo.toml       # Rust dependencies
└── tauri.conf.json  # Tauri configuration
```

## Key Conventions

- Use Tailwind CSS utility classes for styling
- Invoke Rust commands via `invoke('command_name', args)`
- Dark mode supported via `prefers-color-scheme` media query
- All external links should use `rel="noopener noreferrer"`
