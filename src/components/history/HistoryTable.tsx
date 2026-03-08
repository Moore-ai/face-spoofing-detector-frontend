import type { HistoryTaskItem } from "../../api/tauri";
import { formatTime, formatDuration, getStatusClass, getStatusLabel } from "./utils";
import { Checkbox } from "@mui/material";

interface HistoryTableProps {
  historyItems: HistoryTaskItem[];
  selectedTask: HistoryTaskItem | null;
  selectedIds: Set<string>;
  loading: boolean;
  onSelectTask: (task: HistoryTaskItem) => void;
  onDeleteServer: (taskId: string) => void;
  onToggleSelect: (taskId: string) => void;
}

export function HistoryTable({
  historyItems,
  selectedTask,
  selectedIds,
  loading,
  onSelectTask,
  onDeleteServer,
  onToggleSelect,
}: HistoryTableProps): React.ReactElement {
  if (loading) {
    return (
      <div className="history-list">
        <div className="loading-state">
          <div className="loading-spinner">查询中...</div>
        </div>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="history-list">
        <div className="empty-state">
          <p>暂无历史记录</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-list">
      <table className="history-table">
        <thead>
          <tr>
            <th style={{ width: "40px" }}>选择</th>
            <th>任务 ID</th>
            <th>模式</th>
            <th>状态</th>
            <th>图片数</th>
            <th>成功</th>
            <th>失败</th>
            <th>耗时</th>
            <th>检测时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {historyItems.map((item) => {
            const isSelected = selectedIds.has(item.taskId);
            return (
              <tr
                key={item.taskId}
                className={`${selectedTask?.taskId === item.taskId ? "selected" : ""} ${isSelected ? "row-selected" : ""}`}
                onClick={() => onSelectTask(item)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onToggleSelect(item.taskId)}
                    size="small"
                    sx={{
                      color: "#5f5f5f",
                      "&.Mui-checked": {
                        color: "#3794ff",
                      },
                    }}
                  />
                </td>
                <td className="task-id" title={item.taskId}>
                  {item.taskId.slice(-12)}
                </td>
                <td>
                  <span className={`mode-badge ${item.mode}`}>
                    {item.mode === "single" ? "单模态" : "融合"}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td>{item.totalItems}</td>
                <td>{item.successfulItems}</td>
                <td>{item.failedItems}</td>
                <td>{formatDuration(item.elapsedTimeMs)}</td>
                <td>{formatTime(item.createdAt)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => onDeleteServer(item.taskId)}
                    title="删除"
                    aria-label="删除任务记录"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
