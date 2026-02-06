import type { BaseProps } from "../types";

interface ConfidenceBarProps extends BaseProps {
  confidence: number;
  result: "real" | "fake";
}

/**
 * 置信度条形图组件
 * 显示检测结果的置信度百分比
 */
export function ConfidenceBar({
  confidence,
  result,
  className = "",
}: ConfidenceBarProps): React.ReactElement {
  const percentage = Math.round(confidence * 100);
  const colorClass = result === "real" ? "success" : "danger";

  return (
    <div className={`confidence-bar ${className}`}>
      <div className="confidence-header">
        <span className="confidence-label">置信度</span>
        <span className={`confidence-value ${colorClass}`}>{percentage}%</span>
      </div>
      <div className="confidence-track">
        <div
          className={`confidence-fill ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
