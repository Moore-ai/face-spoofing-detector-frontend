import type { DetectionMode, BaseProps } from "../../types";

interface ModeOption {
  id: DetectionMode;
  label: string;
  description: string;
}

export const MODE_OPTIONS: Readonly<ModeOption[]> = [
  {
    id: "single",
    label: "单模态模式",
    description: "处理RGB或IR单模态图像",
  },
  {
    id: "fusion",
    label: "融合模式",
    description: "处理RGB+IR双模态融合",
  },
] as const;

interface ModeSelectorProps extends BaseProps {
  currentMode: DetectionMode;
  onModeChange: (mode: DetectionMode) => void;
  disabled?: boolean;
  modeOptions?: Readonly<ModeOption[]>;
}

/**
 * 检测模式选择器组件
 * 支持单模态和融合模式切换
 */
export function ModeSelector({
  currentMode,
  onModeChange,
  disabled = false,
  modeOptions = MODE_OPTIONS,
  className = "",
}: ModeSelectorProps): React.ReactElement {
  return (
    <div className={`mode-selector ${className}`}>
      <h3 className="mode-selector-title">选择检测模式</h3>
      <div className="mode-options">
        {modeOptions.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`mode-option ${currentMode === mode.id ? "active" : ""}`}
            onClick={() => !disabled && onModeChange(mode.id)}
            disabled={disabled}
          >
            <span className="mode-option-label">{mode.label}</span>
            <span className="mode-option-description">{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
