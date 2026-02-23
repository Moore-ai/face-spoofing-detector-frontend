/**
 * 组件统一导出
 * 按功能分类组织
 */

// Layout 组件
export { ActivityBar } from "./layout/ActivityBar";
export type { NavItemId, NavItem, ActivityBarProps } from "./layout/ActivityBar";
export { Header } from "./layout/Header";

// UI 组件
export { ConfidenceBar } from "./ui/ConfidenceBar";

// Detection 相关组件
export { ModeSelector } from "./detection/ModeSelector";
export type { MODE_OPTIONS } from "./detection/ModeSelector";
export { ImageUploader } from "./detection/ImageUploader";
export { DetectionCard } from "./detection/DetectionCard";
export { ResultPanel } from "./detection/ResultPanel";
export { LoadingState, EmptyState, ResultsView } from "./detection/ResultPanelStates";
