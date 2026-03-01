import { useState, useEffect, useCallback } from "react";
import {
  queryHistory,
  getHistoryStats,
  deleteHistory,
  type HistoryTaskItem,
  type HistoryQueryParams,
  type HistoryStatsResponse,
} from "../../api/tauri";
import {
  HistoryStatsPanel,
  HistoryFilters,
  HistoryTable,
  HistoryPagination,
  TaskDetailModal,
  type FilterState,
} from "./index";
import "../../css/App.css";

interface HistoryPageProps {
  clientId: string | null;
}

/**
 * 历史记录页面组件（纯服务器数据源）
 */
export function HistoryPage({ clientId }: HistoryPageProps): React.ReactElement {
  // 过滤条件
  const [filters, setFilters] = useState<FilterState>({
    mode: "",
    status: "",
    days: "",
  });

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // 服务器数据
  const [historyItems, setHistoryItems] = useState<HistoryTaskItem[]>([]);
  const [stats, setStats] = useState<HistoryStatsResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 详情加载状态
  const [detailLoading, setDetailLoading] = useState(false);

  // 选中的任务详情
  const [selectedTask, setSelectedTask] = useState<HistoryTaskItem | null>(null);

  // 加载服务器数据
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: HistoryQueryParams = {
        page,
        pageSize,
      };

      if (clientId) params.clientId = clientId;
      if (filters.mode) params.mode = filters.mode;
      if (filters.status) params.status = filters.status;
      if (filters.days) params.days = parseInt(filters.days, 10);

      const statsParams = {
        ...(clientId ? { clientId } : {}),
        ...(filters.mode ? { mode: filters.mode } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.days ? { days: parseInt(filters.days, 10) } : {}),
      };

      console.log("[HistoryPage] 开始加载数据，params:", params, "clientId:", clientId);
      const [historyRes, statsRes] = await Promise.all([
        queryHistory(params),
        getHistoryStats(Object.keys(statsParams).length > 0 ? statsParams : undefined),
      ]);
      console.log("[HistoryPage] 数据加载成功", historyRes, statsRes);

      setHistoryItems(historyRes.items);
      setTotal(historyRes.total);
      setTotalPages(historyRes.totalPages);
      setStats(statsRes);
    } catch (err) {
      console.error("[HistoryPage] 加载数据失败:", err);
      const msg = err instanceof Error ? err.message : "加载失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, clientId]);

  // 初始加载和过滤条件变化时重新加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 过滤条件变更时重置页码
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // 删除服务器任务
  const handleDelete = async (taskId?: string) => {
    if (!taskId) return;

    const confirmed = window.confirm("确定要删除这条历史记录吗？");
    if (!confirmed) return;

    try {
      await deleteHistory({ taskIds: [taskId] });
      // 删除后重新加载数据（包括统计信息）
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      setError(msg);
    }
  };

  // 查询任务详情
  const fetchTaskDetail = async (task: HistoryTaskItem) => {
    setDetailLoading(true);
    setSelectedTask(null);

    try {
      // 从服务器获取任务详情（包含 results）
      const response = await queryHistory({
        page: 1,
        pageSize: 100,
        ...(clientId ? { clientId } : {}),
      });
      const found = response.items.find((item) => item.taskId === task.taskId);

      if (found) {
        setSelectedTask(found);
      } else {
        setSelectedTask(task);
      }
    } catch (e) {
      console.error("[HistoryPage] 获取任务详情失败:", e);
      setSelectedTask(task);
    } finally {
      setDetailLoading(false);
    }
  };

  // 重置过滤器
  const handleReset = () => {
    setFilters({ mode: "", status: "", days: "" });
    setPage(1);
  };

  return (
    <div className="history-page">
      {/* 统计卡片 */}
      {stats && <HistoryStatsPanel stats={stats} />}

      {/* 过滤工具栏 */}
      <HistoryFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* 错误提示 */}
      {error && <div className="error-message">{error}</div>}

      {/* 历史列表 */}
      <HistoryTable
        historyItems={historyItems}
        selectedTask={selectedTask}
        loading={loading}
        onSelectTask={fetchTaskDetail}
        onDeleteServer={handleDelete}
      />

      {/* 分页 */}
      {totalPages > 1 && (
        <HistoryPagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}

      {/* 详情面板 */}
      <TaskDetailModal
        task={selectedTask}
        loading={detailLoading}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
