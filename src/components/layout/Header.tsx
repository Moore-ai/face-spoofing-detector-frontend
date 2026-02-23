import type { BaseProps } from "../../types";

interface HeaderProps extends BaseProps {
  title?: string;
  subtitle?: string;
}

/**
 * 应用头部组件
 * 显示应用标题和描述
 */
export function Header({
  title = "人脸活体检测系统",
  subtitle = "基于深度学习的多模态活体检测解决方案",
  className = "",
}: HeaderProps): React.ReactElement {
  return (
    <header className={`app-header ${className}`}>
      <div className="header-content">
        <div className="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
            <path d="M12 11v4" />
            <path d="M9 14h6" />
          </svg>
        </div>
        <div className="header-text">
          <h1 className="header-title">{title}</h1>
          <p className="header-subtitle">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}
