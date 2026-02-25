import { ActivateRequest } from './tauri';
/**
 * Tauri命令声明
 * Rust后端接口定义
 */

import type {
  SingleModeRequest,
  FusionModeRequest,
  BatchDetectionResult,
} from "../types";

import type {
  RustBatchDetectionResult,
  RustAsyncTaskResponse,
  RustTaskStatusResponse,
  ActivateRequest,
  ActivateResponse,
} from "./tauri"

declare global {
  interface Window {
    __TAURI__: {
      invoke: {
        (cmd: "detect_single_mode", args: { request: SingleModeRequest }): Promise<RustBatchDetectionResult>;
        (cmd: "detect_fusion_mode", args: { request: FusionModeRequest }): Promise<RustBatchDetectionResult>;
        (cmd: "detect_single_mode_async", args: { request: SingleModeRequest; clientId: string }): Promise<RustAsyncTaskResponse>;
        (cmd: "detect_fusion_mode_async", args: { request: FusionModeRequest; clientId: string }): Promise<RustAsyncTaskResponse>;
        (cmd: "get_supported_formats"): Promise<string[]>;
        (cmd: "validate_image", args: { imagePath: string }): Promise<boolean>;
        (cmd: "connect_websocket"): Promise<string>;
        (cmd: "get_task_status", args: { taskId: string }): Promise<RustTaskStatusResponse>;
        (cmd: "activate_license", args: { request: ActivateRequest }): Promise<ActivateResponse>;
      };
    };
  }
}

export {};
