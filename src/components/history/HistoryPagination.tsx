interface HistoryPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function HistoryPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: HistoryPaginationProps): React.ReactElement | null {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="history-pagination">
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        上一页
      </button>
      <span className="page-info">
        第 {page} 页 / 共 {totalPages} 页（{total} 条记录）
      </span>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        下一页
      </button>
    </div>
  );
}
