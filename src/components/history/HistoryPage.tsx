import { useEffect, useState } from "react";
import { useHistoryStore,
  filterHistoryItems, 
  paginateItems,
} from "../../store/historyStore";
import {
  HistoryStatsPanel,
  HistoryFilters,
  HistoryTable,
  HistoryPageBar,
  TaskDetailModal,
  ExportDialog,
} from "./index";
import { exportHistory, type ExportFormat } from "../../utils/exportUtils";
import { Snackbar, Alert } from "@mui/material";
import "../../css/App.css";

const DEFAULT_PAGE_SIZE = 9;
const SELECTED_PAGE_SIZE = 8;

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

  // 本地状态：选中的任务 ID 集合
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 导出对话框状态
  const [showExportDialog, setShowExportDialog] = useState(false);

  // 提示消息状态
  const [notification, setNotification] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({ show: false, success: true, message: '' });

  // 根据是否有选中项动态计算每页数量
  const pageSize = selectedIds.size > 0 ? SELECTED_PAGE_SIZE : DEFAULT_PAGE_SIZE;

  // 初始化加载
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 计算过滤后的所有数据
  const filteredItems = filterHistoryItems(items, filters);
  const totalPages = calculateTotalPages(filteredItems.length, pageSize);
  const paginatedItems = paginateItems(filteredItems, page, pageSize);

  // 当 pageSize 改变时，如果当前 page 超出范围，自动调整到最后一页
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages, setPage]);

  // 获取所有过滤后的 ID 列表
  const allFilteredIds = filteredItems.map((item) => item.taskId);

  // 处理切换选择
  const handleToggleSelect = (taskId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // 全选所有过滤结果
  const handleSelectAll = () => {
    setSelectedIds(new Set(allFilteredIds));
  };

  // 取消全选
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // 导出选中记录
  const handleExport = () => {
    setShowExportDialog(true);
  };

  // 确认导出
  const handleConfirmExport = async (format: ExportFormat, filename: string) => {
    try {
      const selectedItems = filteredItems.filter((item) => selectedIds.has(item.taskId));
      exportHistory(selectedItems, { format, filename });
      setNotification({
        show: true,
        success: true,
        message: `成功导出 ${selectedItems.length} 条记录到 ${filename}`,
      });
      setShowExportDialog(false);
    } catch (error) {
      setNotification({
        show: true,
        success: false,
        message: `导出失败：${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  // 删除历史记录
  const handleDeleteHistory = async (taskId: string) => {
    try {
      await deleteHistoryFromServer(taskId);
      setNotification({
        show: true,
        success: true,
        message: '已成功删除该条历史记录',
      });
      // 如果选中的是被删除的任务，清空选中
      if (selectedIds.has(taskId)) {
        const newSet = new Set(selectedIds);
        newSet.delete(taskId);
        setSelectedIds(newSet);
      }
    } catch (error) {
      setNotification({
        show: true,
        success: false,
        message: `删除失败：${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  // 关闭提示
  const handleCloseNotification = () => {
    setNotification({ ...notification, show: false });
  };

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
        selectedIds={selectedIds}
        loading={isLoading}
        onSelectTask={fetchTaskDetail}
        onDeleteServer={handleDeleteHistory}
        onToggleSelect={handleToggleSelect}
      />

      {/* 分页栏 */}
      {(totalPages > 1 || selectedIds.size > 0) && (
        <HistoryPageBar
          page={page}
          totalPages={totalPages}
          total={filteredItems.length}
          onPageChange={setPage}
          selectedIds={selectedIds}
          allFilteredIds={allFilteredIds}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onExport={handleExport}
        />
      )}

      {/* 详情面板 */}
      <TaskDetailModal
        task={selectedTask}
        loading={isDetailLoading}
        onClose={() => setSelectedTask(null)}
      />

      {/* 导出对话框 */}
      <ExportDialog
        open={showExportDialog}
        count={selectedIds.size}
        onClose={() => setShowExportDialog(false)}
        onConfirm={handleConfirmExport}
      />

      {/* 提示 */}
      <Snackbar
        open={notification.show}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.success ? 'success' : 'error'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

// 工具函数
function calculateTotalPages(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}
