import type { BatchDetectionResult, ImageInfo } from "../types";
import type { BaseProps } from "../types";
import { DetectionCard } from "./DetectionCard";

interface ResultPanelProps extends BaseProps {
  results: BatchDetectionResult | null;
  images: ImageInfo[];
  isLoading?: boolean;
}

/**
 * 检测结果面板组件
 * 显示批量检测的统计信息和详细结果列表
 */
export function ResultPanel({
  results,
  images,
  isLoading = false,
  className = "",
}: ResultPanelProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className={`result-panel ${className} loading`}>
        <div className="loading-spinner">
          <div className="spinner" />
          <span>正在进行活体检测...</span>
        </div>
      </div>
    );
  }

  if (!results || results.totalCount === 0) {
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

  const realPercentage = Math.round((results.realCount / results.totalCount) * 100);
  const fakePercentage = 100 - realPercentage;

  return (
    <div className={`result-panel ${className}`}>
      <div className="result-stats">
        <div className="stat-card total">
          <span className="stat-value">{results.totalCount}</span>
          <span className="stat-label">总检测数</span>
        </div>
        <div className="stat-card real">
          <span className="stat-value">{results.realCount}</span>
          <span className="stat-label">真人 ({realPercentage}%)</span>
        </div>
        <div className="stat-card fake">
          <span className="stat-value">{results.fakeCount}</span>
          <span className="stat-label">伪人脸 ({fakePercentage}%)</span>
        </div>
        <div className="stat-card confidence">
          <span className="stat-value">{Math.round(results.averageConfidence * 100)}%</span>
          <span className="stat-label">平均置信度</span>
        </div>
      </div>

      <div className="result-divider" />

      <div className="result-grid">
        {results.results.map((result, index) => (
          <DetectionCard
            key={result.id}
            result={result}
            imagePreview={images[index]?.preview}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}
