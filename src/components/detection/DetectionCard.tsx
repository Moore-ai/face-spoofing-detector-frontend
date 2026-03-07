import type { DetectionResultItem } from "../../types";
import type { BaseProps } from "../../types";
import { ConfidenceBar } from "../ui/ConfidenceBar";
import { Chip, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";

interface DetectionCardProps extends BaseProps {
  result: DetectionResultItem;
  imagePreview?: string;
  index: number;
}

/**
 * 检测结果卡片组件
 * 显示单张图片的检测结果、置信度等信息
 */
export function DetectionCard({
  result,
  imagePreview,
  index,
  className = "",
}: DetectionCardProps): React.ReactElement {
  const isReal = result.result === "real";
  const isError = result.result === "error";

  // 根据结果类型选择不同的样式
  const cardVariants = {
    real: {
      borderLeft: "4px solid #10b981",
      background: "linear-gradient(145deg, #1f2937 0%, #252d3a 100%)",
      boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)",
    },
    fake: {
      borderLeft: "4px solid #ef4444",
      background: "linear-gradient(145deg, #1f2937 0%, #2d2525 100%)",
      boxShadow: "0 4px 6px -1px rgba(239, 68, 68, 0.2)",
    },
    error: {
      borderLeft: "4px solid #f59e0b",
      background: "linear-gradient(145deg, #1f2937 0%, #2d2a23 100%)",
      boxShadow: "0 4px 6px -1px rgba(245, 158, 11, 0.2)",
    },
  };

  const variant = isError ? "error" : isReal ? "real" : "fake";
  const resultInfo = isError
    ? { label: "检测失败", icon: <ErrorIcon />, color: "warning" }
    : isReal
    ? { label: "真人", icon: <CheckCircleIcon />, color: "success" }
    : { label: "伪人脸", icon: <WarningAmberIcon />, color: "error" };

  return (
    <div
      className={`detection-card ${className}`}
      style={{
        ...cardVariants[variant],
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px) scale(1.01)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}
    >
      {/* 卡片头部 */}
      <div className="card-header">
        <span className="card-index">
          <Typography variant="caption" sx={{ color: "#9ca3af", fontWeight: 600 }}>
            # {index + 1}
          </Typography>
        </span>
        <Chip
          icon={resultInfo.icon}
          label={resultInfo.label}
          size="small"
          sx={{
            backgroundColor: resultInfo.color === "success" ? "#0f766e" :
                             resultInfo.color === "error" ? "#b91c1c" : "#854d0e",
            color: "white",
            fontWeight: 600,
            fontSize: "0.75rem",
            "& .MuiChip-icon": {
              color: "white",
              fontSize: "1.2rem",
            },
          }}
        />
      </div>

      {/* 图片区域 */}
      {imagePreview && (
        <div className="card-image">
          <img src={imagePreview} alt={`检测结果 ${index + 1}`} />
        </div>
      )}

      {/* 卡片内容 */}
      <div className="card-content" style={{ paddingTop: "12px" }}>
        {!isError && (
          <>
            {/* 置信度条 */}
            <ConfidenceBar confidence={result.confidence} result={result.result} />

            {/* 详细信息 - 使用 MUI Typography 提升可读性 */}
            <div className="card-details" style={{ marginTop: "12px", gap: "12px" }}>
              <div className="detail-item">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AccessTimeIcon sx={{ fontSize: 14, color: "#6b7280" }} />
                  <Typography variant="caption" sx={{ color: "#9ca3af", fontWeight: 600 }}>
                    处理时间
                  </Typography>
                </div>
                <Typography
                  variant="body2"
                  sx={{ color: "#f3f4f6", fontWeight: 700, fontFamily: "monospace" }}
                >
                  {result.processingTime}ms
                </Typography>
              </div>

              <div className="detail-item">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <CalendarTodayIcon sx={{ fontSize: 14, color: "#6b7280" }} />
                  <Typography variant="caption" sx={{ color: "#9ca3af", fontWeight: 600 }}>
                    检测时间
                  </Typography>
                </div>
                <Typography
                  variant="body2"
                  sx={{ color: "#f3f4f6", fontWeight: 500, fontFamily: "monospace" }}
                >
                  {new Date(result.timestamp).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </Typography>
              </div>

              {/* 置信度数字显示 */}
              <div className="detail-item">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <TrendingUpIcon sx={{ fontSize: 14, color: "#6b7280" }} />
                  <Typography variant="caption" sx={{ color: "#9ca3af", fontWeight: 600 }}>
                    置信度
                  </Typography>
                </div>
                <Typography
                  variant="body2"
                  sx={{
                    color: isReal ? "#34d399" : "#f87171",
                    fontWeight: 700,
                    fontFamily: "monospace",
                  }}
                >
                  {(result.confidence * 100).toFixed(1)}%
                </Typography>
              </div>
            </div>
          </>
        )}
        {isError && (
          <div className="card-error-content" style={{ paddingTop: "16px" }}>
            <ErrorIcon sx={{ fontSize: 48, color: "#f59e0b" }} />
            <Typography
              variant="body2"
              sx={{
                color: "#f3f4f6",
                textAlign: "center",
                lineHeight: 1.6,
                marginTop: "12px",
              }}
            >
              {result.errorMessage || "推理过程中发生错误"}
            </Typography>
          </div>
        )}
      </div>
    </div>
  );
}
