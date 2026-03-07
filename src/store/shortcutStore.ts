/**
 * 快捷键配置 Store
 * 管理快捷键绑定配置的加载、保存、验证和重置
 * 配置保存到 Rust 后端（src-tauri/config/shortcuts.json）
 */

import { createStore, useStore } from 'zustand';
import type { ShortcutConfig, ShortcutActionId } from '../types';
import { saveShortcutsConfig, getShortcutsConfig } from '../api/tauri';

// ===== 类型定义 =====

interface ShortcutState {
  // 快捷键配置
  config: ShortcutConfig;
  isLoading: boolean;
  error: string | null;
}

interface ShortcutActions {
  // 配置加载
  loadConfig: () => Promise<void>;
  saveConfig: (config: ShortcutConfig) => Promise<void>;

  // 单个快捷键更新
  updateShortcut: (actionId: ShortcutActionId, shortcut: string) => void;

  // 恢复默认
  restoreDefaults: () => void;

  // 错误处理
  clearError: () => void;
}

export type ShortcutStore = ShortcutState & ShortcutActions;

// ===== 默认快捷键配置 =====

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  start_detection: 'Ctrl+Enter',    // 开始检测
  cancel_task: 'Escape',            // 取消任务
  reset: 'Ctrl+R',                  // 清空重置
};

// ===== 初始状态 =====

const createInitialState = (): ShortcutState => ({
  config: { ...DEFAULT_SHORTCUTS },
  isLoading: false,
  error: null,
});

// ===== Store 创建 =====

export const shortcutStore = createStore<ShortcutStore>()((set) => ({
  ...createInitialState(),

  // 加载配置（从 Rust 后端）
  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await getShortcutsConfig();
      set({ config, isLoading: false });
      console.log('[shortcutStore] 配置加载成功:', config);
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '加载配置失败'
      });
    }
  },

  // 保存配置到 Rust 后端
  saveConfig: async (config: ShortcutConfig) => {
    set({ isLoading: true, error: null });
    try {
      await saveShortcutsConfig(config);
      set({ config, isLoading: false });
      console.log('[shortcutStore] 配置已保存到 Rust 后端:', config);
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '保存配置失败'
      });
    }
  },

  // 更新单个快捷键并立即保存
  updateShortcut: async (actionId: ShortcutActionId, shortcut: string) => {
    const newConfig = { ...getShortcutConfig(), [actionId]: shortcut };
    console.log('[shortcutStore] updateShortcut - 新配置:', newConfig);
    set({ config: newConfig });
    // 立即保存到 Rust 后端
    try {
      await saveShortcutsConfig(newConfig);
      console.log('[shortcutStore] updateShortcut - 保存成功');
    } catch (err) {
      console.error('[shortcutStore] updateShortcut - 保存失败:', err);
    }
  },

  // 恢复默认并保存
  restoreDefaults: async () => {
    set({ config: { ...DEFAULT_SHORTCUTS }, error: null });
    console.log('[shortcutStore] 已恢复默认快捷键');
    // 保存默认配置到 Rust 后端
    await saveShortcutsConfig({ ...DEFAULT_SHORTCUTS });
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));

// ===== 类型安全的 Hook =====

export function useShortcutStore<T>(
  selector: (state: ShortcutStore) => T
): T {
  return useStore(shortcutStore, selector);
}

// ===== 工具函数 =====

/**
 * 获取当前快捷键配置
 */
export function getShortcutConfig(): ShortcutConfig {
  return shortcutStore.getState().config;
}

/**
 * 格式化快捷键显示
 * 将 KeyboardEvent 转换为可读字符串
 */
export function formatShortcut(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Meta');

  // 获取主键
  const key = event.key.toUpperCase();
  if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) {
    parts.push(key);
  }

  return parts.join('+');
}

/**
 * 验证快捷键是否有效
 */
export function validateShortcut(shortcut: string): { valid: boolean; error?: string } {
  if (!shortcut || shortcut.trim() === '') {
    return { valid: false, error: '快捷键不能为空' };
  }

  // 允许单独使用的特殊键
  const allowedStandaloneKeys = ['Escape', 'Enter', 'Tab', 'Delete', 'Backspace'];
  if (allowedStandaloneKeys.some(key => key.toUpperCase() === shortcut.toUpperCase())) {
    return { valid: true };
  }

  // 检查是否包含至少一个修饰键
  const hasModifier =
    shortcut.includes('Ctrl') ||
    shortcut.includes('Alt') ||
    shortcut.includes('Shift') ||
    shortcut.includes('Meta');

  if (!hasModifier) {
    return {
      valid: false,
      error: '快捷键必须包含至少一个修饰键（Ctrl/Alt/Shift/Meta），或使用特殊键（Escape/Enter）'
    };
  }

  // 检查是否包含主键
  const keys = shortcut.split('+');
  const mainKey = keys[keys.length - 1];
  const modifiers = ['CTRL', 'ALT', 'SHIFT', 'META'];

  if (modifiers.includes(mainKey.toUpperCase())) {
    return { valid: false, error: '快捷键必须包含一个主键' };
  }

  // 检查是否与其他快捷键冲突
  const currentConfig = getShortcutConfig();
  const conflicts: string[] = [];

  for (const [actionId, value] of Object.entries(currentConfig)) {
    if (value === shortcut) {
      conflicts.push(actionId);
    }
  }

  if (conflicts.length > 0) {
    return {
      valid: false,
      error: `快捷键已被占用：${conflicts.join(', ')}`
    };
  }

  return { valid: true };
}
