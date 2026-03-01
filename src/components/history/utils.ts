/**
 * 格式化时间为本地化字符串
 */
export function formatTime(isoString?: string): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * 格式化持续时间
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms === 0) return "-";
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * 获取状态标签的 CSS 类名
 */
export function getStatusClass(status: string): string {
  switch (status) {
    case "completed":
      return "status-completed";
    case "partial_failure":
      return "status-partial";
    case "failed":
      return "status-failed";
    default:
      return "";
  }
}

/**
 * 获取状态标签的显示文本
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "完成";
    case "partial_failure":
      return "部分失败";
    case "failed":
      return "失败";
    default:
      return status;
  }
}
