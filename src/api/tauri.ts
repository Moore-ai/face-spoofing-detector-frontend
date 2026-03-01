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

// ===== 历史记录 API =====

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

export interface HistoryQueryResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: HistoryTaskItem[];
}

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

export interface HistoryQueryParams {
  clientId?: string;
  mode?: string;
  status?: string;          // 逗号分隔的列表，如 "completed,partial_failure"
  days?: number;            // 最近 N 天的记录
  page?: number;            // 页码（默认 1）
  pageSize?: number;        // 每页数量（默认 20，最大 100）
}

export interface HistoryStatsParams {
  clientId?: string;
  mode?: string;
  status?: string;
  days?: number;
}

export interface HistoryDeleteParams {
  taskIds?: string[];       // 要删除的任务 ID 列表
  daysAgo?: number;         // 删除早于 N 天的记录
}

export interface HistoryDeleteResponse {
  success: boolean;
  message: string;
}

/**
 * 获取存储的 API Key
 */
function getApiKey(): string {
  return localStorage.getItem("api_key") || "";
}

/**
 * 查询历史记录
 */
export async function queryHistory(params: HistoryQueryParams): Promise<HistoryQueryResponse> {
  if (!isTauri()) {
    // 开发模式：返回模拟数据
    console.log("[History API] 开发模式，返回模拟数据", params);
    const mockItems: HistoryTaskItem[] = Array.from({ length: params.pageSize || 20 }, (_, i) => ({
      taskId: `task_${Date.now()}_${i}`,
      clientId: "client_001",
      mode: i % 2 === 0 ? "single" : "fusion",
      status: i % 5 === 0 ? "failed" : i % 3 === 0 ? "partial_failure" : "completed",
      totalItems: 2,
      successfulItems: i % 5 === 0 ? 1 : 2,
      failedItems: i % 5 === 0 ? 1 : 0,
      realCount: i % 3 === 0 ? 0 : 1,
      fakeCount: i % 3 === 0 ? 2 : 1,
      elapsedTimeMs: 1000 + i * 100,
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      completedAt: new Date(Date.now() - i * 86400000 + 2000).toISOString(),
      results: [],
    }));
    return {
      total: 100,
      page: params.page || 1,
      pageSize: params.pageSize || 20,
      totalPages: 5,
      items: mockItems,
    };
  }

  // 构建查询参数对象
  const queryParams: Record<string, string> = {};
  if (params.clientId) queryParams.clientId = params.clientId;
  if (params.mode) queryParams.mode = params.mode;
  if (params.status) queryParams.status = params.status;
  if (params.days) queryParams.days = params.days.toString();
  if (params.page) queryParams.page = params.page.toString();
  if (params.pageSize) queryParams.pageSize = params.pageSize.toString();

  const apiKey = getApiKey();
  console.log("[History API] queryHistory 调用 Rust，params:", queryParams, "apiKey:", apiKey ? "存在" : "空");
  const result = await invoke<HistoryQueryResponse>("query_history", {
    params: queryParams,
    apiKey,
  });
  console.log("[History API] queryHistory 返回结果:", result);
  return result;
}

/**
 * 获取历史统计信息
 */
export async function getHistoryStats(params?: HistoryStatsParams): Promise<HistoryStatsResponse> {
  if (!isTauri()) {
    // 开发模式：返回模拟数据
    console.log("[History API] 开发模式，返回模拟统计", params);
    return {
      totalTasks: 128,
      totalInferences: 256,
      totalReal: 180,
      totalFake: 50,
      totalErrors: 26,
      successRate: 0.9,
      avgProcessingTimeMs: 1234,
      dateRange: {
        start: new Date(Date.now() - 30 * 86400000).toISOString(),
        end: new Date().toISOString(),
      },
    };
  }

  const queryParams: Record<string, string> = {};
  if (params?.clientId) queryParams.clientId = params.clientId;
  if (params?.mode) queryParams.mode = params.mode;
  if (params?.status) queryParams.status = params.status;
  if (params?.days) queryParams.days = params.days.toString();

  const apiKey = getApiKey();
  console.log("[History API] getHistoryStats 调用 Rust，params:", queryParams, "apiKey:", apiKey ? "存在" : "空");
  return await invoke<HistoryStatsResponse>("get_history_stats", {
    params: queryParams,
    apiKey,
  });
}

/**
 * 删除历史记录
 */
export async function deleteHistory(params: HistoryDeleteParams): Promise<HistoryDeleteResponse> {
  if (!isTauri()) {
    console.log("[History API] 开发模式，模拟删除", params);
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, message: "删除成功（模拟）" };
  }

  const apiKey = getApiKey();
  return await invoke<HistoryDeleteResponse>("delete_history", {
    params,
    apiKey,
  });
}