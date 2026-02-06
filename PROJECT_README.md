# 人脸活体检测系统 - 前端

基于 Tauri + React + TypeScript 开发的人脸活体检测桌面应用前端。

## 功能特性

- **双模式检测**：支持单模态（RGB/IR）和融合模式（RGB+IR）
- **批量处理**：可一次性上传多张图片进行检测
- **实时预览**：上传图片即时预览，支持拖拽上传
- **结果可视化**：置信度条形图、统计面板、详细结果卡片
- **响应式设计**：适配不同屏幕尺寸

## 项目结构

```
src/
├── api/                    # Tauri接口
│   ├── tauri.ts           # API函数封装
│   └── commands.d.ts      # 命令类型声明
├── components/            # React组件
│   ├── ModeSelector.tsx   # 模式选择器
│   ├── ImageUploader.tsx  # 图片上传器
│   ├── ConfidenceBar.tsx  # 置信度条
│   ├── DetectionCard.tsx  # 检测结果卡片
│   ├── ResultPanel.tsx    # 结果面板
│   ├── Header.tsx         # 头部组件
│   └── index.ts           # 组件导出
├── hooks/                 # 自定义Hooks
│   └── useDetection.ts    # 检测状态管理
├── types/                 # 类型定义
│   └── index.ts           # 全局类型
├── App.tsx               # 主应用组件
├── App.css               # 全局样式
└── main.tsx              # 入口文件

src-tauri/
└── src/
    └── lib.rs            # Rust后端命令实现
```

## 使用说明

1. 选择检测模式（单模态/融合）
2. 上传图片（支持点击上传和拖拽上传）
3. 点击"开始检测"按钮
4. 查看检测结果和统计数据

## 开发命令

```bash
# 启动开发服务器
npm run tauri dev

# 构建生产版本
npm run tauri build
```

## 技术栈

- **前端框架**: React 19
- **语言**: TypeScript 5.9
- **构建工具**: Vite 7
- **桌面框架**: Tauri v2
- **样式**: Tailwind CSS 4
- **后端**: Rust
