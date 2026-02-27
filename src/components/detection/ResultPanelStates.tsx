import type { ImageInfo, DetectionResultItem } from "../../types";
import type { BaseProps } from "../../types";
import { DetectionCard } from "./DetectionCard";
import { type DetectionStats } from "../../utils/stats";

interface LoadingStateProps extends BaseProps {
  reminder: string;
}

/**
 * 加载状态组件
 */
export function LoadingState({ reminder, className = "" }: LoadingStateProps): React.ReactElement {
  return (
    <div className={`result-panel ${className} loading`}>
      <div className="loading-spinner">
        <div className="spinner" />
        <span>{reminder}</span>
      </div>
    </div>
  );
}

interface EmptyStateProps extends BaseProps {}

/**
 * 空状态组件
 */
export function EmptyState({ className = "" }: EmptyStateProps): React.ReactElement {
  return (
    <div className={`result-panel ${className} empty`}>
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>暂无检测结果</span>
        <span className="empty-hint">上传图片并开始检测</span>
      </div>
    </div>
  );
}

interface ResultsViewProps extends BaseProps {
  images: ImageInfo[];
  completedResults: DetectionResultItem[];
  stats: DetectionStats;
}

/**
 * 结果展示组件
 */
export function ResultsView({
  images,
  completedResults,
  stats,
  className = "",
}: ResultsViewProps): React.ReactElement {
  return (
    <div className={`result-panel ${className}`}>
      <div className="result-stats">
        <div className="stat-card total">
          <span className="stat-value">{stats.totalCount}</span>
          <span className="stat-label">总检测数</span>
        </div>
        <div className="stat-card real">
          <span className="stat-value">{stats.realCount}</span>
          <span className="stat-label">真人 ({stats.realPercentage}%)</span>
        </div>
        <div className="stat-card fake">
          <span className="stat-value">{stats.fakeCount}</span>
          <span className="stat-label">伪人脸 ({stats.fakePercentage}%)</span>
        </div>
        {stats.errorCount > 0 && (
          <div className="stat-card error">
            <span className="stat-value">{stats.errorCount}</span>
            <span className="stat-label">错误 ({stats.errorPercentage}%)</span>
          </div>
        )}
        <div className="stat-card confidence">
          <span className="stat-value">{Math.round(stats.averageConfidence * 100)}%</span>
          <span className="stat-label">平均置信度</span>
        </div>
      </div>

      <div className="result-divider" />

      <div className="result-grid">
        {completedResults.map((result, index) => {
          // 根据结果的 image_index 字段获取对应的图片预览
          const imageIndex = result.imageIndex ?? index;
          return (
            <DetectionCard
              key={result.id}
              result={result}
              imagePreview={images[imageIndex]?.preview}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
}
