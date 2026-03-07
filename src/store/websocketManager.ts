/**
 * WebSocket 事件管理器
 * 负责注册和管理 WebSocket 事件监听器，并将事件转发到 detectionStore
 */

import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { Event } from '@tauri-apps/api/event';
import { detectionStore } from './detectionStore';
import { historyStore } from './historyStore';
import type { RustTaskDetectionResultItem, WsEventMessage } from '../api/tauri';
import type { DetectionResultItem, HistoryTaskItem } from '../types'

// 存储所有 unlisten 函数
let unlistenFns: UnlistenFn[] = [];
let unlistenConnected: UnlistenFn | null = null;

// 竞态条件处理：跟踪任务是否已完成
let isTaskCompleted = false;

// 等待 clientId 的 resolve 函数
let clientIdResolve: ((id: string) => void) | null = null;

/**
 * 将 Rust 结果转换为 DetectionResultItem
 */
function convertResult(
  result: RustTaskDetectionResultItem,
  processedItems: number,
  taskId: string
): DetectionResultItem {
  return {
    id: `${taskId}_${processedItems}`,
    result: result.result as 'real' | 'fake' | 'error',
    confidence: result.confidence,
    timestamp: new Date().toISOString(),
    processingTime: result.processingTime,
    errorMessage:
      result.result === 'error'
        ? result.error || '推理失败'
        : undefined,
    imageIndex: result.imageIndex,
  };
}

/**
 * 注册进度监听器（每次检测前调用）
 */
export async function registerProgressListeners(): Promise<void> {
  console.log('[WebSocket] 注册进度监听器');

  // 清理旧的监听器
  cleanupProgressListeners();

  // 重置任务完成标记
  isTaskCompleted = false;

  const unlistenProgress = await listen<WsEventMessage>(
    'ws_progress',
    (event: Event<WsEventMessage>) => {
      const wsMsg = event.payload;
      console.log('[WebSocket] 收到 ws_progress 事件:', wsMsg);

      // 更新进度
      if (wsMsg.processedItems !== null && wsMsg.totalItems !== null) {
        const progress = Math.round(
          (wsMsg.processedItems / wsMsg.totalItems) * 100
        );
        detectionStore.setState({ progress });
      }

      // 添加结果
      if (wsMsg.result) {
        const result = convertResult(
          wsMsg.result,
          wsMsg.processedItems || 0,
          wsMsg.taskId
        );
        detectionStore.getState().updateProgress(result);
      }

      if (wsMsg.message) {
        console.log('进度:', wsMsg.message);
      }
    }
  );

  const unlistenCompleted = await listen<WsEventMessage>(
    'ws_task_completed',
    (event: Event<WsEventMessage>) => {
      const wsMsg = event.payload;
      console.log('[WebSocket] 收到 ws_task_completed 事件:', wsMsg);
      console.log('[WebSocket] taskId:', wsMsg.taskId);
      console.log('[WebSocket] status:', wsMsg.status);

      // 标记任务已完成
      isTaskCompleted = true;

      if (wsMsg.status === 'cancelled') {
        console.log('[WebSocket] 任务已取消');
        detectionStore.getState().setTaskCompleted('cancelled');
      } else {
        console.log('[WebSocket] 任务完成');
        detectionStore.getState().setTaskCompleted('completed');

        // 任务完成后，从 detectionStore 获取已收集的检测结果，添加到历史记录 store
        const completedResults = detectionStore.getState().completedResults;
        if (completedResults.length > 0) {
          // 从结果中提取 mode
          const mode = completedResults[0]?.result === 'error' ? 'single' : 'single';

          const historyItem: HistoryTaskItem = {
            taskId: wsMsg.taskId,
            mode,
            status: wsMsg.status || 'completed',
            totalItems: completedResults.length,
            successfulItems: completedResults.filter(r => r.result !== 'error').length,
            failedItems: completedResults.filter(r => r.result === 'error').length,
            realCount: completedResults.filter(r => r.result === 'real').length,
            fakeCount: completedResults.filter(r => r.result === 'fake').length,
            elapsedTimeMs: completedResults.reduce((sum, r) => sum + r.processingTime, 0),
            createdAt: completedResults[0]?.timestamp || new Date().toISOString(),
            completedAt: new Date().toISOString(),
            results: completedResults.map((r) => ({
              mode,
              modality: undefined,
              result: r.result,
              confidence: r.confidence,
              probabilities: [],
              processingTime: r.processingTime,
              imageIndex: r.imageIndex,
              error: r.errorMessage,
            })),
          };
          historyStore.getState().addHistory(historyItem);
        } else {
          console.log('[WebSocket] 没有已完成的结果，跳过添加历史记录');
        }
      }
    }
  );

  const unlistenFailed = await listen<WsEventMessage>(
    'ws_task_failed',
    (event: Event<WsEventMessage>) => {
      const wsMsg = event.payload;
      console.log('[WebSocket] 收到 ws_task_failed 事件:', wsMsg);

      detectionStore.getState().setTaskFailed(wsMsg.message || '检测失败');
    }
  );

  unlistenFns = [unlistenProgress, unlistenCompleted, unlistenFailed];
  console.log('[WebSocket] 进度监听器注册完成');
}

