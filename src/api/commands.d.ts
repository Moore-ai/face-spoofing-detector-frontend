/**
 * Tauri命令声明
 * Rust后端接口类型定义
 */

import type {
  SingleModeRequest,
  FusionModeRequest,
} from "../types";

import type {
  AsyncTaskResponse,
  ActivateRequest,
  ActivateResponse,
  HistoryQueryResponse,
  HistoryStatsResponse,
  HistoryDeleteResponse,
  HistoryDeleteParams,
  ShortcutConfig,
  HistoryAllResponse,
} from "./tauri";

declare global {
  interface Window {
    __TAURI__?: {
      invoke: {
        (cmd: "detect_single_mode_async", args: { request: SingleModeRequest; clientId: string; apiKey: string }): Promise<AsyncTaskResponse>;
        (cmd: "detect_fusion_mode_async", args: { request: FusionModeRequest; clientId: string; apiKey: string }): Promise<AsyncTaskResponse>;
        (cmd: "get_supported_formats"): Promise<string[]>;
        (cmd: "validate_image", args: { imagePath: string }): Promise<boolean>;
        (cmd: "connect_websocket", args: { apiKey: string }): Promise<string>;
        (cmd: "get_ws_status"): Promise<[string | null, boolean]>;
        (cmd: "activate_license", args: { request: ActivateRequest }): Promise<ActivateResponse>;
        (cmd: "query_history", args: { params: Record<string, string> }): Promise<HistoryQueryResponse>;
        (cmd: "get_all_history"): Promise<HistoryAllResponse>;
        (cmd: "get_history_stats", args: { params?: Record<string, string> }): Promise<HistoryStatsResponse>;
        (cmd: "delete_history", args: { params: HistoryDeleteParams }): Promise<HistoryDeleteResponse>;
        (cmd: "get_shortcuts_config"): Promise<ShortcutConfig>;
        (cmd: "save_shortcuts_config_command", args: { config: ShortcutConfig }): Promise<void>;
        (cmd: "store_api_key", args: { apiKey: string }): Promise<void>;
        (cmd: "retrieve_api_key"): Promise<string | null>;
        (cmd: "delete_api_key"): Promise<void>;
      };
    };
  }
}

export {};