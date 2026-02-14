use dotenv::dotenv;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;

/// 应用配置结构
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct AppConfig {
    pub image: ImageConfig,
}

/// 图片配置
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ImageConfig {
    pub supported_formats: Vec<String>,
    pub max_file_size_mb: u64,
}

/// 配置状态（用于Tauri State）
pub struct ConfigState(pub Arc<AppConfig>);

impl AppConfig {
    /// 从YAML文件加载配置
    pub fn from_yaml_file(path: &PathBuf) -> Result<Self, String> {
        let content =
            std::fs::read_to_string(path).map_err(|e| format!("读取配置文件失败: {}", e))?;

        let config: AppConfig =
            serde_yaml::from_str(&content).map_err(|e| format!("解析YAML失败: {}", e))?;

        Ok(config)
    }
}

/// 获取配置文件路径
/// 从.env文件中读取PROJECT_PATH环境变量，并拼接配置文件路径
pub fn get_config_path() -> Result<PathBuf, String> {
    // 加载.env文件
    dotenv().ok();

    // 从环境变量获取项目路径
    let project_path = std::env::var("PROJECT_PATH").map_err(|_| {
        "无法获取PROJECT_PATH环境变量，请检查.env文件是否存在并正确配置".to_string()
    })?;

    let config_path = PathBuf::from(project_path)
        .join("src-tauri")
        .join("config")
        .join("config.yaml");

    Ok(config_path)
}

/// 加载配置
pub fn load_config() -> Result<AppConfig, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Err(format!("配置文件不存在: {:?}", config_path));
    }

    AppConfig::from_yaml_file(&config_path)
}
