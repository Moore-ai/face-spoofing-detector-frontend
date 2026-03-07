use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

/// 快捷键配置结构
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ShortcutConfig {
    pub start_detection: String,
    pub cancel_task: String,
    pub reset: String,
}

impl Default for ShortcutConfig {
    fn default() -> Self {
        ShortcutConfig {
            start_detection: "Ctrl+Enter".to_string(),
            cancel_task: "Escape".to_string(),
            reset: "Ctrl+R".to_string(),
        }
    }
}

/// 快捷键配置状态（用于 Tauri State）
pub struct ShortcutConfigState(pub Arc<tokio::sync::Mutex<ShortcutConfig>>);

impl ShortcutConfigState {
    pub fn new(config: ShortcutConfig) -> Self {
        ShortcutConfigState(Arc::new(tokio::sync::Mutex::new(config)))
    }
}

/// 获取快捷键配置文件路径
fn get_shortcuts_config_path() -> Result<PathBuf, String> {
    // 从环境变量获取项目路径
    let project_path = std::env::var("PROJECT_PATH").map_err(|_| {
        "无法获取 PROJECT_PATH 环境变量，请检查.env 文件是否存在并正确配置".to_string()
    })?;

    let config_path = PathBuf::from(project_path)
        .join("src-tauri")
        .join("config")
        .join("shortcuts.json");

    Ok(config_path)
}

/// 加载快捷键配置
pub fn load_shortcuts_config() -> Result<ShortcutConfig, String> {
    let config_path = get_shortcuts_config_path()?;

    if !config_path.exists() {
        log::info!("快捷键配置文件不存在，使用默认配置：{:?}", config_path);
        return Ok(ShortcutConfig::default());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("读取快捷键配置文件失败：{}", e))?;

    let config: ShortcutConfig = serde_json::from_str(&content)
        .map_err(|e| format!("解析 JSON 失败：{}", e))?;

    log::info!("快捷键配置加载成功：{:?}", config);
    Ok(config)
}

/// 保存快捷键配置
pub fn save_shortcuts_config(config: &ShortcutConfig) -> Result<(), String> {
    let config_path = get_shortcuts_config_path()?;

    // 确保目录存在
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("创建配置目录失败：{}", e))?;
    }

    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("序列化 JSON 失败：{}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("写入配置文件失败：{}", e))?;

    log::info!("快捷键配置已保存：{:?}", config_path);
    Ok(())
}

/// 允许单独使用的特殊键
fn is_allowed_standalone_key(key: &str) -> bool {
    matches!(key.to_uppercase().as_str(), "ESCAPE" | "ENTER" | "TAB" | "DELETE" | "BACKSPACE")
}

/// 验证快捷键格式是否有效
pub fn validate_shortcut(shortcut: &str) -> Result<(), String> {
    log::info!("validate_shortcut 收到：'{}' (len={})", shortcut, shortcut.len());

    // 逐字符打印
    for (i, c) in shortcut.chars().enumerate() {
        log::info!("  [{}] '{}' (u={})", i, c, c as u32);
    }

    if shortcut.trim().is_empty() {
        return Err("快捷键不能为空".to_string());
    }

    // 检查是否是允许单独使用的特殊键
    if is_allowed_standalone_key(shortcut) {
        log::info!("validate_shortcut: 允许的特殊键 '{}'", shortcut);
        return Ok(());
    }

    // 检查是否包含至少一个修饰键
    let has_modifier = shortcut.contains("Ctrl")
        || shortcut.contains("Alt")
        || shortcut.contains("Shift")
        || shortcut.contains("Meta");

    log::info!("validate_shortcut has_modifier: {}", has_modifier);
    log::info!("validate_shortcut contains('Ctrl'): {}", shortcut.contains("Ctrl"));
    log::info!("validate_shortcut contains('Alt'): {}", shortcut.contains("Alt"));
    log::info!("validate_shortcut contains('Shift'): {}", shortcut.contains("Shift"));
    log::info!("validate_shortcut contains('Meta'): {}", shortcut.contains("Meta"));

    if !has_modifier {
        return Err("快捷键必须包含至少一个修饰键（Ctrl/Alt/Shift/Meta），或使用特殊键（Escape/Enter）".to_string());
    }

    // 检查是否包含主键
    let keys: Vec<&str> = shortcut.split('+').collect();
    if keys.is_empty() {
        return Err("快捷键格式无效".to_string());
    }

    let main_key = keys.last().unwrap_or(&"");
    let modifiers = ["CTRL", "ALT", "SHIFT", "META"];

    if modifiers.contains(&main_key.to_uppercase().as_str()) {
        return Err("快捷键必须包含一个主键".to_string());
    }

    Ok(())
}

/// Tauri 命令：加载快捷键配置
#[tauri::command]
pub fn get_shortcuts_config(state: tauri::State<ShortcutConfigState>) -> Result<ShortcutConfig, String> {
    let config = state.0.blocking_lock();
    Ok(config.clone())
}

/// Tauri 命令：保存快捷键配置
#[tauri::command]
pub fn save_shortcuts_config_command(
    config: ShortcutConfig,
    state: tauri::State<ShortcutConfigState>,
) -> Result<(), String> {
    log::info!("save_shortcuts_config_command 收到配置：start_detection='{}', cancel_task='{}', reset='{}'",
               config.start_detection, config.cancel_task, config.reset);

    // 验证所有快捷键
    log::info!("验证 start_detection: '{}'", config.start_detection);
    validate_shortcut(&config.start_detection)?;
    log::info!("验证 cancel_task: '{}'", config.cancel_task);
    validate_shortcut(&config.cancel_task)?;
    log::info!("验证 reset: '{}'", config.reset);
    validate_shortcut(&config.reset)?;

    // 检查是否有重复的快捷键
    let mut seen = std::collections::HashSet::new();
    if !seen.insert(&config.start_detection) {
        return Err("快捷键冲突：开始检测的快捷键重复".to_string());
    }
    if !seen.insert(&config.cancel_task) {
        return Err("快捷键冲突：取消任务的快捷键重复".to_string());
    }
    if !seen.insert(&config.reset) {
        return Err("快捷键冲突：清空重置的快捷键重复".to_string());
    }

    // 保存到文件
    save_shortcuts_config(&config)?;

    // 更新内存中的配置
    let mut state_config = state.0.blocking_lock();
    *state_config = config.clone();

    log::info!("快捷键配置已更新：start_detection={}, cancel_task={}, reset={}",
               config.start_detection, config.cancel_task, config.reset);

    Ok(())
}
