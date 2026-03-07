import {
  Box,
  Typography,
  Stack,
  Button,
  InputAdornment,
  TextField,
  Alert,
} from "@mui/material";
import {
  KeyboardOutlined as KeyboardIcon,
  RefreshOutlined as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutlined as ErrorIcon,
} from "@mui/icons-material";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  useShortcutStore,
  formatShortcut,
  validateShortcut,
} from "../../store/shortcutStore";
import type { ShortcutActionId } from "../../types";

/**
 * 快捷键设置组件
 * 支持用户自定义快捷键绑定
 */
export function ShortcutsSettings(): React.ReactElement {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const bgPaper = theme.palette.background.paper;
  const textPrimary = theme.palette.text.primary;
  const textSecondary = theme.palette.text.secondary;

  // 从 store 获取配置和 action
  const config = useShortcutStore((state) => state.config);
  const updateShortcut = useShortcutStore((state) => state.updateShortcut);
  const restoreDefaults = useShortcutStore((state) => state.restoreDefaults);

  // 本地状态
  const [recordingId, setRecordingId] = useState<ShortcutActionId | null>(null);
  const [validationError, setValidationError] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  // 快捷键配置列表
  const shortcutBindings: Array<{
    actionId: ShortcutActionId;
    label: string;
    description: string;
  }> = [
    { actionId: "start_detection", label: "开始检测", description: "启动检测任务" },
    { actionId: "cancel_task", label: "取消任务", description: "取消正在进行的检测" },
    { actionId: "reset", label: "清空重置", description: "清空所有图片和结果" },
  ];

  /**
   * 开始录制快捷键
   */
  const startRecording = (actionId: ShortcutActionId) => {
    setRecordingId(actionId);
    setValidationError("");
  };

  /**
   * 处理快捷键录入
   */
  const handleKeyDown = async (
    event: React.KeyboardEvent,
    actionId: ShortcutActionId
  ) => {
    event.preventDefault();
    const shortcut = formatShortcut(event.nativeEvent);
    setValidationError("");

    console.log('[ShortcutsSettings] 录入快捷键:', shortcut);

    // 验证快捷键
    const validation = validateShortcut(shortcut);
    if (!validation.valid) {
      setValidationError(validation.error || "无效的快捷键");
      return;
    }

    console.log('[ShortcutsSettings] 验证通过，更新并保存:', actionId, shortcut);

    try {
      // 更新配置并保存到 Rust 后端
      await updateShortcut(actionId, shortcut);
      console.log('[ShortcutsSettings] 保存成功');
    } catch (err) {
      console.error('[ShortcutsSettings] 保存失败:', err);
      setValidationError(err instanceof Error ? err.message : '保存失败');
      return;
    }

    // 停止录制，显示成功提示
    setRecordingId(null);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  /**
   * 恢复默认设置并保存
   */
  const handleRestoreDefaults = async () => {
    await restoreDefaults();
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  return (
    <Box>
      {/* Section Header */}
      <Typography
        sx={{
          fontSize: "12px",
          fontWeight: 700,
          color: primaryColor,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          mb: 2,
          mt: 4,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <KeyboardIcon sx={{ fontSize: 16 }} />
        快捷键绑定
      </Typography>

      {/* 成功提示 */}
      {showSuccess && (
        <Box
          sx={{
            position: "fixed",
            top: 80,
            right: 20,
            zIndex: 9999,
            minWidth: 200,
          }}
        >
          <Alert
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
            severity="success"
            sx={{
              bgcolor: "rgba(137, 209, 133, 0.2)",
              color: "#89d185",
              border: "1px solid #89d185",
              "& .MuiAlert-icon": { color: "#89d185" },
            }}
          >
            设置已保存
          </Alert>
        </Box>
      )}

      {/* 快捷键设置卡片 */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          bgcolor: bgPaper,
          border: "1px solid #3c3c3c",
          borderRadius: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: "15px",
            fontWeight: 600,
            color: textPrimary,
            mb: 0.5,
          }}
        >
          自定义快捷键
        </Typography>
        <Typography
          sx={{
            fontSize: "13px",
            color: textSecondary,
            mb: 2,
          }}
        >
          点击输入框并按下键盘组合来设置快捷键
        </Typography>

        {/* 快捷键列表 */}
        <Stack spacing={2}>
          {shortcutBindings.map((binding) => {
            const currentShortcut = config[binding.actionId];
            const isRecording = recordingId === binding.actionId;

            return (
              <Box
                key={binding.actionId}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 2,
                  bgcolor: "#2d2d30",
                  borderRadius: 1,
                  border: isRecording
                    ? `1px solid ${primaryColor}`
                    : "1px solid #3c3c3c",
                }}
              >
                {/* 左侧：标签和描述 */}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: textPrimary,
                      mb: 0.5,
                    }}
                  >
                    {binding.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: textSecondary,
                    }}
                  >
                    {binding.description}
                  </Typography>
                </Box>

                {/* 右侧：快捷键输入 */}
                <TextField
                  variant="outlined"
                  value={isRecording ? "按下快捷键..." : currentShortcut}
                  placeholder="点击设置"
                  InputProps={{
                    readOnly: !isRecording,
                  } as any}
                  onClick={() => !isRecording && startRecording(binding.actionId)}
                  onKeyDown={(e) => isRecording && handleKeyDown(e, binding.actionId)}
                  onFocus={(e) => {
                    if (!isRecording) {
                      e.target.blur();
                      startRecording(binding.actionId);
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: isRecording && (
                        <InputAdornment position="start">
                          <KeyboardIcon
                            sx={{
                              fontSize: 16,
                              color: isRecording ? primaryColor : textSecondary,
                              animation: isRecording ? "pulse 1s infinite" : "none",
                            }}
                          />
                        </InputAdornment>
                      ),
                      sx: {
                        fontFamily: "monospace",
                        fontSize: "13px",
                        width: 180,
                        cursor: "pointer",
                        bgcolor: isRecording ? "#1e1e1e" : "#3c3c3c",
                        "& fieldset": {
                          borderColor: isRecording ? primaryColor : "#3c3c3c",
                        },
                      },
                    },
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      height: 36,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Stack>

        {/* 验证错误提示 */}
        {validationError && (
          <Alert
            icon={<ErrorIcon sx={{ fontSize: 16 }} />}
            severity="error"
            sx={{
              mt: 2,
              bgcolor: "rgba(244, 135, 113, 0.2)",
              color: "#f48771",
              border: "1px solid #f48771",
              "& .MuiAlert-icon": { color: "#f48771" },
            }}
          >
            {validationError}
          </Alert>
        )}

        {/* 恢复默认按钮 */}
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={handleRestoreDefaults}
            sx={{
              borderColor: "#3c3c3c",
              color: textPrimary,
              "&:hover": { bgcolor: "#3c3c3c", borderColor: "#505050" },
            }}
          >
            恢复默认
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
