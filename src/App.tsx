import { useState } from "react";
import { ActivityBar, type NavItemId } from "./components/ActivityBar";
import { ModeSelector } from "./components/ModeSelector";
import { ImageUploader } from "./components/ImageUploader";
import { ResultPanel } from "./components/ResultPanel";
import { useDetection } from "./hooks/useDetection";
import "./App.css";

function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<NavItemId | null>("work");

  const {
    mode,
    setMode,
    images,
    addImages,
    removeImage,
    status,
    error,
    userState,
    startDetection,
    reset,
  } = useDetection();

  const isDetecting = status === "detecting" || status === "connecting";
  const hasImages = images.length > 0;
  const hasResults = userState.completedResults.length > 0;

  const isDisabled = isDetecting || userState.taskId !== null;

  return (
    <div className="app">
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
                disabled={isDisabled}
              />

              <ImageUploader
                mode={mode}
                images={images}
                onImagesAdd={addImages}
                onImageRemove={removeImage}
                disabled={isDisabled}
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
                  disabled={!hasImages || isDisabled}
                >
                  {status === "connecting"
                    ? "连接中..."
                    : status === "detecting"
                      ? `检测中 ${userState.progress}%`
                      : "开始检测"}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={reset}
                  disabled={isDisabled || (!hasImages && !hasResults)}
                >
                  清空重置
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* ===== 主内容区 (Main Content) ===== */}
        <main className="main-content">
          <ResultPanel
            images={images}
            isLoading={isDetecting}
            userState={userState}
          />
        </main>
      </div>

      <footer className="app-footer">
        <p>© 2026 人脸活体检测系统 | Made by Moore-ai</p>
      </footer>
    </div>
  );
}

export default App;
