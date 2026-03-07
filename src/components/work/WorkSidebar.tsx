import type { DetectionMode, ImageInfo } from '../../types';
import { ModeSelector } from '../detection/ModeSelector';
import { ImageUploader } from '../detection/ImageUploader';

interface WorkSidebarProps {
  mode: DetectionMode;
  images: ImageInfo[];
  status: 'idle' | 'connecting' | 'detecting' | 'success' | 'error';
  taskId: string | null;
  progress: number;
  error: string | null;
  hasImages: boolean;
  hasResults: boolean;
  isInteractionDisabled: boolean;
  onModeChange: (mode: DetectionMode) => void;
  onImagesAdd: (images: ImageInfo[]) => void;
  onImageRemove: (id: string) => void;
  onStartDetection: () => void;
  onCancelTask: () => void;
  onReset: () => void;
}

/**
 * 工作页面侧边栏组件
 * 包含模式选择、图片上传、错误提示和操作按钮
 */
export function WorkSidebar({
  mode,
  images,
  status,
  taskId,
  progress,
  error,
  hasImages,
  hasResults,
  isInteractionDisabled,
  onModeChange,
  onImagesAdd,
  onImageRemove,
  onStartDetection,
  onCancelTask,
  onReset,
}: WorkSidebarProps): React.ReactElement {
  // 获取按钮显示文本
  const getStartButtonText = () => {
    if (status === 'connecting') return '连接中...';
    if (status === 'detecting') return `检测中 ${progress}%`;
    return '开始检测';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">
        {/* 模式选择器 */}
        <ModeSelector
          currentMode={mode}
          onModeChange={onModeChange}
          disabled={isInteractionDisabled || hasImages}
        />

        {/* 图片上传器 */}
        <ImageUploader
          mode={mode}
          images={images}
          onImagesAdd={onImagesAdd}
          onImageRemove={onImageRemove}
          disabled={isInteractionDisabled}
        />

        {/* 错误提示 */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠</span>
            {error}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="action-buttons">
          {/* 开始检测按钮 */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={onStartDetection}
            disabled={!hasImages || isInteractionDisabled}
          >
            {getStartButtonText()}
          </button>

          {/* 取消任务按钮 */}
          {isInteractionDisabled && taskId && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={onCancelTask}
            >
              取消任务
            </button>
          )}

          {/* 清空重置按钮 */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onReset}
            disabled={isInteractionDisabled || (!hasImages && !hasResults)}
          >
            清空重置
          </button>
        </div>
      </div>
    </aside>
  );
}