/**
 * 清理进度监听器（检测完成/取消时调用）
 */
export function cleanupProgressListeners(): void {
  console.log('[WebSocket] 清理进度监听器');
  unlistenFns.forEach((fn) => fn());
  unlistenFns = [];
}

/**
 * 注册 WebSocket 连接监听器（应用启动时调用一次）
 */
export async function registerConnectionListener(): Promise<void> {
  console.log('[WebSocket] 注册连接监听器');

  if (unlistenConnected) {
    unlistenConnected();
  }

  unlistenConnected = await listen<string>('ws_connected', (event: Event<string>) => {
    const clientId = event.payload;
    console.log('[WebSocket] 收到 ws_connected 事件，clientId:', clientId);

    // 更新 store 中的 clientId
    detectionStore.getState().setClientId(clientId);

    // 如果有等待的 resolve 函数，立即 resolve
    if (clientIdResolve) {
      console.log('[WebSocket] 发现等待的 clientIdResolve，立即 resolve');
      clientIdResolve(clientId);
      clientIdResolve = null;
    } else {
      console.log('[WebSocket] clientIdResolve 为空， clientId 已存储到 store 中');
    }
  });

  console.log('[WebSocket] 连接监听器注册完成');
}

/**
 * 清理所有监听器（应用卸载时调用）
 */
export function cleanupAllListeners(): void {
  cleanupProgressListeners();
  if (unlistenConnected) {
    unlistenConnected();
    unlistenConnected = null;
  }
}

/**
 * 等待 clientId（用于首次连接）
 */
export function waitForClientId(): Promise<string> {
  console.log('[WebSocket] waitForClientId 被调用，等待 ws_connected 事件...');

  // 先检查 store 中是否已经有 clientId 了（避免竞态条件）
  const existingClientId = detectionStore.getState().clientId;
  if (existingClientId) {
    console.log('[WebSocket] store 中已有 clientId:', existingClientId, '直接返回');
    return Promise.resolve(existingClientId);
  }

  return new Promise((resolve) => {
    clientIdResolve = resolve;
    // 添加超时保护，避免无限等待
    setTimeout(() => {
      if (clientIdResolve) {
        console.error('[WebSocket] 等待 clientId 超时（10 秒），请检查后端服务是否正常运行');
        resolve('timeout_error'); // 解决 Promise 避免永久卡住
      }
    }, 10000);
  });
}

/**
 * 检查任务是否已完成（用于竞态条件处理）
 */
export function isTaskCompletedRef(): boolean {
  return isTaskCompleted;
}
