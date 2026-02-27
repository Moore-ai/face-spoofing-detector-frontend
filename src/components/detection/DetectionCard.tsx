import type { DetectionResultItem } from "../../types";
import type { BaseProps } from "../../types";
import { ConfidenceBar } from "../ui/ConfidenceBar";

interface DetectionCardProps extends BaseProps {
  result: DetectionResultItem;
  imagePreview?: string;
  index: number;
}

/**
 * 检测结果卡片组件
 * 显示单张图片的检测结果、置信度等信息
 */
export function DetectionCard({
  result,
  imagePreview,
  index,
  className = "",
}: DetectionCardProps): React.ReactElement {
  const isReal = result.result === "real";
  const isError = result.result === "error";

  return (
    <div className={`detection-card ${className} ${isError ? "error" : isReal ? "real" : "fake"}`}>
      <div className="card-header">
        <span className="card-index">#{index + 1}</span>
        <span className={`result-badge ${isError ? "error" : isReal ? "real" : "fake"}`}>
          {isError ? "错误" : isReal ? "真" : "伪"}
        </span>
      </div>

      {imagePreview && (
        <div className="card-image">
          <img src={imagePreview} alt={`检测结果 ${index + 1}`} />
        </div>
      )}

      <div className="card-content">
        {!isError && (
          <>
            <ConfidenceBar confidence={result.confidence} result={result.result} />

            <div className="card-details">
              <div className="detail-item">
                <span className="detail-label">处理时间</span>
                <span className="detail-value">{result.processingTime}ms</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">检测时间</span>
                <span className="detail-value">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </>
        )}
        {isError && (
          <div className="card-error-content">
            <div className="error-icon">!</div>
            <p className="error-message">{result.errorMessage || "推理过程中发生错误"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
