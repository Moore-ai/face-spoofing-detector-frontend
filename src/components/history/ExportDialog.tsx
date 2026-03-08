import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  TextField,
} from "@mui/material";

export type ExportFormat = 'json' | 'xml' | 'yaml';

interface ExportDialogProps {
  open: boolean;
  count: number;
  onClose: () => void;
  onConfirm: (format: ExportFormat, filename: string) => Promise<void> | void;
}

export function ExportDialog({
  open,
  count,
  onClose,
  onConfirm,
}: ExportDialogProps): React.ReactElement {
  const [format, setFormat] = useState<ExportFormat>('json');
  const [filename, setFilename] = useState('');

  // 生成默认文件名
  const generateDefaultFilename = (fmt: ExportFormat): string => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `历史记录_${timestamp}.${fmt}`;
  };

  // 当对话框打开或格式改变时，更新默认文件名
  useEffect(() => {
    if (open) {
      setFilename(generateDefaultFilename(format));
    }
  }, [open, format]);

  const handleConfirm = async () => {
    const finalFilename = filename.trim() || generateDefaultFilename(format);
    await onConfirm(format, finalFilename);
  };

  const handleClose = () => {
    setFormat('json');
    setFilename('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>导出历史记录</DialogTitle>

      <DialogContent>
        <div style={{ marginBottom: "16px", color: "#b7b7b7", fontSize: "13px" }}>
          将导出 {count} 条历史记录
        </div>

        <FormControl component="fieldset" fullWidth style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: "#808080", marginBottom: "8px" }}>
            选择导出格式
          </div>
          <RadioGroup
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            row
          >
            <FormControlLabel
              value="json"
              control={<Radio size="small" />}
              label={
                <span style={{ fontSize: "13px" }}>
                  JSON
                  <span style={{ color: "#808080", marginLeft: "4px" }}>(推荐)</span>
                </span>
              }
            />
            <FormControlLabel
              value="xml"
              control={<Radio size="small" />}
              label={<span style={{ fontSize: "13px" }}>XML</span>}
            />
            <FormControlLabel
              value="yaml"
              control={<Radio size="small" />}
              label={<span style={{ fontSize: "13px" }}>YAML</span>}
            />
          </RadioGroup>
        </FormControl>

        <TextField
          label="文件名"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          slotProps={{
            inputLabel: {
              style: { fontSize: "13px" },
            },
            input: {
              style: { fontSize: "13px" },
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

        <div style={{ marginTop: "12px", fontSize: "12px", color: "#808080" }}>
          文件将保存到：系统的下载目录
        </div>
      </DialogContent>

      <DialogActions sx={{ padding: "16px 24px" }}>
        <Button onClick={handleClose} color="inherit">
          取消
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={count === 0}
          sx={{
            backgroundColor: "#3794ff",
            color: "white",
            "&:hover": {
              backgroundColor: "#54a6ff",
            },
            "&:disabled": {
              backgroundColor: "#5f5f5f",
            },
          }}
        >
          导出
        </Button>
      </DialogActions>
    </Dialog>
  );
}
