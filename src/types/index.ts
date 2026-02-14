/**
 * 全局类型定义
 * 人脸活体检测项目 - 前端类型系统
 */

// 检测模式类型
export type DetectionMode = "single" | "fusion";

// 单模态类型
export type ModalityType = "rgb" | "ir";

// 检测结果类型
export type LivenessResult = "real" | "fake";

// 检测状态
export type DetectionStatus = "idle" | "detecting" | "success" | "error";

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
  images: string[]; // base64编码的图片
}

// 检测请求 - 融合模式
export interface FusionModeRequest {
  mode: "fusion";
  pairs: Array<{
    rgb: string; // base64编码的RGB图像
    ir: string; // base64编码的IR图像
  }>;
}

// 单个检测结果
export interface DetectionResultItem {
  id: string;
  result: LivenessResult;
  confidence: number;
  timestamp: string;
  processingTime: number; // 毫秒
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
