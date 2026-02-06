/**
 * Tauri命令声明
 * Rust后端接口定义
 */

// 单模态检测请求
type SingleModeRequest = {
  mode: "single";
  modality: "rgb" | "ir";
  images: string[]; // base64编码
};

// 融合模式检测请求
type FusionModeRequest = {
  mode: "fusion";
  pairs: Array<{
    rgb: string;
    ir: string;
  }>;
};

// 检测结果项
type DetectionResultItem = {
  id: string;
  result: "real" | "fake";
  confidence: number;
  timestamp: string;
  processingTime: number;
};

// 批量检测结果
type BatchDetectionResult = {
  results: DetectionResultItem[];
  totalCount: number;
  realCount: number;
  fakeCount: number;
  averageConfidence: number;
};

// 声明Tauri命令接口（由Rust端实现）
declare global {
  interface Window {
    __TAURI__: {
      invoke: {
        // 单模态活体检测
        (cmd: "detect_single_mode", args: { request: SingleModeRequest }): Promise<BatchDetectionResult>;
        // 融合模式活体检测
        (cmd: "detect_fusion_mode", args: { request: FusionModeRequest }): Promise<BatchDetectionResult>;
        // 批量检测
        (cmd: "batch_detect", args: { imagePaths: string[]; mode: "single" | "fusion" }): Promise<BatchDetectionResult>;
        // 获取支持的格式
        (cmd: "get_supported_formats"): Promise<string[]>;
        // 验证图片
        (cmd: "validate_image", args: { imagePath: string }): Promise<boolean>;
      };
    };
  }
}

export {};
