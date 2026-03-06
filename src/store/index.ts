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
