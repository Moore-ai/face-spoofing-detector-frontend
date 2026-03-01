import type { HistoryStatsResponse } from "../../api/tauri";
import { formatDuration } from "./utils";

interface HistoryStatsPanelProps {
  stats: HistoryStatsResponse;
}

export function HistoryStatsPanel({ stats }: HistoryStatsPanelProps): React.ReactElement {
  return (
    <div className="history-stats">
      <div className="stat-card">
        <span className="stat-value">{stats.totalTasks}</span>
        <span className="stat-label">总任务数</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.totalInferences}</span>
        <span className="stat-label">总推理数</span>
      </div>
      <div className="stat-card real">
        <span className="stat-value">{stats.totalReal}</span>
        <span className="stat-label">真实人脸</span>
      </div>
      <div className="stat-card fake">
        <span className="stat-value">{stats.totalFake}</span>
        <span className="stat-label">攻击人脸</span>
      </div>
      <div className="stat-card error">
        <span className="stat-value">{stats.totalErrors}</span>
        <span className="stat-label">错误次数</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{stats.successRate.toFixed(1)}%</span>
        <span className="stat-label">成功率</span>
      </div>
      <div className="stat-card">
        <span className="stat-value">{formatDuration(stats.avgProcessingTimeMs)}</span>
        <span className="stat-label">平均耗时</span>
      </div>
    </div>
  );
}
