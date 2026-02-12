/**
 * Tauri命令接口
 * 与Rust后端通信的API封装
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  SingleModeRequest,
  FusionModeRequest,
  BatchDetectionResult,
  DetectionResultItem,
} from "../types";

// Rust返回的结果类型（使用下划线命名）
interface RustDetectionResultItem {
  id: string;
  result: "real" | "fake";
  confidence: number;
  timestamp: string;
  processing_time: number;
}

interface RustBatchDetectionResult {
  results: RustDetectionResultItem[];
  total_count: number;
  real_count: number;
  fake_count: number;
  average_confidence: number;
}

// 转换Rust结果为前端格式
function convertResult(rustResult: RustBatchDetectionResult): BatchDetectionResult {
  return {
    results: rustResult.results.map((item: RustDetectionResultItem): DetectionResultItem => ({
      id: item.id,
      result: item.result,
      confidence: item.confidence,
      timestamp: item.timestamp,
      processingTime: item.processing_time,
    })),
    totalCount: rustResult.total_count,
    realCount: rustResult.real_count,
    fakeCount: rustResult.fake_count,
    averageConfidence: rustResult.average_confidence,
  };
}

/**
 * 单模态活体检测
 * @param request 单模态检测请求
 * @returns 批量检测结果
 */
export async function detectSingleMode(
  request: SingleModeRequest
): Promise<BatchDetectionResult> {
  const result = await invoke<RustBatchDetectionResult>("detect_single_mode", {
    request,
  });
  return convertResult(result);
}

/**
 * 融合模式活体检测
 * @param request 融合模式检测请求
 * @returns 批量检测结果
 */
export async function detectFusionMode(
  request: FusionModeRequest
): Promise<BatchDetectionResult> {
  const result = await invoke<RustBatchDetectionResult>("detect_fusion_mode", {
    request,
  });
  return convertResult(result);
}

/**
 * 批量检测（通用接口）
 * @param imagePaths 图片路径数组
 * @param mode 检测模式
 * @returns 批量检测结果
 */
export async function batchDetect(
  imagePaths: string[],
  mode: "single" | "fusion"
): Promise<BatchDetectionResult> {
  const result = await invoke<RustBatchDetectionResult>("batch_detect", {
    imagePaths,
    mode,
  });
  return convertResult(result);
}

/**
 * 获取支持的图片格式
 * @returns 支持的文件扩展名数组
 */
export async function getSupportedFormats(): Promise<string[]> {
  return await invoke<string[]>("get_supported_formats");
}

/**
 * 验证图片有效性
 * @param imagePath 图片路径
 * @returns 是否有效
 */
export async function validateImage(imagePath: string): Promise<boolean> {
  return await invoke<boolean>("validate_image", { imagePath });
}
