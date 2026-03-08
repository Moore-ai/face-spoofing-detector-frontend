import { HistoryPageNavigator } from "./HistoryPageNavigator";
import { HistoryBulkActions } from "./HistoryBulkActions";

interface HistoryPageBarProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  selectedIds: Set<string>;
  allFilteredIds: string[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExport: () => void;
}

export function HistoryPageBar({
  page,
  totalPages,
  total,
  onPageChange,
  selectedIds,
  allFilteredIds,
  onSelectAll,
  onDeselectAll,
  onExport,
}: HistoryPageBarProps): React.ReactElement | null {
  const hasSelection = selectedIds.size > 0;
  const showPagination = totalPages > 1;

  // 如果没有分页且没有选中项，不显示组件
  if (!showPagination && !hasSelection) {
    return null;
  }

  return (
    <div className="history-pagination" style={{ display: "flex", alignItems: "center" }}>
      {/* 翻页部分 - 仅在多页时显示 */}
      {showPagination && (
        <HistoryPageNavigator
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={onPageChange}
        />
      )}

      {/* 批量操作按钮 - 有选中项时显示 */}
      {hasSelection && (
        <HistoryBulkActions
          selectedIds={selectedIds}
          allFilteredIds={allFilteredIds}
          showPagination={showPagination}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
          onExport={onExport}
        />
      )}
    </div>
  );
}
