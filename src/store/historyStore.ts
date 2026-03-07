/**
 * 历史记录 Store
 * 管理用户的所有历史记录
 * 数据从 Rust 后端获取
 */

import { createStore } from 'zustand';
import { useStore } from 'zustand/react';
import type { HistoryTaskItem, HistoryStatsResponse } from '../types';
import { getAllHistory, getHistoryStats, deleteHistory as deleteHistoryApi } from '../api/tauri';

// ===== 类型定义 =====

/**
 * 过滤器状态
 */
export interface FilterState {
  mode: string;
  status: string;
  days: string;
}

interface HistoryState {
  // 历史记录列表
  items: HistoryTaskItem[];

  // 统计信息
  stats: HistoryStatsResponse | null;

  // 分页
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;

  // 加载状态
  isLoading: boolean;
  isDetailLoading: boolean;

  // 错误
  error: string | null;

  // 过滤器
  filters: FilterState;

  // 选中的任务详情
  selectedTask: HistoryTaskItem | null;

  // 是否已初始化（已从服务器加载过数据）
  initialized: boolean;
}

interface HistoryActions {
  // 加载历史记录（从后端，只在未初始化时调用）
  loadHistory: () => Promise<void>;

  // 强制重新加载历史记录（用于刷新）
  reloadHistory: () => Promise<void>;

  // 加载统计信息
  loadStats: () => Promise<void>;

  // 设置历史记录（直接设置）
  setItems: (items: HistoryTaskItem[]) => void;

  // 添加单条历史记录
  addHistory: (item: HistoryTaskItem) => void;

  // 添加多条历史记录
  addHistories: (items: HistoryTaskItem[]) => void;

  // 删除单条历史记录（本地）
  deleteHistory: (taskId: string) => void;

  // 删除历史记录（服务器）
  deleteHistoryFromServer: (taskId: string) => Promise<void>;

  // 清空所有历史记录
  clearHistory: () => void;

  // 设置过滤器
  setFilters: (filters: FilterState) => void;

  // 重置过滤器
  resetFilters: () => void;

  // 处理过滤条件变更（设置过滤器并重置页码）
  handleFilterChange: (key: keyof FilterState, value: string) => void;

  // 设置分页
  setPage: (page: number) => void;

  // 设置选中的任务
  setSelectedTask: (task: HistoryTaskItem | null) => void;

  // 查询任务详情
  fetchTaskDetail: (task: HistoryTaskItem) => Promise<void>;

  // 设置详情加载状态
  setDetailLoading: (loading: boolean) => void;

  // 设置错误
  setError: (error: string | null) => void;

  // 清除错误
  clearError: () => void;

  // ===== 计算属性（由 selector 实现）=====
  // 获取过滤后的历史记录
  // getFilteredItems: () => HistoryTaskItem[];
  // 获取分页后的历史记录
  // getPaginatedItems: () => HistoryTaskItem[];
  // 获取总页数
  // getTotalPages: () => number;
}

export type HistoryStore = HistoryState & HistoryActions;

const createInitialState = (): HistoryState => ({
  items: [],
  stats: null,
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
  isLoading: false,
  isDetailLoading: false,
  error: null,
  filters: {
    mode: '',
    status: '',
    days: '',
  },
  selectedTask: null,
  initialized: false,
});

// ===== Store 创建 =====

