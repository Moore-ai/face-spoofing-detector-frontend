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
  BatchDetectionResult,
  DetectionResultItem,
} from "../types";

const isTauri = () => {
  return typeof window !== "undefined" && "__TAURI__" in window;
};

// ===== Rust 返回类型 =====

export interface RustDetectionResultItem {
  id: string;
  result: "real" | "fake";
  confidence: number;
  timestamp: string;
  processing_time: number;
}

export interface RustBatchDetectionResult {
  results: RustDetectionResultItem[];
  total_count: number;
  real_count: number;
  fake_count: number;
  average_confidence: number;
}

export interface RustTaskDetectionResultItem {
  mode: string;
  result: string;
  confidence: number;
  probabilities: number[];
  processing_time: number;
}

export interface RustAsyncTaskResponse {
  task_id: string;
  message: string;
}

// ===== WebSocket 事件类型 =====

export interface WsEventMessage {
  event_type: string;
  task_id: string;
  status: string | null;
  message: string | null;
  result: RustTaskDetectionResultItem | null;
  total_items: number | null;
  processed_items: number | null;
  completed_results: RustTaskDetectionResultItem[] | null;
}

export interface WsConnectionState {
  client_id: string | null;
  is_connected: boolean;
}

// ===== 类型转换 =====

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

// ===== 导出类型 =====

export interface AsyncTaskResponse {
  taskId: string;
  message: string;
}

export interface TaskDetectionResultItem {
  mode: string;
  result: string;
  confidence: number;
  probabilities: number[];
  processingTime: number;
}

// ===== API 函数 =====

export async function detectSingleMode(
  request: SingleModeRequest
): Promise<BatchDetectionResult> {
  if (!isTauri()) {
    throw new Error("请使用 Tauri 模式运行: npm run tauri dev");
  }
  const result = await invoke<RustBatchDetectionResult>("detect_single_mode", {
    request,
  });
  return convertResult(result);
}

export async function detectFusionMode(
  request: FusionModeRequest
): Promise<BatchDetectionResult> {
  if (!isTauri()) {
    throw new Error("请使用 Tauri 模式运行: npm run tauri dev");
  }
  const result = await invoke<RustBatchDetectionResult>("detect_fusion_mode", {
    request,
  });
  return convertResult(result);
}

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

export async function connectWebsocket(): Promise<string> {
  if (!isTauri()) {
    throw new Error("请使用 Tauri 模式运行: npm run tauri dev");
  }
  return await invoke<string>("connect_websocket");
}

export async function getWsStatus(): Promise<WsConnectionState> {
  if (!isTauri()) {
    return { client_id: null, is_connected: false };
  }
  const result = await invoke<[string | null, boolean]>("get_ws_status");
  return { client_id: result[0], is_connected: result[1] };
}

export async function detectSingleModeAsync(
  request: SingleModeRequest,
  clientId: string
): Promise<AsyncTaskResponse> {
  if (!isTauri()) {
    throw new Error("请使用 Tauri 模式运行: npm run tauri dev");
  }
  const result = await invoke<RustAsyncTaskResponse>("detect_single_mode_async", {
    request,
    clientId,
  });
  return {
    taskId: result.task_id,
    message: result.message,
  };
}

export async function detectFusionModeAsync(
  request: FusionModeRequest,
  clientId: string
): Promise<AsyncTaskResponse> {
  if (!isTauri()) {
    throw new Error("请使用 Tauri 模式运行: npm run tauri dev");
  }
  const result = await invoke<RustAsyncTaskResponse>("detect_fusion_mode_async", {
    request,
    clientId,
  });
  return {
    taskId: result.task_id,
    message: result.message,
  };
}

// ===== WebSocket 事件监听 =====

export type ProgressCallback = (event: WsEventMessage) => void;

export async function listenWsProgress(callback: ProgressCallback): Promise<UnlistenFn> {
  return await listen<WsEventMessage>("ws_progress", (event: Event<WsEventMessage>) => {
    callback(event.payload);
  });
}

export async function listenWsTaskCompleted(callback: ProgressCallback): Promise<UnlistenFn> {
  return await listen<WsEventMessage>("ws_task_completed", (event: Event<WsEventMessage>) => {
    callback(event.payload);
  });
}

export async function listenWsTaskFailed(callback: ProgressCallback): Promise<UnlistenFn> {
  return await listen<WsEventMessage>("ws_task_failed", (event: Event<WsEventMessage>) => {
    callback(event.payload);
  });
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
