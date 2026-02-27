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

// 组件通用Props
export interface BaseProps {
  className?: string;
}

// 用户WebSocket状态
export interface UserState {
  clientId: string | null;
  taskId: string | null;
  isConnected: boolean;
  progress: number;
  completedResults: DetectionResultItem[];
}

// WebSocket进度消息
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
