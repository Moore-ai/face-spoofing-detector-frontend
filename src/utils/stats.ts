import type { DetectionResultItem } from "../types";

/**
 * 检测结果统计信息
 */
export interface DetectionStats {
  realCount: number;
  fakeCount: number;
  totalCount: number;
  averageConfidence: number;
  realPercentage: number;
  fakePercentage: number;
}

/**
 * 计算检测结果统计信息
 * 从 completedResults 数组中计算统计数据
 */
export function calculateDetectionStats(
  completedResults: DetectionResultItem[]
): DetectionStats {
  const realCount = completedResults.filter((r) => r.result === "real").length;
  const totalCount = completedResults.length;
  const fakeCount = totalCount - realCount;
  const averageConfidence =
    totalCount > 0
      ? completedResults.reduce((sum, r) => sum + r.confidence, 0) / totalCount
      : 0;
  const realPercentage = totalCount > 0 ? Math.round((realCount / totalCount) * 100) : 0;
  const fakePercentage = 100 - realPercentage;

  return {
    realCount,
    fakeCount,
    totalCount,
    averageConfidence,
    realPercentage,
    fakePercentage,
  };
}
