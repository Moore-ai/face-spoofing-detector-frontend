/**
 * Tauri命令接口
 * 与Rust后端通信的API封装
 */

// import { invoke } from "@tauri-apps/api/core";
import type {
  SingleModeRequest,
  FusionModeRequest,
  BatchDetectionResult,
} from "../types";

/**
 * 单模态活体检测
 * @param request 单模态检测请求
 * @returns 批量检测结果
 */
export async function detectSingleMode(
  request: SingleModeRequest
): Promise<BatchDetectionResult> {
  // TODO: 实际调用Tauri命令
  // return await invoke("detect_single_mode", { request });

  // 模拟返回值
  return {
    results: request.images.map((_, index) => ({
      id: `img_${index}_${Date.now()}`,
      result: Math.random() > 0.5 ? "real" : "fake",
      confidence: Math.random() * 0.4 + 0.6,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 500) + 100,
    })),
    totalCount: request.images.length,
    realCount: Math.floor(request.images.length / 2),
    fakeCount: Math.ceil(request.images.length / 2),
    averageConfidence: 0.85,
  };
}

/**
 * 融合模式活体检测
 * @param request 融合模式检测请求
 * @returns 批量检测结果
 */
export async function detectFusionMode(
  request: FusionModeRequest
): Promise<BatchDetectionResult> {
  // TODO: 实际调用Tauri命令
  // return await invoke("detect_fusion_mode", { request });

  // 模拟返回值
  return {
    results: request.pairs.map((_, index) => ({
      id: `fusion_${index}_${Date.now()}`,
      result: Math.random() > 0.3 ? "real" : "fake",
      confidence: Math.random() * 0.3 + 0.7,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 800) + 200,
    })),
    totalCount: request.pairs.length,
    realCount: Math.floor(request.pairs.length * 0.7),
    fakeCount: Math.ceil(request.pairs.length * 0.3),
    averageConfidence: 0.92,
  };
}

/**
 * 批量检测（通用接口）
 * @param imagePaths 图片路径数组
 * @param mode 检测模式
 * @returns 批量检测结果
 */
export async function batchDetect(
  imagePaths: string[],
  _mode: "single" | "fusion"
): Promise<BatchDetectionResult> {
  // TODO: 实际调用Tauri命令
  // return await invoke("batch_detect", { imagePaths, mode });

  // 模拟返回值
  return {
    results: imagePaths.map((_, index) => ({
      id: `batch_${index}_${Date.now()}`,
      result: Math.random() > 0.4 ? "real" : "fake",
      confidence: Math.random() * 0.35 + 0.65,
      timestamp: new Date().toISOString(),
      processingTime: Math.floor(Math.random() * 600) + 150,
    })),
    totalCount: imagePaths.length,
    realCount: Math.floor(imagePaths.length * 0.6),
    fakeCount: Math.ceil(imagePaths.length * 0.4),
    averageConfidence: 0.88,
  };
}

/**
 * 获取支持的图片格式
 * @returns 支持的文件扩展名数组
 */
export async function getSupportedFormats(): Promise<string[]> {
  // TODO: 实际调用Tauri命令
  // return await invoke("get_supported_formats");

  return ["jpg", "jpeg", "png", "bmp", "webp"];
}

/**
 * 验证图片有效性
 * @param imagePath 图片路径
 * @returns 是否有效
 */
export async function validateImage(_imagePath: string): Promise<boolean> {
  // TODO: 实际调用Tauri命令
  // return await invoke("validate_image", { imagePath });

  return true;
}
