import { useState, useEffect } from "react";
import { ThemeProvider } from "@mui/material";
import { TitleBar } from "./components/layout/TitleBar";
import { ActivityBar, type NavItemId } from "./components/layout/ActivityBar";
import { ResultPanel } from "./components/detection/ResultPanel";
import { ActivationPage } from "./components/activation/ActivationPage";
import { HistoryPage } from "./components/history/HistoryPage";
import { SettingsPage } from "./components/settings/SettingsPage";
import { WorkSidebar } from "./components/work/WorkSidebar";
import { useDetection } from "./hooks/useDetection";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { registerConnectionListener } from "./store/websocketManager";
import { shortcutStore } from "./store/shortcutStore";
import { retrieveApiKey } from "./api/tauri";
import { theme } from "./main";
import { detectionStore } from "./store";
import "./css/App.css";

function App(): React.ReactElement {
  // 启动时检查系统密钥环中是否存在 API Key
  const [isActivated, setIsActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavItemId | null>("work");

  // 应用挂载时检查 API Key
  useEffect(() => {
    const checkApiKey = async () => {
      try {
        const apiKey = await retrieveApiKey();
        if (apiKey) {
          setIsActivated(true);
          detectionStore.setState({ api: apiKey });
        } else {
          setIsActivated(false);
        }
      } catch (err) {
        console.error('[App] 读取 API Key 失败:', err);
        setIsActivated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkApiKey();
  }, []);

  // 使用检测 Hook
  const {
    mode, images, status, error, taskId, progress, completedResults,
    setMode, addImages, removeImage, startDetection, cancelDetection, reset,
  } = useDetection();

  // 应用挂载时注册 WebSocket 连接监听器（只调用一次）
  useEffect(() => {
    registerConnectionListener();
  }, []);

  // 应用挂载时加载快捷键配置
  useEffect(() => {
    console.log('[App] 加载快捷键配置...');
    shortcutStore.getState().loadConfig();
  }, []);

  // 注册全局快捷键（只在"工作"tab 可用）
  useGlobalShortcuts(
    activeTab,
    startDetection,
    cancelDetection,
    reset
  );

  // 加载状态
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  // 计算值
  const isDetecting = status === "detecting" || status === "connecting";
  const hasImages = images.length > 0;
  const hasResults = completedResults.length > 0;
  const isInteractionDisabled = isDetecting || taskId !== null;

  // 如果未激活，显示激活页面
  if (!isActivated) {
    return <ActivationPage onActivate={() => setIsActivated(true)} />;
  }

  return (
    <ThemeProvider theme={theme}>
      <div className="app">
        {/* ===== 自定义标题栏 ===== */}
        <TitleBar />

        <div className="vscode-layout">
          {/* ===== 活动栏 (Activity Bar) ===== */}
          <ActivityBar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* ===== 侧边栏 (Sidebar) - 只在工作 tab 显示 ===== */}
          {activeTab === "work" && (
            <WorkSidebar
              mode={mode}
              images={images}
              status={status}
              taskId={taskId}
              progress={progress}
              error={error}
              hasImages={hasImages}
              hasResults={hasResults}
              isInteractionDisabled={isInteractionDisabled}
              onModeChange={setMode}
              onImagesAdd={addImages}
              onImageRemove={removeImage}
              onStartDetection={startDetection}
              onCancelTask={cancelDetection}
              onReset={reset}
            />
          )}

          {/* ===== 主内容区 (Main Content) ===== */}
          <main className="main-content">
            {activeTab === "work" ? (
              <ResultPanel
                images={images}
                status={status}
              />
            ) : activeTab === "history" ? (
              <HistoryPage />
            ) : activeTab === "settings" ? (
              <SettingsPage />
            ) : null}
          </main>
        </div>

        <footer className="app-footer">
          <p>© 2026 人脸活体检测系统 | Made by Moore-ai</p>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;
