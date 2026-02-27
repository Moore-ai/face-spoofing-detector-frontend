/**
 * Tauri命令接口
 * 与Rust后端通信的API封装
 */

import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { Event } from "@tauri-apps/api/event";
import type {
  SingleModeRequest,
  FusionModeRequest,
} from "../types";

const isTauri = () => {
  return window.__TAURI__ !== undefined;
};

// ===== Rust 返回类型 =====

export interface RustTaskDetectionResultItem {
  mode: string;
  result: string;
  confidence: number;
  probabilities: number[];
  processingTime: number;
  error?: string;  // 错误信息（当 result 为"error"时）
  imageIndex?: number;  // 图片在批次中的索引
}

export interface RustAsyncTaskResponse {
  task_id: string;
  message: string;
}

// ===== WebSocket 事件类型 =====

export interface WsEventMessage {
  eventType: string;
  taskId: string;
  status: string | null;
  message: string | null;
  result: RustTaskDetectionResultItem | null;
  totalItems: number | null;
  processedItems: number | null;
  completedResults: RustTaskDetectionResultItem[] | null;
}

export interface WsConnectionState {
  clientId: string | null;
  isConnected: boolean;
}

// ===== 导出类型 =====

export interface AsyncTaskResponse {
  task_id: string;
  message: string;
}

export interface TaskDetectionResultItem {
  mode: string;
  result: string;
  confidence: number;
  probabilities: number[];
  processingTime: number;
  error?: string;  // 错误信息（当 result 为"error"时）
  imageIndex?: number;  // 图片在批次中的索引
}

// ===== API 函数 =====

export async function getSupportedFormats(): Promise<string[]> {
  if (!isTauri()) {
    return ["jpg", "jpeg", "png", "bmp", "webp"];
  }
  return await invoke<string[]>("get_supported_formats");
}

export async function validateImage(imagePath: string): Promise<boolean> {
  if (!isTauri()) {
    return true;
  }
  return await invoke<boolean>("validate_image", { imagePath });
}

export async function connectWebsocket(apiKey: string): Promise<string> {
  if (!isTauri()) {
    throw new Error("请使用 Tauri 模式运行: npm run tauri dev");
  }
  return await invoke<string>("connect_websocket", { apiKey });
}

export async function getWsStatus(): Promise<WsConnectionState> {
  if (!isTauri()) {
    return { clientId: null, isConnected: false };
  }
  const result = await invoke<[string | null, boolean]>("get_ws_status");
  return { clientId: result[0], isConnected: result[1] };
}

export async function detectSingleModeAsync(
  request: SingleModeRequest,
  clientId: string,
  apiKey: string
): Promise<AsyncTaskResponse> {
  if (!isTauri()) {
    throw new Error("请使用 Tauri 模式运行: npm run tauri dev");
  }
  return await invoke<AsyncTaskResponse>("detect_single_mode_async", {
    request,
    clientId,
    apiKey,
  });
}

export async function detectFusionModeAsync(
  request: FusionModeRequest,
  clientId: string,
  apiKey: string
): Promise<AsyncTaskResponse> {
  if (!isTauri()) {
    throw new Error("请使用 Tauri 模式运行: npm run tauri dev");
  }
  return await invoke<AsyncTaskResponse>("detect_fusion_mode_async", {
    request,
    clientId,
    apiKey,
  });
}

// ===== WebSocket 事件监听 =====

export type ProgressCallback = (event: WsEventMessage) => void;

export async function listenWsProgress(callback: ProgressCallback): Promise<UnlistenFn> {
  console.log("[Tauri API] 注册 ws_progress 事件监听器");
  const unlisten = await listen<WsEventMessage>("ws_progress", (event: Event<WsEventMessage>) => {
    console.log("[Tauri API] 收到 ws_progress 事件:", event.payload);
    callback(event.payload);
  });
  console.log("[Tauri API] ws_progress 监听器注册成功");
  return unlisten;
}

export async function listenWsTaskCompleted(callback: ProgressCallback): Promise<UnlistenFn> {
  console.log("[Tauri API] 注册 ws_task_completed 事件监听器");
  const unlisten = await listen<WsEventMessage>("ws_task_completed", (event: Event<WsEventMessage>) => {
    console.log("[Tauri API] 收到 ws_task_completed 事件:", event.payload);
    callback(event.payload);
  });
  console.log("[Tauri API] ws_task_completed 监听器注册成功");
  return unlisten;
}

export async function listenWsTaskFailed(callback: ProgressCallback): Promise<UnlistenFn> {
  console.log("[Tauri API] 注册 ws_task_failed 事件监听器");
  const unlisten = await listen<WsEventMessage>("ws_task_failed", (event: Event<WsEventMessage>) => {
    console.log("[Tauri API] 收到 ws_task_failed 事件:", event.payload);
    callback(event.payload);
  });
  console.log("[Tauri API] ws_task_failed 监听器注册成功");
  return unlisten;
}

export async function listenWsConnected(callback: (clientId: string) => void): Promise<UnlistenFn> {
  return await listen<string>("ws_connected", (event: Event<string>) => {
    callback(event.payload);
  });
}

export async function listenWsDisconnected(callback: () => void): Promise<UnlistenFn> {
  return await listen("ws_disconnected", () => {
    callback();
  });
}

// ===== 激活码验证 =====

export interface ActivateRequest {
  activationCode: string;
}

export interface ActivateResponse {
  success: boolean;
  message: string;
  apiKey?: string;
  expiresAt?: string;
}

export async function activateLicense(request: ActivateRequest): Promise<ActivateResponse> {
  if (!isTauri()) {
    // 开发模式：模拟验证
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      success: true,
      message: "激活成功",
      apiKey: "sk_dev_mock_api_key_" + Date.now(),
    };
  }
  return await invoke<ActivateResponse>("activate_license", {
    request,
  });
}