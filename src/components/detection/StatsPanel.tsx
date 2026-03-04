import type { DetectionStats } from "../../utils/stats";

interface StatsPanelProps {
  stats: DetectionStats;
}

/**
 * 统计面板组件 - 嵌入式紧凑风格
 * 统计信息作为顶部信息栏嵌入背景
 */
export function StatsPanel({ stats }: StatsPanelProps): React.ReactElement {
  const total = stats.totalCount || 1;
  const realPercent = (stats.realCount / total) * 100;
  const fakePercent = (stats.fakeCount / total) * 100;
  const errorPercent = (stats.errorCount / total) * 100;

  return (
    <div className="stats-panel-compact">
      {/* 进度条区域 */}
      <div className="stats-progress-section">
        <div className="stats-progress-bar">
          {realPercent > 0 && (
            <div
              className="progress-segment real"
              style={{ width: `${realPercent}%` }}
              title={`真人: ${stats.realCount} (${realPercent.toFixed(1)}%)`}
            />
          )}
          {fakePercent > 0 && (
            <div
              className="progress-segment fake"
              style={{ width: `${fakePercent}%` }}
              title={`伪人脸: ${stats.fakeCount} (${fakePercent.toFixed(1)}%)`}
            />
          )}
          {errorPercent > 0 && (
            <div
              className="progress-segment error"
              style={{ width: `${errorPercent}%` }}
              title={`错误: ${stats.errorCount} (${errorPercent.toFixed(1)}%)`}
            />
          )}
        </div>
      </div>

      {/* 紧凑统计数据 */}
      <div className="stats-compact-grid">
        <div className="stat-pill">
          <span className="stat-pill-icon real">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.5 5.5l-4.5 4.5-2-2L4 11.5 7 14l6-6-1.5-1.5z"/>
            </svg>
          </span>
          <span className="stat-pill-value">{stats.totalCount}</span>
          <span className="stat-pill-label">总计</span>
        </div>

        <div className="stat-pill">
          <span className="stat-pill-icon real">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.78 5.72l-4.5 5.5c-.26.32-.7.52-1.15.52-.22 0-.44-.04-.65-.13-.45-.19-.75-.62-.75-1.11V5.94l2.5-2c.2-.16.44-.25.69-.25.45 0 .83.3.98.73l4.28 4.25-.95.94z"/>
            </svg>
          </span>
          <span className="stat-pill-value">{stats.realCount}</span>
          <span className="stat-pill-text">真人</span>
          <span className="stat-pill-percent">{realPercent.toFixed(0)}%</span>
        </div>

        <div className="stat-pill">
          <span className="stat-pill-icon fake">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 10.5l-6.06 1.36.95-.95 4.86 4.86 1.36-1.36-1.11-2.91z"/>
            </svg>
          </span>
          <span className="stat-pill-value">{stats.fakeCount}</span>
          <span className="stat-pill-text">伪人脸</span>
          <span className="stat-pill-percent">{fakePercent.toFixed(0)}%</span>
        </div>

        {stats.errorCount > 0 && (
          <div className="stat-pill">
            <span className="stat-pill-icon error">
              <svg viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm1 12H7v-2h2v2zm0-3H7V4h2v5z"/>
              </svg>
            </span>
            <span className="stat-pill-value">{stats.errorCount}</span>
            <span className="stat-pill-text">错误</span>
            <span className="stat-pill-percent">{errorPercent.toFixed(0)}%</span>
          </div>
        )}

        <div className="stat-pill confidence-pill">
          <span className="stat-pill-icon confidence">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1l2.2 4.5 5 .7-3.6 3.5.8 5L8 12.5 3.6 15l.8-5L.8 6.2l5-.7L8 1z"/>
            </svg>
          </span>
          <span className="stat-pill-value">{Math.round(stats.averageConfidence * 100)}%</span>
          <span className="stat-pill-text">置信度</span>
          {/* 迷你置信度条 */}
          <div className="confidence-mini-bar">
            <div
              className="confidence-mini-fill"
              style={{ width: `${stats.averageConfidence * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
