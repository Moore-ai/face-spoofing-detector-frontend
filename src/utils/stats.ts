import type { DetectionResultItem } from "../types";

/**
 * 检测结果统计信息
 */
export interface DetectionStats {
  realCount: number;
  fakeCount: number;
  errorCount: number;  // 错误计数
  totalCount: number;
  averageConfidence: number;
  realPercentage: number;
  fakePercentage: number;
  errorPercentage: number;  // 错误百分比
}

/**
 * 计算检测结果统计信息
 * 从 completedResults 数组中计算统计数据
 */
export function calculateDetectionStats(
  completedResults: DetectionResultItem[]
): DetectionStats {
  const realCount = completedResults.filter((r) => r.result === "real").length;
  const errorCount = completedResults.filter((r) => r.result === "error").length;
  const totalCount = completedResults.length;
  const fakeCount = totalCount - realCount - errorCount;  // 排除错误项

  // 平均置信度只计算成功的结果（real 和 fake），不包括错误项
  const validResults = completedResults.filter((r) => r.result !== "error");
  const averageConfidence =
    validResults.length > 0
      ? validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length
      : 0;

  const realPercentage = totalCount > 0 ? Math.round((realCount / totalCount) * 100) : 0;
  const fakePercentage = totalCount > 0 ? Math.round((fakeCount / totalCount) * 100) : 0;
  const errorPercentage = totalCount > 0 ? Math.round((errorCount / totalCount) * 100) : 0;

  return {
    realCount,
    fakeCount,
    errorCount,
    totalCount,
    averageConfidence,
    realPercentage,
    fakePercentage,
    errorPercentage,
  };
}
