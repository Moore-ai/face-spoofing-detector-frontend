import { Button, Tooltip } from "@mui/material";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import DeselectIcon from "@mui/icons-material/Deselect";
import DownloadIcon from "@mui/icons-material/Download";

interface HistoryBulkActionsProps {
  selectedIds: Set<string>;
  allFilteredIds: string[];
  showPagination: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExport: () => void;
}

export function HistoryBulkActions({
  selectedIds,
  allFilteredIds,
  showPagination,
  onSelectAll,
  onDeselectAll,
  onExport,
}: HistoryBulkActionsProps): React.ReactElement {
  return (
    <div className="bulk-actions" style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      ...(showPagination ? {
        marginLeft: "16px",
        paddingLeft: "16px",
        borderLeft: "1px solid #3e3e42"
      } : { marginLeft: "auto" })
    }}>
      <Tooltip title="全选所有历史记录">
        <Button
          variant="outlined"
          size="small"
          startIcon={<SelectAllIcon />}
          onClick={onSelectAll}
          sx={{
            color: "#3794ff",
            borderColor: "#3794ff",
            "&:hover": {
              borderColor: "#54a6ff",
              backgroundColor: "rgba(55, 148, 255, 0.08)",
            },
            textTransform: "none",
            fontSize: "12px",
          }}
        >
          全选
        </Button>
      </Tooltip>

      <Tooltip title="取消所有选择">
        <Button
          variant="outlined"
          size="small"
          startIcon={<DeselectIcon />}
          onClick={onDeselectAll}
          sx={{
            color: "#b7b7b7",
            borderColor: "#5f5f5f",
            "&:hover": {
              borderColor: "#808080",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
            },
            textTransform: "none",
            fontSize: "12px",
          }}
        >
          取消全选
        </Button>
      </Tooltip>

      <Tooltip title="导出选中记录">
        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={onExport}
          sx={{
            backgroundColor: "#3794ff",
            color: "white",
            "&:hover": {
              backgroundColor: "#54a6ff",
            },
            textTransform: "none",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          导出
        </Button>
      </Tooltip>

      <span style={{ color: "#808080", fontSize: "12px", marginLeft: "4px" }}>
        已选 {selectedIds.size} / {allFilteredIds.length} 项
      </span>
    </div>
  );
}
