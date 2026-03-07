/**
 * 全局类型定义
 * 人脸活体检测项目 - 前端类型系统
 */

// 检测模式类型
export type DetectionMode = "single" | "fusion";

// 单模态类型
export type ModalityType = "rgb" | "ir";

// 检测结果类型
export type LivenessResult = "real" | "fake" | "error";

// 检测状态
export type DetectionStatus = "idle" | "connecting" | "detecting" | "success" | "error";

// 单张图片信息
export interface ImageInfo {
  id: string;
  file: File;
  preview: string;
  modality: ModalityType;
}

// 检测请求 - 单模态
export interface SingleModeRequest {
  mode: "single";
  modality: ModalityType;
  images: string[];
}

// 检测请求 - 融合模式
export interface FusionModeRequest {
  mode: "fusion";
  pairs: Array<{
    rgb: string;
    ir: string;
  }>;
}

// 单个检测结果
export interface DetectionResultItem {
  id: string;
  result: LivenessResult;
  confidence: number;
  timestamp: string;
  processingTime: number;
  errorMessage?: string;
  imageIndex?: number;  // 图片在批次中的索引（从后端返回）
}

// 批量检测结果
export interface BatchDetectionResult {
  results: DetectionResultItem[];
  totalCount: number;
  realCount: number;
  fakeCount: number;
  averageConfidence: number;
}

// 组件通用 Props
export interface BaseProps {
  className?: string;
}

// 用户 WebSocket 状态
export interface UserState {
  clientId: string | null;
  taskId: string | null;
  isConnected: boolean;
  progress: number;
  completedResults: DetectionResultItem[];
}

// WebSocket 进度消息
export interface WsProgressMessage {
  type: "progress" | "task_completed" | "task_failed";
  data: {
    task_id: string;
    status?: string;
    message?: string;
    result?: {
      mode: string;
      result: string;
      confidence: number;
      probabilities: number[];
      processing_time: number;
    };
    total_items?: number;
    processed_items?: number;
  };
}

// ===== 快捷键相关类型 =====

/**
 * 快捷键动作类型
 */
export type ShortcutActionId = "start_detection" | "cancel_task" | "reset";

/**
 * 快捷键配置接口
 */
export interface ShortcutConfig {
  start_detection: string;  // 开始检测
  cancel_task: string;      // 取消任务
  reset: string;            // 清空重置
}

/**
 * 快捷键录入项
 */
export interface ShortcutBinding {
  actionId: ShortcutActionId;
  label: string;
  shortcut: string;
}

/**
 * 快捷键验证结果
 */
export interface ShortcutValidationResult {
  valid: boolean;
  error?: string;
}

// ===== 历史记录相关类型 =====

/**
 * 历史检测结果项
 */
export interface HistoryResultItem {
  mode: string;
  modality?: string;        // "rgb", "ir" 或 null
  result: string;           // "real", "fake", "error"
  confidence: number;
  probabilities: number[];  // [real_prob, fake_prob]
  processingTime: number;   // 毫秒
  imageIndex?: number;      // 批次中的索引
  error?: string;           // 错误信息
  retryCount?: number;      // 重试次数
}

/**
 * 历史任务项
 */
export interface HistoryTaskItem {
  taskId: string;
  clientId?: string;
  mode: string;             // "single" 或 "fusion"
  status: string;           // "completed", "partial_failure", "failed"
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  realCount: number;
  fakeCount: number;
  elapsedTimeMs: number;
  createdAt: string;        // ISO 8601
  completedAt?: string;     // ISO 8601
  results?: HistoryResultItem[];
}

/**
 * 历史记录查询响应
 */
export interface HistoryQueryResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: HistoryTaskItem[];
}

/**
 * 获取所有历史记录响应（无分页）
 */
export interface HistoryAllResponse {
  total: number;
  apiKeyHash: string;
  items: HistoryTaskItem[];
}

/**
 * 历史统计信息响应
 */
export interface HistoryStatsResponse {
  totalTasks: number;
  totalInferences: number;
  totalReal: number;
  totalFake: number;
  totalErrors: number;
  successRate: number;
  avgProcessingTimeMs: number;
  dateRange?: {
    start: string;
    end: string;
  };
}
