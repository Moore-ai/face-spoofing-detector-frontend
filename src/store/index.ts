/**
 * Store 统一导出
 */

export {
  detectionStore,
  useDetectionStore,
  getDetectionState,
} from './detectionStore';

export type { DetectionStore } from './detectionStore';

export {
  registerConnectionListener,
  registerProgressListeners,
  cleanupProgressListeners,
  cleanupAllListeners,
  waitForClientId,
  isTaskCompletedRef,
} from './websocketManager';

// ===== 历史记录 Store =====

export {
  historyStore,
  useHistoryStore,
  getHistoryItems,
  getHistoryItemsLength,
  getHistoryByTaskId,
} from './historyStore';

export type { HistoryStore, FilterState } from './historyStore';
