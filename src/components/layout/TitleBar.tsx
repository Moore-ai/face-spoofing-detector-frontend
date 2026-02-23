import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "../../css/TitleBar.css";

/**
 * 自定义标题栏组件
 * 替换原生标题栏，提供窗口控制功能
 */
export function TitleBar(): React.ReactElement {
  const [isMaximized, setIsMaximized] = useState(false);
  const currentWindow = getCurrentWindow();

  // 检查窗口最大化状态
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await currentWindow.isMaximized();
        setIsMaximized(maximized);
      } catch {
        // 忽略错误
      }
    };
    checkMaximized();
  }, [currentWindow]);

  const handleMinimize = async () => {
    try {
      await currentWindow.minimize();
    } catch (error) {
      console.error("最小化失败:", error);
    }
  };

  const handleMaximize = async () => {
    try {
      await currentWindow.toggleMaximize();
      setIsMaximized((prev) => !prev);
    } catch (error) {
      console.error("最大化切换失败:", error);
    }
  };

  const handleClose = async () => {
    try {
      await currentWindow.close();
    } catch (error) {
      console.error("关闭失败:", error);
    }
  };

  return (
    <div className="title-bar">
      <div className="title-bar-drag">
        <div className="title-bar-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
            <path d="M12 11v4" />
            <path d="M9 14h6" />
          </svg>
        </div>
        <span className="title-bar-title">人脸活体检测系统</span>
      </div>
      
      <div className="title-bar-controls">
        <button
          type="button"
          className="title-bar-btn btn-minimize"
          onClick={handleMinimize}
          title="最小化"
        >
          <svg viewBox="0 0 12 12" className="icon-minimize">
            <line x1="1" y1="10" x2="11" y2="10" />
          </svg>
        </button>

        <button
          type="button"
          className="title-bar-btn btn-maximize"
          onClick={handleMaximize}
          title={isMaximized ? "还原" : "最大化"}
        >
          {isMaximized ? (
            <svg viewBox="0 0 12 12" className="icon-restore">
              <rect x="2" y="0" width="9" height="9" />
              <rect x="0" y="3" width="9" height="9" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" className="icon-maximize">
              <rect x="0.5" y="0.5" width="11" height="11" fill="none" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="title-bar-btn btn-close"
          onClick={handleClose}
          title="关闭"
        >
          <svg viewBox="0 0 12 12" className="icon-close">
            <line x1="1" y1="1" x2="11" y2="11" />
            <line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
