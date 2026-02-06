// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod util;
use util::{
    detect_fusion_mode,
    detect_single_mode,
    batch_detect,
    get_supported_formats,
    validate_image
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            detect_single_mode,
            detect_fusion_mode,
            batch_detect,
            get_supported_formats,
            validate_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
