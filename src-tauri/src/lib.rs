mod config;
mod util;

use config::{load_config, ConfigState};
use util::{
    detect_fusion_mode,
    detect_single_mode,
    get_supported_formats,
    validate_image
};
use reqwest::Client;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 加载配置
    let app_config = load_config()
        .expect("加载配置文件失败");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Client::new())
        .manage(ConfigState(Arc::new(app_config)))
        .invoke_handler(tauri::generate_handler![
            detect_single_mode,
            detect_fusion_mode,
            get_supported_formats,
            validate_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
