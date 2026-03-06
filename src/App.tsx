import { useState, useEffect } from "react";
import { TitleBar } from "./components/layout/TitleBar";
import { ActivityBar, type NavItemId } from "./components/layout/ActivityBar";
import { ModeSelector } from "./components/detection/ModeSelector";
import { ImageUploader } from "./components/detection/ImageUploader";
import { ResultPanel } from "./components/detection/ResultPanel";
import { ActivationPage } from "./components/activation/ActivationPage";
import { HistoryPage } from "./components/history/HistoryPage";
import { useDetection } from "./hooks/useDetection";
import { registerConnectionListener } from "./store/websocketManager";
import "./css/App.css";

function App(): React.ReactElement {
  // 启动时检查 localStorage 中是否存在 API Key
  const [isActivated, setIsActivated] = useState(() => {
    if (typeof window !== "undefined") {
      const apiKey = localStorage.getItem("api_key");
      return !!apiKey;
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<NavItemId | null>("work");

  // 使用检测 Hook
  const { 
    mode, images, status, error, clientId, taskId, progress, completedResults,
    setMode, addImages, removeImage, startDetection, cancelDetection, reset,
  } = useDetection();

  // 计算值
  const isDetecting = status === "detecting" || status === "connecting";
  const hasImages = images.length > 0;
  const hasResults = completedResults.length > 0;
  const isInteractionDisabled = isDetecting || taskId !== null;

  // 应用挂载时注册 WebSocket 连接监听器（只调用一次）
  useEffect(() => {
    registerConnectionListener();
  }, []);

  // 如果未激活，显示激活页面
  if (!isActivated) {
    return <ActivationPage onActivate={() => setIsActivated(true)} />;
  }

  return (
    <div className="app">
      {/* ===== 自定义标题栏 ===== */}
      <TitleBar />

      <div className="vscode-layout">
        {/* ===== 活动栏 (Activity Bar) ===== */}
        <ActivityBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* ===== 侧边栏 (Sidebar) ===== */}
        {activeTab === "work" && (
          <aside className="sidebar">
            <div className="sidebar-scroll">
              <ModeSelector
                currentMode={mode}
                onModeChange={setMode}
                disabled={isInteractionDisabled || hasImages}
              />

              <ImageUploader
                mode={mode}
                images={images}
                onImagesAdd={addImages}
                onImageRemove={removeImage}
                disabled={isInteractionDisabled}
              />

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠</span>
                  {error}
                </div>
              )}

              <div className="action-buttons">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={startDetection}
                  disabled={!hasImages || isInteractionDisabled}
                >
                  {status === "connecting"
                    ? "连接中..."
                    : status === "detecting"
                      ? `检测中 ${progress}%`
                      : "开始检测"}
                </button>

                {isInteractionDisabled && taskId && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={cancelDetection}
                  >
                    取消任务
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={reset}
                  disabled={isInteractionDisabled || (!hasImages && !hasResults)}
                >
                  清空重置
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* ===== 主内容区 (Main Content) ===== */}
        <main className="main-content">
          {activeTab === "work" ? (
            <ResultPanel
              images={images}
              status={status}
              userState={{
                clientId,
                taskId,
                isConnected: status !== "idle",
                progress,
                completedResults,
              }}
            />
          ) : activeTab === "history" ? (
            <HistoryPage clientId={clientId} />
          ) : null}
        </main>
      </div>

      <footer className="app-footer">
        <p>© 2026 人脸活体检测系统 | Made by Moore-ai</p>
      </footer>
    </div>
  );
}

export default App;
