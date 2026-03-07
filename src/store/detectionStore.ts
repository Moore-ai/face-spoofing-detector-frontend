/**
 * 检测状态 Store
 * 使用 Zustand 管理检测相关的所有状态和动作
 */

import { createStore, type StoreApi, useStore } from 'zustand';
import { persist, type PersistOptions } from 'zustand/middleware';
import type {
  DetectionMode,
  DetectionStatus,
  ImageInfo,
  DetectionResultItem,
} from '../types';
import {
  connectWebsocket,
  detectSingleModeAsync,
  detectFusionModeAsync,
  cancelDetection as cancelDetectionApi,
  getSupportedFormats,
} from '../api/tauri';
import {
  registerProgressListeners,
  cleanupProgressListeners,
  waitForClientId,
  isTaskCompletedRef,
} from './websocketManager';

// ===== 类型定义 =====

interface DetectionState {
  // 检测状态
  mode: DetectionMode;
  images: ImageInfo[];
  status: DetectionStatus;
  error: string | null;

  // WebSocket 状态
  clientId: string | null;
  taskId: string | null;
  isConnected: boolean;
  progress: number;
  completedResults: DetectionResultItem[];
  api: string | null;
}

interface DetectionActions {
  // 图片管理
  setMode: (mode: DetectionMode) => void;
  addImages: (images: ImageInfo[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;

  // 检测流程
  startDetection: () => Promise<void>;
  cancelDetection: () => Promise<void>;
  reset: () => void;

  // WebSocket 事件
  updateProgress: (result: DetectionResultItem) => void;
  setTaskCompleted: (status: 'completed' | 'cancelled' | 'failed') => void;
  setTaskFailed: (error: string) => void;
  setClientId: (clientId: string) => void;
}

export type DetectionStore = DetectionState & DetectionActions;

// ===== 初始状态（使用 initializer 函数）=====

const createInitialState = (): DetectionState => ({
  mode: 'single',
  images: [],
  status: 'idle',
  error: null,
  clientId: null,
  taskId: null,
  isConnected: false,
  progress: 0,
  completedResults: [],
  api: null,
});

// ===== 工具函数 =====

/**
 * File 转 Base64（移除 data:image/xxx;base64, 前缀）
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('图片读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 检查图片格式
 */
async function checkFormat(images: ImageInfo[]): Promise<string[]> {
  const supportedFormats = await getSupportedFormats();
  const invalidImages: string[] = [];

  for (const img of images) {
    const ext = img.file.name.split('.').pop()?.toLowerCase() || '';
    if (!supportedFormats.includes(ext)) {
      invalidImages.push(img.file.name);
    }
  }

  return invalidImages;
}

/**
 * 融合模式图片配对
 */
function pairImagesByFilename(images: ImageInfo[]): {
  pairs: Array<{ rgb: ImageInfo; ir: ImageInfo }>;
  unpairedRgb: ImageInfo[];
  unpairedIr: ImageInfo[];
  invalidFiles: ImageInfo[];
} {
  const rgbImages = new Map<string, ImageInfo>();
  const irImages = new Map<string, ImageInfo>();
  const invalidFiles: ImageInfo[] = [];

  for (const image of images) {
    const filename = image.file.name;
    const underscoreIndex = filename.indexOf('_');

    if (underscoreIndex === -1) {
      invalidFiles.push(image);
      continue;
    }

    const prefix = filename.substring(0, underscoreIndex).toLowerCase();
    const extIndex = filename.lastIndexOf('.');
    const identifier = filename.substring(
      underscoreIndex + 1,
      extIndex > underscoreIndex ? extIndex : undefined
    );

    if (prefix === 'rgb') {
      rgbImages.set(identifier, image);
    } else if (prefix === 'ir') {
      irImages.set(identifier, image);
    } else {
      invalidFiles.push(image);
    }
  }

  const pairs: Array<{ rgb: ImageInfo; ir: ImageInfo }> = [];
  const unpairedRgb: ImageInfo[] = [];
  const unpairedIr: ImageInfo[] = [];

  for (const [identifier, rgbImg] of rgbImages) {
    const irImg = irImages.get(identifier);
    if (irImg) {
      pairs.push({ rgb: rgbImg, ir: irImg });
    } else {
      unpairedRgb.push(rgbImg);
    }
  }

  for (const [identifier, irImg] of irImages) {
    if (!rgbImages.has(identifier)) {
      unpairedIr.push(irImg);
    }
  }

  return { pairs, unpairedRgb, unpairedIr, invalidFiles };
}

// ===== 创建 Store（使用 slice 模式）=====

// 图片管理 slice
const createDetectionSlice = (
  set: StoreApi<DetectionStore>['setState'],
  _get: StoreApi<DetectionStore>['getState']
): Pick<
  DetectionActions,
  'setMode' | 'addImages' | 'removeImage' | 'clearImages'
> => ({
  setMode: (mode) => {
    set({ mode });
  },
  addImages: (images) => {
    set((state) => ({ images: [...state.images, ...images] }));
  },
  removeImage: (id) => {
    set((state) => ({ images: state.images.filter((img) => img.id !== id) }));
  },
  clearImages: () => {
    set({ images: [] });
  },
});

// 检测流程 slice
const createTaskSlice = (
  set: StoreApi<DetectionStore>['setState'],
  get: StoreApi<DetectionStore>['getState']
): Pick<
  DetectionActions,
  'startDetection' | 'cancelDetection' | 'reset'
> => ({
  startDetection: async () => {
    const state = get();
    const { images, mode, clientId } = state;

    console.log('[detectionStore] startDetection 被调用');
    console.log('[detectionStore] 当前状态：images=', images.length, 'mode=', mode, 'clientId=', clientId);

    // 验证图片
    if (images.length === 0) {
      set({ error: '请先上传图片' });
      console.log('[detectionStore] 错误：没有图片');
      return;
    }

    // 检查是否已在进行中
    if (state.status === 'detecting' || state.status === 'connecting') {
      console.warn('[detectionStore] 检测正在进行中');
      return;
    }

    // 验证图片格式
    try {
      const invalidImages = await checkFormat(images);
      if (invalidImages.length > 0) {
        throw new Error(`以下图片格式不支持：${invalidImages.join(', ')}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '验证失败';
      set({ error: errorMsg, status: 'error' });
      console.log('[detectionStore] 图片验证失败:', errorMsg);
      return;
    }

    // 清理旧的监听器并注册新的
    await registerProgressListeners();

    // 设置连接中状态
    set({ status: 'connecting', error: null, progress: 0, completedResults: [] });

    // 获取 clientId
    let currentClientId = clientId;

    // 检查 API Key 是否存在
    const apiKey = detectionStore.getState().api;
    if (!apiKey) {
      set({ error: 'API Key 不存在，请重新激活', status: 'error' });
      return;
    }

    console.log('[detectionStore] apiKey:', apiKey ? '存在' : '空');

    if (!currentClientId) {
      console.log('[detectionStore] 连接 WebSocket...');
      try {
        const connectPromise = connectWebsocket(apiKey);
        console.log('[detectionStore] connectWebsocket 调用开始');
        const result = await connectPromise;
        console.log('[detectionStore] connectWebsocket 返回:', result);
        currentClientId = await waitForClientId();
        console.log('[detectionStore] 获取到 clientId:', currentClientId);

        // 检查超时错误
        if (currentClientId === 'timeout_error') {
          set({
            error: 'WebSocket 连接超时，请检查后端服务是否正常运行（端口 8000）',
            status: 'error'
          });
          console.log('[detectionStore] WebSocket 连接超时');
          return;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '连接失败';
        set({ error: errorMsg, status: 'error' });
        console.log('[detectionStore] WebSocket 连接失败:', errorMsg);
        return;
      }
    } else {
      console.log('[detectionStore] 使用现有 clientId:', currentClientId);
    }

    // 设置检测中状态
    set({ status: 'detecting' });

    try {
      let taskResponse: { task_id: string; message: string };

      if (mode === 'single') {
        // 单模态检测
        const base64Images = await Promise.all(
          images.map((img) => fileToBase64(img.file))
        );
        taskResponse = await detectSingleModeAsync(
          {
            mode: 'single',
            modality: 'rgb',
            images: base64Images,
          },
          currentClientId,
          apiKey
        );
      } else {
        // 融合模式检测
        const { pairs, unpairedRgb, unpairedIr, invalidFiles } =
          pairImagesByFilename(images);

        const errors: string[] = [];

        if (invalidFiles.length > 0) {
          errors.push(
            `以下文件命名格式不正确：${invalidFiles.map((img) => img.file.name).join(', ')}`
          );
        }
        if (unpairedRgb.length > 0) {
          errors.push(
            `以下 RGB 图片缺少对应的 IR 图片：${unpairedRgb.map((img) => img.file.name).join(', ')}`
          );
        }
        if (unpairedIr.length > 0) {
          errors.push(
            `以下 IR 图片缺少对应的 RGB 图片：${unpairedIr.map((img) => img.file.name).join(', ')}`
          );
        }
        if (pairs.length === 0) {
          errors.push('未找到可配对的 RGB 和 IR 图片');
        }

        if (errors.length > 0) {
          throw new Error(errors.join('; '));
        }

        const pairsData = await Promise.all(
          pairs.map(async ({ rgb, ir }) => ({
            rgb: await fileToBase64(rgb.file),
            ir: await fileToBase64(ir.file),
          }))
        );

        taskResponse = await detectFusionModeAsync(
          {
            mode: 'fusion',
            pairs: pairsData,
          },
          currentClientId,
          apiKey
        );
      }

      if (!taskResponse.task_id) {
        throw new Error(taskResponse.message || '创建任务失败');
      }

      // 检查竞态条件
      if (!isTaskCompletedRef()) {
        console.log('[detectionStore] 任务创建成功，taskId:', taskResponse.task_id);
        set({ taskId: taskResponse.task_id });
      } else {
        console.log('[detectionStore] 任务已完成，跳过设置 taskId');
      }
    } catch (err) {
      let errorMsg = '检测失败';
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'string') {
        errorMsg = err;
      }

      if (
        errorMsg.includes('网络请求失败') ||
        errorMsg.includes('Failed to fetch') ||
        errorMsg.includes('error sending request')
      ) {
        errorMsg = '无法连接后端服务，请确保后端已启动';
      }

      console.error('[detectionStore] 检测失败:', errorMsg);
      set({ error: errorMsg, status: 'error', taskId: null });
    }
  },

  cancelDetection: async () => {
    const { taskId } = get();
    if (!taskId) {
      console.warn('[detectionStore] 取消任务失败：taskId 为空');
      return;
    }

    try {
      const apiKey = detectionStore.getState().api!;
      await cancelDetectionApi(taskId, apiKey);
      console.log('[detectionStore] 取消任务成功');
      // 状态更新由 ws_task_completed 事件处理
    } catch (err) {
      console.error('[detectionStore] 取消任务失败:', err);
    }
  },

  reset: () => {
    const { clientId } = get();
    cleanupProgressListeners();
    set({
      ...createInitialState(),
      clientId, // 保留 clientId
    });
  },
});

// WebSocket 事件 slice
const createWebSocketSlice = (
  set: StoreApi<DetectionStore>['setState']
): Pick<
  DetectionActions,
  'updateProgress' | 'setTaskCompleted' | 'setTaskFailed' | 'setClientId'
> => ({
  updateProgress: (result) => {
    set((state) => {
      const totalItems = state.images.length;
      const processedItems = state.completedResults.length + 1;
      return {
        progress:
          totalItems > 0
            ? Math.round((processedItems / totalItems) * 100)
            : state.progress,
        completedResults: [...state.completedResults, result],
      };
    });
  },
  setTaskCompleted: (status) => {
    set((state) => ({
      status: status === 'cancelled' ? 'idle' : 'success',
      taskId: null,
      progress: status === 'cancelled' ? state.progress : 100,
      error: status === 'cancelled' ? '检测任务已取消' : null,
    }));
  },
  setTaskFailed: (error) => {
    set({ error, status: 'error', taskId: null });
  },
  setClientId: (clientId) => {
    set({ clientId, isConnected: true });
  },
});

// ===== 组合 Store =====

export const detectionStore = createStore<DetectionStore>()(
  persist(
    (...args) => {
      const [set, get] = args;
      return {
        ...createInitialState(),
        ...createDetectionSlice(set, get),
        ...createTaskSlice(set, get),
        ...createWebSocketSlice(set),
      };
    },
    {
      name: 'detection-storage',
      partialize: () => ({
        // 不持久化任何状态，clientId 是会话级别的状态
      }),
    } as PersistOptions<DetectionStore, Record<string, never>>
  )
);

// ===== 类型安全的 Hook =====

/**
 * 使用 Store 的 Hook，支持精确订阅
 *
 * @example
 * // 精确订阅单个字段
 * const progress = useDetectionStore((s) => s.progress);
 *
 * // 订阅 action
 * const startDetection = useDetectionStore((s) => s.startDetection);
 */
export function useDetectionStore<T>(
  selector: (state: DetectionStore) => T
): T {
  return useStore(detectionStore, selector);
}

// ===== 工具函数 =====

/**
 * 获取 Store 当前状态（用于非组件环境）
 * 注意：这不会触发重渲染
 */
export function getDetectionState(): Omit<DetectionState, 'completedResults'> & {
  completedResults: DetectionResultItem[];
} {
  const state = detectionStore.getState();
  return {
    mode: state.mode,
    images: state.images,
    status: state.status,
    error: state.error,
    clientId: state.clientId,
    taskId: state.taskId,
    isConnected: state.isConnected,
    progress: state.progress,
    completedResults: state.completedResults,
    api: state.api,
  };
}
