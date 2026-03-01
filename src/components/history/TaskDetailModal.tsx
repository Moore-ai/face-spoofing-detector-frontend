import type { HistoryTaskItem } from "../../api/tauri";
import { formatTime, formatDuration, getStatusClass, getStatusLabel } from "./utils";

interface TaskDetailModalProps {
  task: HistoryTaskItem | null;
  loading: boolean;
  onClose: () => void;
}

export function TaskDetailModal({
  task,
  loading,
  onClose,
}: TaskDetailModalProps): React.ReactElement | null {
  if (!task && !loading) {
    return null;
  }

  return (
    <div className="history-detail" onClick={onClose}>
      <div className="detail-content" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <h3>任务详情</h3>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="关闭详情"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="detail-body loading-state">
            <div className="loading-spinner">加载详情中...</div>
          </div>
        ) : task ? (
          <div className="detail-body">
            <div className="detail-row">
              <span className="detail-label">任务 ID:</span>
              <span className="detail-value">{task.taskId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">模式:</span>
              <span className="detail-value">
                <span className={`mode-badge ${task.mode}`}>
                  {task.mode === "single" ? "单模态" : "融合模式"}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">状态:</span>
              <span className="detail-value">
                <span className={`status-badge ${getStatusClass(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">客户端 ID:</span>
              <span className="detail-value">{task.clientId || "-"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">图片总数:</span>
              <span className="detail-value">{task.totalItems}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">成功/失败:</span>
              <span className="detail-value">
                {task.successfulItems} / {task.failedItems}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">真实/攻击:</span>
              <span className="detail-value">
                {task.realCount} / {task.fakeCount}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">处理耗时:</span>
              <span className="detail-value">{formatDuration(task.elapsedTimeMs)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">检测时间:</span>
              <span className="detail-value">{formatTime(task.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">完成时间:</span>
              <span className="detail-value">{formatTime(task.completedAt)}</span>
            </div>

            {/* 结果列表 */}
            {task.results && task.results.length > 0 && (
              <div className="detail-results">
                <h4>检测结果</h4>
                <div className="results-grid">
                  {task.results.map((result: unknown, idx: number) => {
                    const r = result as {
                      modality?: string;
                      imageIndex?: number;
                      result: string;
                      confidence: number;
                      error?: string;
                    };
                    return (
                      <div
                        key={idx}
                        className={`result-card ${
                          r.result === "error"
                            ? "error"
                            : r.result === "real"
                            ? "real"
                            : "fake"
                        }`}
                      >
                        <span className="result-label">
                          {r.modality ? r.modality.toUpperCase() : "UNKNOWN"}
                          {r.imageIndex !== undefined ? ` #${r.imageIndex}` : ""}
                        </span>
                        <span className="result-badge">{r.result}</span>
                        <span className="result-conf">
                          置信度：{(r.confidence * 100).toFixed(1)}%
                        </span>
                        {r.error && (
                          <span className="result-error">{r.error}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
