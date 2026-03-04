import type { HistoryStatsResponse } from "../../api/tauri";
import { formatDuration } from "./utils";

interface HistoryStatsPanelProps {
  stats: HistoryStatsResponse;
}

/**
 * 历史记录统计面板 - 精简嵌入式
 * 采用高密度、紧凑的模块化设计，避免占用过多垂直空间
 */
export function HistoryStatsPanel({ stats }: HistoryStatsPanelProps): React.ReactElement {
  const successfulInferences = stats.totalReal + stats.totalFake;
  const successPercent = stats.totalInferences > 0
    ? (successfulInferences / stats.totalInferences) * 100
    : 0;

  return (
    <div className="history-stats-compact">
      <div className="compact-header">
        <div className="compact-title">
          <svg viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 2a3 3 0 0 0-3-3 3 3 0 0 0-3 3v2h6V2zM4 5v9a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5H4z"/>
          </svg>
          <span>数据概览</span>
        </div>
        <div className="compact-meta">
          {stats.dateRange?.start && (
            <span>{new Date(stats.dateRange.start).toLocaleDateString()} - {new Date(stats.dateRange.end).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      <div className="compact-grid">
        {/* 核心指标组 */}
        <div className="compact-group">
          <div className="compact-item">
            <span className="compact-label">任务</span>
            <span className="compact-value">{stats.totalTasks}</span>
          </div>
          <div className="compact-item">
            <span className="compact-label">总数</span>
            <span className="compact-value">{stats.totalInferences}</span>
          </div>
          <div className="compact-item success">
            <span className="compact-label">成功率</span>
            <span className="compact-value">{successPercent.toFixed(1)}%</span>
          </div>
        </div>

        {/* 结果分布组 */}
        <div className="compact-group distribution">
          <div className="compact-tile real">
            <div className="tile-dot" />
            <span className="tile-label">真</span>
            <span className="tile-value">{stats.totalReal}</span>
          </div>
          <div className="compact-tile fake">
            <div className="tile-dot" />
            <span className="tile-label">伪</span>
            <span className="tile-value">{stats.totalFake}</span>
          </div>
          <div className="compact-tile error">
            <div className="tile-dot" />
            <span className="tile-label">误</span>
            <span className="tile-value">{stats.totalErrors}</span>
          </div>
        </div>

        {/* 性能指标组 */}
        <div className="compact-group performance">
          <div className="compact-item">
            <span className="compact-label">平均耗时</span>
            <span className="compact-value font-mono">{formatDuration(stats.avgProcessingTimeMs)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
