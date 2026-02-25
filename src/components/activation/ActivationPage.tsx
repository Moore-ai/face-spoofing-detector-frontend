import { useState } from "react";
import { activateLicense } from "../../api/tauri";
import { TitleBar } from "../layout/TitleBar";
import "../../css/Activation.css";

interface ActivationPageProps {
  onActivate?: () => void;
}

/**
 * 激活码认证页面组件
 * VSCode 风格深色主题
 */
export function ActivationPage({ onActivate }: ActivationPageProps): React.ReactElement {
  const [activationCode, setActivationCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 格式化激活码：自动添加连字符
  const formatActivationCode = (value: string): string => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const limited = cleaned.slice(0, 18);

    if (limited.length <= 3) return limited;
    if (limited.length <= 11) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    return `${limited.slice(0, 3)}-${limited.slice(3, 11)}-${limited.slice(11)}`;
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const formatted = formatActivationCode(cleaned);
    setActivationCode(formatted);
    setError(null);
    setIsValid(null);
  };

  // 处理粘贴
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const cleaned = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length > 0) {
      e.preventDefault();
      setActivationCode(formatActivationCode(cleaned));
      setError(null);
      setIsValid(null);
    }
  };

  // 验证激活码格式：只需以 ACT- 开头且长度大于 4
  const isValidFormat = (code: string): boolean => {
    return code.startsWith("ACT-") && code.length > 4;
  };

  // 清除输入
  const handleClear = () => {
    setActivationCode("");
    setError(null);
    setIsValid(null);
  };

  // 提交验证
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidFormat(activationCode)) {
      setError("激活码格式不正确");
      setIsValid(false);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await activateLicense({ activationCode });
      setIsValidating(false);

      if (response.success) {
        setIsValid(true);
        // 验证成功后等待 2.5 秒再进入主页面
        setTimeout(() => onActivate?.(), 2500);
      } else {
        setIsValid(false);
        setError(response.message || "激活码无效或已过期");
      }
    } catch (err) {
      setIsValidating(false);
      setIsValid(false);
      setError(err instanceof Error ? err.message : "验证失败，请重试");
    }
  };

  return (
    <div className="activation-page">
      <TitleBar />

      {/* 背景效果 */}
      <div className="activation-bg">
        <div className="activation-bg-gradient"></div>
        <div className="activation-bg-grid"></div>
      </div>

      {/* 主内容区 */}
      <div className="activation-container">
        {/* 徽标区域 */}
        <div className="activation-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="logo-title">人脸活体检测系统</h1>
          <p className="logo-subtitle">Face Liveness Detection System</p>
        </div>

        {/* 认证卡片 */}
        <div className={`activation-card ${isValid === true ? "success" : isValid === false ? "error" : ""}`}>
          <div className="activation-card-top"></div>

          <div className="activation-card-content">
            <div className="activation-header">
              <div className="activation-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2 className="activation-title">激活认证</h2>
              <p className="activation-subtitle">请输入您的产品激活码以继续使用</p>
            </div>

            <form onSubmit={handleSubmit} className="activation-form">
              <div className="input-wrapper">
                <input
                  type="text"
                  className={`activation-input ${isValid === true ? "valid" : isValid === false ? "invalid" : ""}`}
                  placeholder="ACT-XXXXXXXX-XXXXXXXX"
                  value={activationCode}
                  onChange={handleInputChange}
                  onPaste={handlePaste}
                  disabled={isValidating || isValid === true}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />

                {/* 清除按钮 - 有输入且未验证时显示 */}
                {activationCode && !isValidating && isValid !== true && (
                  <button type="button" className="clear-btn" onClick={handleClear} tabIndex={-1} title="清除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}

                {/* 加载状态 */}
                {isValidating && (
                  <div className="input-status">
                    <div className="status-spinner"></div>
                  </div>
                )}

                {/* 成功状态 */}
                {isValid === true && (
                  <div className="input-status success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}

                {/* 错误状态 */}
                {isValid === false && (
                  <div className="input-status error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                )}
              </div>

              {/* 格式提示 */}
              <div className="format-hint">
                <span className="hint-segment">ACT</span>
                <span className="hint-separator">-</span>
                <span className="hint-segment">XXXXXXXX</span>
                <span className="hint-separator">-</span>
                <span className="hint-segment">XXXXXXXX</span>
              </div>

              {/* 错误信息 */}
              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </div>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                className={`activation-btn ${!activationCode || isValidating || isValid === true ? "disabled" : ""}`}
                disabled={!activationCode || isValidating || isValid === true}
              >
                {isValidating ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>验证中...</span>
                  </>
                ) : isValid === true ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>已激活</span>
                  </>
                ) : (
                  <>
                    <span>立即激活</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 底部信息 */}
        <div className="activation-footer">
          <p>需要帮助？请联系技术支持</p>
          <p className="footer-copyright">© 2026 人脸活体检测系统 | Made by Moore-ai</p>
        </div>
      </div>
    </div>
  );
}
