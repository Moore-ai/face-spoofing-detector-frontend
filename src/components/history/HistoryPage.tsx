import { useEffect } from "react";
import { useHistoryStore, filterHistoryItems, paginateItems } from "../../store/historyStore";
import {
  HistoryStatsPanel,
  HistoryFilters,
  HistoryTable,
  HistoryPagination,
  TaskDetailModal,
} from "./index";
import "../../css/App.css";

const PAGE_SIZE = 9;

/**
 * 历史记录页面组件
 * 所有状态由 historyStore 管理
 */
export function HistoryPage(): React.ReactElement {
  // 从 Store 获取状态
  const items = useHistoryStore((state) => state.items);
  const stats = useHistoryStore((state) => state.stats);
  const page = useHistoryStore((state) => state.page);
  const isLoading = useHistoryStore((state) => state.isLoading);
  const error = useHistoryStore((state) => state.error);
  const isDetailLoading = useHistoryStore((state) => state.isDetailLoading);
  const selectedTask = useHistoryStore((state) => state.selectedTask);
  const filters = useHistoryStore((state) => state.filters);

  // 从 Store 获取方法
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const reloadHistory = useHistoryStore((state) => state.reloadHistory);
  const deleteHistoryFromServer = useHistoryStore((state) => state.deleteHistoryFromServer);
  const handleFilterChange = useHistoryStore((state) => state.handleFilterChange);
  const resetFilters = useHistoryStore((state) => state.resetFilters);
  const setSelectedTask = useHistoryStore((state) => state.setSelectedTask);
  const setPage = useHistoryStore((state) => state.setPage);
  const fetchTaskDetail = useHistoryStore((state) => state.fetchTaskDetail);

  // 初始化加载
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 计算过滤和分页后的数据
  const filteredItems = filterHistoryItems(items, filters);
  const paginatedItems = paginateItems(filteredItems, page, PAGE_SIZE);
  const totalPages = calculateTotalPages(filteredItems.length, PAGE_SIZE);

  return (
    <div className="history-page">
      {/* 统计卡片 */}
      {stats && <HistoryStatsPanel stats={stats} />}

      {/* 过滤工具栏 */}
      <HistoryFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
        onRefresh={reloadHistory}
      />

      {/* 错误提示 */}
      {error && <div className="error-message">{error}</div>}

      {/* 历史列表 */}
      <HistoryTable
        historyItems={paginatedItems}
        selectedTask={selectedTask}
        loading={isLoading}
        onSelectTask={fetchTaskDetail}
        onDeleteServer={deleteHistoryFromServer}
      />

      {/* 分页 */}
      {totalPages > 1 && (
        <HistoryPagination
          page={page}
          totalPages={totalPages}
          total={filteredItems.length}
          onPageChange={setPage}
        />
      )}

      {/* 详情面板 */}
      <TaskDetailModal
        task={selectedTask}
        loading={isDetailLoading}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}

// 工具函数
function calculateTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}
