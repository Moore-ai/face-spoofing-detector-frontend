import {
  Box,
  Button,
  Typography,
  Container,
  Stack,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { deleteApiKey } from "../../api/tauri";
import {
  Settings as SettingsIcon,
  PersonOutlined as PersonIcon,
  StorageOutlined as StorageIcon,
  InfoOutlined as InfoIcon,
  LogoutOutlined as LogoutOutlinedIcon,
  DeleteOutlined as DeleteOutlinedIcon,
  DownloadOutlined as DownloadOutlinedIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import { ShortcutsSettings } from "./ShortcutsSettings";

/**
 * 设置页面组件
 * SaaS 产品标准设置页面设计
 * 聚焦于用户偏好和个人数据管理
 */
export function SettingsPage(): React.ReactElement {
  const theme = useTheme();
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState<boolean>(false);

  // 使用主题色
  const primaryColor = theme.palette.primary.main;
  const successColor = theme.palette.success.main;
  const bgPaper = theme.palette.background.paper;
  const bgDefault = theme.palette.background.default;
  const textPrimary = theme.palette.text.primary;
  const textSecondary = theme.palette.text.secondary;

  const sectionHeaderStyle = {
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
  };

  /**
   * 清除缓存
   */
  const handleClearCache = () => {
    localStorage.removeItem("app_config");
    setSuccessMessage("缓存已清除");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  /**
   * 确认登出
   */
  const handleConfirmLogout = () => {
    deleteApiKey();
    setSuccessMessage("已退出登录");
    setLogoutDialogOpen(false);
    setTimeout(() => window.location.reload(), 1000);
  };

  /**
   * 取消登出
   */
  const handleCancelLogout = () => {
    setLogoutDialogOpen(false);
  };

  const sectionTitleStyle = {
    fontSize: "15px",
    fontWeight: 600,
    color: textPrimary,
    mb: 0.5,
  };

  const sectionDescStyle = {
    fontSize: "13px",
    color: textSecondary,
    mb: 2,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: bgDefault,
        color: textPrimary,
        overflow: "hidden",
      }}
    >
      {/* 顶部导航栏 */}
      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
          borderBottom: "1px solid #2d2d30",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: bgPaper,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <SettingsIcon sx={{ fontSize: 20, color: textSecondary }} />
          <Typography sx={{ fontSize: "14px", fontWeight: 600, color: textSecondary }}>
            设置
          </Typography>
        </Box>

        {successMessage && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleIcon sx={{ fontSize: 16, color: successColor }} />
            <Typography sx={{ fontSize: "13px", color: successColor }}>{successMessage}</Typography>
          </Box>
        )}
      </Box>

      {/* 设置主容器 */}
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <Container
          maxWidth="md"
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
            py: { xs: 3, sm: 4 },
          }}
        >
          {/* 页面标题 */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 500, color: textPrimary, fontSize: { xs: "18px", sm: "20px", md: "22px" } }}>
              应用设置
            </Typography>
            <Typography sx={{ fontSize: { xs: "13px", sm: "14px", md: "15px" }, color: textSecondary }}>
              管理你的个人偏好、数据和账户设置
            </Typography>
          </Box>

          {/* Section: 账户信息 */}
          <Box sx={{ mt: 4 }}>
            <Typography sx={sectionHeaderStyle}>
              <PersonIcon sx={{ fontSize: 16 }} />
              账户信息
            </Typography>

            <Box sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: bgPaper,
              border: "1px solid #3c3c3c",
              borderRadius: 1,
            }}>
              <Typography sx={sectionTitleStyle}>
                激活状态
              </Typography>
              <Typography sx={sectionDescStyle}>
                当前设备已激活，可正常使用全部功能
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<LogoutOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={() => setLogoutDialogOpen(true)}
                  sx={{
                    borderColor: "#3c3c3c",
                    color: textPrimary,
                    "&:hover": { bgcolor: "#3c3c3c", borderColor: "#505050" }
                  }}
                >
                  注销产品
                </Button>
              </Stack>
            </Box>
          </Box>

          {/* Section: 使用偏好 */}
          <Box sx={{ mt: 4 }}>
            <Typography sx={sectionHeaderStyle}>
              <SettingsIcon sx={{ fontSize: 16 }} />
              使用偏好
            </Typography>

            <Box sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: bgPaper,
              border: "1px solid #3c3c3c",
              borderRadius: 1,
            }}>
              <Typography sx={sectionTitleStyle}>
                默认检测模式
              </Typography>
              <Typography sx={sectionDescStyle}>
                每次启动应用时默认使用的检测模式
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button variant="contained" sx={{ bgcolor: primaryColor }}>
                  单模态
                </Button>
                <Button variant="outlined" sx={{ borderColor: "#3c3c3c", color: textSecondary }}>
                  融合模式
                </Button>
              </Stack>
            </Box>

            <Box sx={{
              mt: 2,
              p: { xs: 2, sm: 3 },
              bgcolor: bgPaper,
              border: "1px solid #3c3c3c",
              borderRadius: 1,
            }}>
              <Typography sx={sectionTitleStyle}>
                历史记录保留期限
              </Typography>
              <Typography sx={sectionDescStyle}>
                本地历史记录的保存天数，超期自动清理
              </Typography>

              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <RadioGroup
                  row
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                >
                  <FormControlLabel
                    value={7}
                    control={<Radio size="small" />}
                    label="7 天"
                    sx={{
                      "& .MuiTypography-root": { fontSize: "13px", color: textSecondary },
                    }}
                  />
                  <FormControlLabel
                    value={30}
                    control={<Radio size="small" />}
                    label="30 天"
                    sx={{
                      "& .MuiTypography-root": { fontSize: "13px", color: textSecondary },
                    }}
                  />
                  <FormControlLabel
                    value={90}
                    control={<Radio size="small" />}
                    label="90 天"
                    sx={{
                      "& .MuiTypography-root": { fontSize: "13px", color: textSecondary },
                    }}
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          </Box>

          {/* Section: 快捷键绑定 */}
          <ShortcutsSettings />

          {/* Section: 数据与隐私 */}
          <Box sx={{ mt: 4 }}>
            <Typography sx={sectionHeaderStyle}>
              <StorageIcon sx={{ fontSize: 16 }} />
              数据与隐私
            </Typography>

            <Box sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: bgPaper,
              border: "1px solid #3c3c3c",
              borderRadius: 1,
            }}>
              <Typography sx={sectionTitleStyle}>
                本地数据管理
              </Typography>
              <Typography sx={sectionDescStyle}>
                清除缓存数据或导出个人检测结果
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<DeleteOutlinedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleClearCache}
                  sx={{
                    borderColor: "#3c3c3c",
                    color: textPrimary,
                    "&:hover": { bgcolor: "#3c3c3c", borderColor: "#505050" }
                  }}
                >
                  清除缓存
                </Button>
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={<DownloadOutlinedIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    borderColor: "#3c3c3c",
                    color: textPrimary,
                    "&:hover": { bgcolor: "#3c3c3c", borderColor: "#505050" }
                  }}
                >
                  导出数据
                </Button>
              </Stack>
            </Box>
          </Box>

          {/* Section: 关于 */}
          <Box sx={{ mt: 4 }}>
            <Typography sx={sectionHeaderStyle}>
              <InfoIcon sx={{ fontSize: 16 }} />
              关于
            </Typography>

            <Box sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: bgPaper,
              border: "1px solid #3c3c3c",
              borderRadius: 1,
            }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography sx={{ fontSize: "13px", color: textSecondary }}>
                  应用版本
                </Typography>
                <Typography sx={{ fontSize: "13px", color: textPrimary, fontFamily: "monospace" }}>
                  v1.0.0
                </Typography>
              </Box>
            </Box>

            {/* 版权信息 */}
            <Box sx={{ mt: 4, textAlign: "center" }}>
              <Typography sx={{ fontSize: "12px", color: textSecondary }}>
                © 2026 人脸活体检测系统
              </Typography>
              <Typography sx={{ fontSize: "11px", color: textSecondary, mt: 1 }}>
                技术支持：support@example.com
              </Typography>
            </Box>
          </Box>

          {/* 底部间距 */}
          <Box sx={{ height: 40 }} />
        </Container>
      </Box>

      {/* 登出确认对话框 */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleCancelLogout}
        aria-labelledby="logout-dialog-title"
      >
        <DialogTitle id="logout-dialog-title">
          确认注销产品？
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            注销后将清除所有本地数据，需要重新激活才能继续使用。确定要继续吗？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLogout} sx={{ color: textSecondary }}>
            取消
          </Button>
          <Button
            onClick={handleConfirmLogout}
            variant="contained"
            sx={{ bgcolor: "#d32f2f", "&:hover": { bgcolor: "#b71c1c" } }}
          >
            注销产品
          </Button>
        </DialogActions>
      </Dialog>

      {/* 底部状态栏 */}
      <Box
        sx={{
          height: "24px",
          bgcolor: primaryColor,
          display: "flex",
          alignItems: "center",
          px: { xs: 2, sm: 3 },
          gap: 3,
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: "12px", color: "#ffffff", display: "flex", alignItems: "center", gap: 0.5 }}>
          <SettingsIcon sx={{ fontSize: 13 }} /> 首选项
        </Typography>
        <Typography sx={{ fontSize: "12px", color: "#ffffff", opacity: 0.8 }}>
          服务状态：● 正常
        </Typography>
      </Box>
    </Box>
  );
}
