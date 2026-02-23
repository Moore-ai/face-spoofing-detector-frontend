import type { ImageInfo, UserState } from "../../types";
import type { BaseProps } from "../../types";
import { calculateDetectionStats } from "../../utils/stats";
import { LoadingState, EmptyState, ResultsView } from "./ResultPanelStates";

interface ResultPanelProps extends BaseProps {
  images: ImageInfo[];
  isLoading?: boolean;
  userState?: UserState;
}

/**
 * 检测结果面板组件
 * 使用组合模式将不同状态分离为独立组件
 */
export function ResultPanel({
  images,
  isLoading = false,
  userState,
  className = "",
}: ResultPanelProps): React.ReactElement {
  const completedResults = userState?.completedResults || [];

  if (isLoading) {
    return <LoadingState progress={userState?.progress} className={className} />;
  }

  if (completedResults.length === 0) {
    return <EmptyState className={className} />;
  }

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
