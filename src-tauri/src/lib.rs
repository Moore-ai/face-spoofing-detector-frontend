mod config;
mod util;

use config::{load_config, ConfigState};
use std::sync::Arc;
use tokio::sync::Mutex;
use util::{
    connect_websocket,
    detect_fusion_mode,
    detect_fusion_mode_async,
    detect_single_mode,
    detect_single_mode_async,
    get_supported_formats,
    get_ws_status,
    validate_image,
    WsConnectionStateRef,
};
use reqwest::Client;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    log::info!("应用程序启动中...");

    let app_config = load_config().expect("加载配置文件失败");

    log::info!(
        "配置加载成功: {:?}",
        app_config.image.supported_formats
    );

    // 初始化WebSocket连接状态
    let ws_state: WsConnectionStateRef = Arc::new(Mutex::new(util::WsConnectionState {
        client_id: None,
        is_connected: false,
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Client::new())
        .manage(ConfigState(Arc::new(app_config)))
        .manage(ws_state)
        .invoke_handler(tauri::generate_handler![
            detect_single_mode,
            detect_single_mode_async,
            detect_fusion_mode,
            detect_fusion_mode_async,
            get_supported_formats,
            validate_image,
            connect_websocket,
            get_ws_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
