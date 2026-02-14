import { Header } from "./components/Header";
import { ModeSelector } from "./components/ModeSelector";
import { ImageUploader } from "./components/ImageUploader";
import { ResultPanel } from "./components/ResultPanel";
import { useDetection } from "./hooks/useDetection";
import "./App.css";

/**
 * 主应用组件
 * 人脸活体检测系统前端界面
 */
function App(): React.ReactElement {
  const {
    mode,
    setMode,
    images,
    addImages,
    removeImage,
    status,
    results,
    error,
    startDetection,
    reset,
  } = useDetection();

  const isDetecting = status === "detecting";
  const hasImages = images.length > 0;
  const hasResults = results !== null && results.totalCount > 0;

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <div className="control-panel">
          <ModeSelector
            currentMode={mode}
            onModeChange={setMode}
            disabled={isDetecting || hasImages}
          />

          <ImageUploader
            mode={mode}
            images={images}
            onImagesAdd={addImages}
            onImageRemove={removeImage}
            disabled={isDetecting}
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
              disabled={!hasImages || isDetecting}
            >
              {isDetecting ? "检测中..." : "开始检测"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                reset();
              }}
              disabled={isDetecting || (!hasImages && !hasResults)}
            >
              清空重置
            </button>
          </div>
        </div>

        <div className="result-container">
          <ResultPanel
            results={results}
            images={images}
            isLoading={isDetecting}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2026 人脸活体检测系统 | Made by Moore-ai</p>
      </footer>
    </div>
  );
}

export default App;
