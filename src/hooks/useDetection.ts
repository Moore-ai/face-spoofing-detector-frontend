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
  defaultMode: DetectionStore['defaultMode'];  // 默认检测模式
  images: DetectionStore['images'];
  status: DetectionStore['status'];
  error: DetectionStore['error'];
  clientId: DetectionStore['clientId'];
  taskId: DetectionStore['taskId'];
  progress: DetectionStore['progress'];
  completedResults: DetectionStore['completedResults'];

  // Actions
  setMode: DetectionStore['setMode'];
  setDefaultMode: DetectionStore['setDefaultMode'];  // 设置默认模式
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
    defaultMode: useDetectionStore((state) => state.defaultMode),
    images: useDetectionStore((state) => state.images),
    status: useDetectionStore((state) => state.status),
    error: useDetectionStore((state) => state.error),
    clientId: useDetectionStore((state) => state.clientId),
    taskId: useDetectionStore((state) => state.taskId),
    progress: useDetectionStore((state) => state.progress),
    completedResults: useDetectionStore((state) => state.completedResults),

    // Actions
    setMode: useDetectionStore((state) => state.setMode),
    setDefaultMode: useDetectionStore((state) => state.setDefaultMode),
    addImages: useDetectionStore((state) => state.addImages),
    removeImage: useDetectionStore((state) => state.removeImage),
    startDetection: useDetectionStore((state) => state.startDetection),
    cancelDetection: useDetectionStore((state) => state.cancelDetection),
    reset: useDetectionStore((state) => state.reset),
  };
}
