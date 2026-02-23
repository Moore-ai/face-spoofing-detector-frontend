import { useCallback } from "react";
import "../App.css";

/**
 * 导航项 ID 类型
 * 预留扩展性，未来可添加更多导航选项
 */
export type NavItemId = "work" | "settings" | "history" | string;

/**
 * 导航项配置
 */
export interface NavItem {
  id: NavItemId;
  title: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

/**
 * ActivityBar Props
 */
export interface ActivityBarProps {
  activeTab: NavItemId | null;
  onTabChange: (tabId: NavItemId | null) => void;
  items?: NavItem[];
}

/**
 * VS Code 风格活动栏组件
 * 位于窗口最左侧，提供导航功能
 */
export function ActivityBar({
  activeTab,
  onTabChange,
  items,
}: ActivityBarProps): React.ReactElement {
  const handleClick = useCallback(
    (tabId: NavItemId) => {
      onTabChange(activeTab === tabId ? null : tabId);
    },
    [activeTab, onTabChange]
  );

  // 默认导航项（工作）
  const defaultItems: NavItem[] = [
    {
      id: "work",
      title: "工作",
      icon: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
    },
  ];

  const navItems = items ?? defaultItems;

  return (
    <aside className="activity-bar">
      <div className="activity-bar-content">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`activity-bar-item ${
              activeTab === item.id ? "active" : ""
            }`}
            onClick={() => !item.disabled && handleClick(item.id)}
            title={item.title}
            disabled={item.disabled}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </aside>
  );
}
