import type { FilterState } from "./types";

interface HistoryFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
}

export function HistoryFilters({
  filters,
  onFilterChange,
  onReset,
}: HistoryFiltersProps): React.ReactElement {
  return (
    <div className="history-filters">
      {/* 模式过滤 */}
      <div className="filter-group">
        <label>模式：</label>
        <select
          value={filters.mode}
          onChange={(e) => onFilterChange("mode", e.target.value)}
          aria-label="选择检测模式"
        >
          <option value="">全部</option>
          <option value="single">单模态</option>
          <option value="fusion">融合模式</option>
        </select>
      </div>

      {/* 状态过滤 */}
      <div className="filter-group">
        <label>状态：</label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          aria-label="选择任务状态"
        >
          <option value="">全部</option>
          <option value="completed">完成</option>
          <option value="partial_failure">部分失败</option>
          <option value="failed">失败</option>
        </select>
      </div>

      {/* 时间过滤 */}
      <div className="filter-group">
        <label>时间：</label>
        <select
          value={filters.days}
          onChange={(e) => onFilterChange("days", e.target.value)}
          aria-label="选择时间范围"
        >
          <option value="">全部</option>
          <option value="1">最近 1 天</option>
          <option value="7">最近 7 天</option>
          <option value="30">最近 30 天</option>
          <option value="90">最近 90 天</option>
        </select>
      </div>

      {/* 重置按钮 */}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onReset}
      >
        刷新
      </button>
    </div>
  );
}
