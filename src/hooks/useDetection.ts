/**
 * 检测功能 Hook
 * 封装 Zustand store 订阅，提供统一的接口
 */

import { useDetectionStore, type DetectionStore } from '../store/detectionStore';

/**
 * 检测功能 Hook 返回值
 */
export interface UseDetectionReturn {
  // 状态
  mode: DetectionStore['mode'];
  images: DetectionStore['images'];
  status: DetectionStore['status'];
  error: DetectionStore['error'];
  clientId: DetectionStore['clientId'];
  taskId: DetectionStore['taskId'];
  progress: DetectionStore['progress'];
  completedResults: DetectionStore['completedResults'];

  // Actions
  setMode: DetectionStore['setMode'];
  addImages: DetectionStore['addImages'];
  removeImage: DetectionStore['removeImage'];
  startDetection: DetectionStore['startDetection'];
  cancelDetection: DetectionStore['cancelDetection'];
  reset: DetectionStore['reset'];
}

/**
 * 检测功能 Hook
 * 封装 Zustand store 订阅，提供统一的接口
 */
export function useDetection(): UseDetectionReturn {
  return {
    // 状态
    mode: useDetectionStore((state) => state.mode),
    images: useDetectionStore((state) => state.images),
    status: useDetectionStore((state) => state.status),
    error: useDetectionStore((state) => state.error),
    clientId: useDetectionStore((state) => state.clientId),
    taskId: useDetectionStore((state) => state.taskId),
    progress: useDetectionStore((state) => state.progress),
    completedResults: useDetectionStore((state) => state.completedResults),

    // Actions
    setMode: useDetectionStore((state) => state.setMode),
    addImages: useDetectionStore((state) => state.addImages),
    removeImage: useDetectionStore((state) => state.removeImage),
    startDetection: useDetectionStore((state) => state.startDetection),
    cancelDetection: useDetectionStore((state) => state.cancelDetection),
    reset: useDetectionStore((state) => state.reset),
  };
}
