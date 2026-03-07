/**
 * 全局快捷键 Hook
 * 注册快捷键监听，触发相应的动作
 * 仅在"工作"tab 激活时可用
 */

import { useEffect, useRef } from 'react';
import { useShortcutStore } from '../store/shortcutStore';

/**
 * 使用全局快捷键
 * @param activeTab 当前激活的 tab
 * @param onStartDetection 开始检测回调
 * @param onCancelTask 取消任务回调
 * @param onReset 清空重置回调
 */
export function useGlobalShortcuts(
  activeTab: string | null,
  onStartDetection: () => void,
  onCancelTask: () => void,
  onReset: () => void
) {
  // 从 store 获取快捷键配置
  const config = useShortcutStore((state) => state.config);

  // 使用 ref 存储回调，避免依赖变化导致监听器重新注册
  const callbacksRef = useRef({
    onStartDetection,
    onCancelTask,
    onReset,
  });

  // 更新回调引用
  useEffect(() => {
    callbacksRef.current = {
      onStartDetection,
      onCancelTask,
      onReset,
    };
  }, [onStartDetection, onCancelTask, onReset]);

  useEffect(() => {
    // 只在"工作"tab 激活时注册快捷键
    if (activeTab !== 'work') {
      return;
    }

    /**
     * 处理键盘事件
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // 构建快捷键字符串
      const parts: string[] = [];
      if (event.ctrlKey) parts.push('Ctrl');
      if (event.altKey) parts.push('Alt');
      if (event.shiftKey) parts.push('Shift');
      if (event.metaKey) parts.push('Meta');

      const key = event.key.toUpperCase();
      if (!['CONTROL', 'ALT', 'SHIFT', 'META'].includes(key)) {
        parts.push(key);
      }

      const shortcut = parts.join('+');

      // 匹配快捷键并执行相应动作
      switch (shortcut) {
        case config.start_detection:
          event.preventDefault();
          console.log('[useGlobalShortcuts] 触发：开始检测');
          callbacksRef.current.onStartDetection();
          break;

        case config.cancel_task:
          event.preventDefault();
          console.log('[useGlobalShortcuts] 触发：取消任务');
          callbacksRef.current.onCancelTask();
          break;

        case config.reset:
          event.preventDefault();
          console.log('[useGlobalShortcuts] 触发：清空重置');
          callbacksRef.current.onReset();
          break;

        default:
          break;
      }
    };

    // 注册监听器
    window.addEventListener('keydown', handleKeyDown);

    // 清理监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, config]); // 在 tab 或配置变化时重新注册
}
