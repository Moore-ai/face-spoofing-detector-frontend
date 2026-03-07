mod config;
mod shortcuts;
mod util;

use config::{load_config, ConfigState};
use shortcuts::{get_shortcuts_config, save_shortcuts_config_command};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;
use util::{
    activate_license,
    cancel_detection,
    connect_websocket,
    delete_history,
    detect_fusion_mode_async,
    detect_single_mode_async,
    get_all_history,
    get_history_stats,
    get_supported_formats,
    get_ws_status,
    query_history,
    validate_image,
    store_api_key,
    retrieve_api_key,
    delete_api_key,
    WsConnectionStateRef,
};
use reqwest::Client;
use std::time::Duration;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    log::info!("应用程序启动中...");

    let app_config = load_config().expect("加载配置文件失败");

    log::info!(
        "配置加载成功：{:?}",
        app_config.image.supported_formats
    );

    // 从环境变量读取 HTTP 客户端超时配置（单位：秒）
    let request_timeout_secs = std::env::var("HTTP_REQUEST_TIMEOUT")
        .ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(30);
    let connect_timeout_secs = std::env::var("HTTP_CONNECT_TIMEOUT")
        .ok()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(10);

    log::info!(
        "HTTP 客户端超时配置：请求超时={}s, 连接超时={}s",
        request_timeout_secs,
        connect_timeout_secs
    );

    // 创建带有超时配置的 HTTP 客户端
    let http_client = Client::builder()
        .timeout(Duration::from_secs(request_timeout_secs))
        .connect_timeout(Duration::from_secs(connect_timeout_secs))
        .build()
        .expect("Failed to create HTTP client");

    // 初始化 WebSocket 连接状态
    let ws_state: WsConnectionStateRef = Arc::new(Mutex::new(util::WsConnectionState::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(http_client)
        .manage(ConfigState(Arc::new(app_config)))
        .manage(ws_state)
        .setup(|app| {
            // 初始化快捷键配置
            let default_config = shortcuts::ShortcutConfig::default();
            let config = shortcuts::load_shortcuts_config().unwrap_or_else(|e| {
                log::warn!("加载快捷键配置失败：{}，使用默认配置", e);
                default_config.clone()
            });
            app.manage(shortcuts::ShortcutConfigState::new(config));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            detect_single_mode_async,
            detect_fusion_mode_async,
            cancel_detection,
            get_supported_formats,
            validate_image,
            connect_websocket,
            get_ws_status,
            activate_license,
            query_history,
            get_history_stats,
            delete_history,
            get_all_history,
            get_shortcuts_config,
            save_shortcuts_config_command,
            store_api_key,
            retrieve_api_key,
            delete_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