export const historyStore = createStore<HistoryStore>()((set, get) => ({
  ...createInitialState(),

  // 加载历史记录（从后端，只在未初始化时调用）
  loadHistory: async () => {
    // 如果已初始化，跳过加载
    if (get().initialized) {
      console.log('[historyStore] 已初始化，跳过加载');
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await getAllHistory();
      set({
        items: response.items,
        total: response.total,
        totalPages: Math.ceil(response.total / get().pageSize),
        isLoading: false,
        initialized: true, // 标记为已初始化
      });
      console.log('[historyStore] 加载成功，共', response.total, '条记录');

      // 加载统计信息
      get().loadStats();
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '加载失败',
      });
      console.error('[historyStore] 加载失败:', err);
    }
  },

  // 强制重新加载历史记录
  reloadHistory: async () => {
    set({ isLoading: true, error: null, initialized: true });
    try {
      const response = await getAllHistory();
      set({
        items: response.items,
        total: response.total,
        totalPages: Math.ceil(response.total / get().pageSize),
        isLoading: false,
      });
      console.log('[historyStore] 刷新成功，共', response.total, '条记录');

      // 加载统计信息
      get().loadStats();
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '加载失败',
      });
      console.error('[historyStore] 刷新失败:', err);
    }
  },

  // 加载统计信息
  loadStats: async () => {
    try {
      const stats = await getHistoryStats();
      set({ stats });
      console.log('[historyStore] 统计信息加载成功');
    } catch (err) {
      console.error('[historyStore] 统计信息加载失败:', err);
    }
  },

  // 设置历史记录（直接设置）
  setItems: (items) => {
    set({ items });
    console.log('[historyStore] 设置记录，共', items.length, '条');
  },

  // 添加单条历史记录
  addHistory: (item) => {
    const currentItems = get().items;
    // 检查是否已存在
    const exists = currentItems.some((i) => i.taskId === item.taskId);
    if (!exists) {
      set({ items: [item, ...currentItems], total: currentItems.length + 1 });
      console.log('[historyStore] 添加记录:', item.taskId);
    }
  },

  // 添加多条历史记录
  addHistories: (items) => {
    const currentItems = get().items;
    const existingIds = new Set(currentItems.map((i) => i.taskId));
    const newItems = items.filter((item) => !existingIds.has(item.taskId));
    if (newItems.length > 0) {
      set({ items: [...newItems, ...currentItems], total: currentItems.length + newItems.length });
      console.log('[historyStore] 批量添加', newItems.length, '条记录');
    }
  },

  // 删除单条历史记录（本地）
  deleteHistory: (taskId) => {
    const currentItems = get().items;
    set({ items: currentItems.filter((item) => item.taskId !== taskId), total: currentItems.length - 1 });
    console.log('[historyStore] 删除记录:', taskId);
  },

  // 删除历史记录（服务器）
  deleteHistoryFromServer: async (taskId) => {
    try {
      await deleteHistoryApi({ taskIds: [taskId] });
      // 只在本地删除，不重新获取所有数据
      get().deleteHistory(taskId);
      console.log('[historyStore] 服务器删除成功:', taskId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '删除失败';
      set({ error: msg });
      console.error('[historyStore] 服务器删除失败:', err);
    }
  },

  // 清空所有历史记录
  clearHistory: () => {
    set({ items: [], total: 0, totalPages: 0 });
    console.log('[historyStore] 清空所有记录');
  },

  // 设置过滤器
  setFilters: (filters) => {
    set({ filters });
    console.log('[historyStore] 设置过滤器:', filters);
  },

  // 重置过滤器
  resetFilters: () => {
    set({
      filters: { mode: '', status: '', days: '' },
      page: 1,
    });
    console.log('[historyStore] 重置过滤器');
  },

  // 处理过滤条件变更（设置过滤器并重置页码）
  handleFilterChange: (key, value) => {
    const currentFilters = get().filters;
    set({
      filters: { ...currentFilters, [key]: value },
      page: 1, // 重置页码
    });
  },

  // 设置分页
  setPage: (page) => {
    set({ page });
  },

  // 设置选中的任务
  setSelectedTask: (task) => {
    set({ selectedTask: task });
  },

  // 查询任务详情
  fetchTaskDetail: async (task) => {
    set({ isDetailLoading: true, selectedTask: null });
    try {
      const found = get().items.find((item) => item.taskId === task.taskId);
      set({ selectedTask: found || task });
    } catch (e) {
      console.error('[historyStore] 获取任务详情失败:', e);
      set({ selectedTask: task });
    } finally {
      set({ isDetailLoading: false });
    }
  },

  // 设置详情加载状态
  setDetailLoading: (loading) => {
    set({ isDetailLoading: loading });
  },

  // 设置错误
  setError: (error) => {
    set({ error });
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));

// ===== 类型安全的 Hook =====

export function useHistoryStore<T>(
  selector: (state: HistoryStore) => T
): T {
  return useStore(historyStore, selector);
}

// ===== 工具函数 =====

/**
 * 根据过滤条件过滤历史记录
 */
export function filterHistoryItems(items: HistoryTaskItem[], filters: FilterState): HistoryTaskItem[] {
  return items.filter((item) => {
    // 模式过滤
    if (filters.mode && item.mode !== filters.mode) {
      return false;
    }
    // 状态过滤
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    // 时间过滤
    if (filters.days) {
      const itemDate = new Date(item.createdAt);
      const now = new Date();
      const daysDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > parseInt(filters.days)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * 分页历史记录
 */
export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return items.slice(start, end);
}

/**
 * 计算总页数
 */
export function calculateTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

/**
 * 获取当前历史记录列表
 */
export function getHistoryItems(): HistoryTaskItem[] {
  return historyStore.getState().items;
}

/**
 * 根据 taskId 获取历史记录
 */
export function getHistoryByTaskId(taskId: string): HistoryTaskItem | undefined {
  return historyStore.getState().items.find((item) => item.taskId === taskId);
}

/**
 * 获取历史记录数量
 */
export function getHistoryItemsLength(): number {
  return historyStore.getState().items.length;
}
