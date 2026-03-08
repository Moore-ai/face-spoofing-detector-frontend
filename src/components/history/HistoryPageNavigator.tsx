import { useState, useRef } from "react";
import { TextField } from "@mui/material";

interface HistoryPageNavigatorProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function HistoryPageNavigator({
  page,
  totalPages,
  total,
  onPageChange,
}: HistoryPageNavigatorProps): React.ReactElement | null {
  if (totalPages <= 1) {
    return null;
  }

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(page.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // 当 page 改变时，如果不在编辑状态，则更新显示
  if (!isEditing && inputValue !== page.toString()) {
    setInputValue(page.toString());
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 只允许输入数字
    if (/^\d*$/.test(value)) {
      setInputValue(value);
    }
  };

  const handlePageInputBlur = () => {
    setIsEditing(false);
    // 验证并跳转
    const newPage = parseInt(inputValue);
    if (
      !isNaN(newPage) &&
      newPage >= 1 &&
      newPage <= totalPages &&
      newPage !== page
    ) {
      onPageChange(newPage);
    } else {
      // 恢复为当前页
      setInputValue(page.toString());
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      setInputValue(page.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className="page-navigator" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
      >
        <span className="page-arrow">&larr;</span> 上一页
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {isEditing ? (
          <TextField
            inputRef={inputRef}
            value={inputValue}
            onChange={handlePageInputChange}
            onBlur={handlePageInputBlur}
            onKeyDown={handlePageInputKeyDown}
            autoFocus
            size="small"
            variant="outlined"
            type="text"
            slotProps={{
              input: {
                style: {
                  textAlign: "center",
                  width: "45px",
                  padding: "4px 2px",
                  fontSize: "13px",
                  fontFamily: "'SF Mono', monospace",
                },
              },
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "6px",
                backgroundColor: "#1e1e1e",
                "& fieldset": {
                  borderColor: "#3e3e42",
                },
                "&:hover fieldset": {
                  borderColor: "#54a6ff",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#3794ff",
                },
              },
              "& input": {
                color: "#e5e5e5",
              },
            }}
          />
        ) : (
          <button
            type="button"
            className="page-number-btn"
            onClick={() => {
              setIsEditing(true);
              setInputValue(page.toString());
            }}
            title="点击编辑页码"
          >
            {inputValue}
          </button>
        )}
        <span style={{ color: "#b7b7b7", fontSize: "13px", fontFamily: "'SF Mono', monospace" }}>
          / {totalPages} 页（{total} 条记录）
        </span>
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
      >
        <span className="page-arrow">&rarr;</span> 下一页
      </button>
    </div>
  );
}
