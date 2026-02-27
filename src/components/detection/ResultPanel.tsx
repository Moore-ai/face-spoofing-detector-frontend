import type { ImageInfo, UserState } from "../../types";
import type { BaseProps } from "../../types";
import { calculateDetectionStats } from "../../utils/stats";
import { LoadingState, EmptyState, ResultsView } from "./ResultPanelStates";

interface ResultPanelProps extends BaseProps {
  images: ImageInfo[];
  status: string;
  userState?: UserState;
}

/**
 * 检测结果面板组件
 * 使用组合模式将不同状态分离为独立组件
 */
export function ResultPanel({
  images,
  status,
  userState,
  className = "",
}: ResultPanelProps): React.ReactElement {
  const completedResults = userState?.completedResults || [];

  // 有结果时优先显示结果（即使还在加载中）
  if (completedResults.length > 0) {
    const stats = calculateDetectionStats(completedResults);
    return (
      <ResultsView
        images={images}
        completedResults={completedResults}
        stats={stats}
        className={className}
      />
    );
  }

  // 没有结果时显示加载状态
  if (status === "connecting") {
    return <LoadingState reminder="正在连接..." className={className} />;
  } else if (status === "detecting") {
    return <LoadingState reminder="连接成功，开始推理..." className={className} />;
  }

  return <EmptyState className={className} />;
}
