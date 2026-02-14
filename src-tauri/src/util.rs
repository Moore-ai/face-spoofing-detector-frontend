use crate::config::ConfigState;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 单模态检测请求
#[derive(Debug, Deserialize)]
pub struct SingleModeRequest {
    pub mode: String,
    pub modality: String,
    pub images: Vec<String>, // base64编码的图片
}

/// 融合模式请求中的图像对
#[derive(Debug, Serialize, Deserialize)]
pub struct ImagePair {
    pub rgb: String,
    pub ir: String,
}

/// 融合模式检测请求
#[derive(Debug, Serialize, Deserialize)]
pub struct FusionModeRequest {
    pub mode: String,
    pub pairs: Vec<ImagePair>,
}

/// 检测结果类型
#[derive(Debug, Serialize, Deserialize)]
pub struct DetectionResultItem {
    pub id: String,
    pub result: String, // "real" 或 "fake"
    pub confidence: f64,
    pub timestamp: String,
    pub processing_time: u64, // 毫秒
}

/// 批量检测结果
#[derive(Debug, Serialize, Deserialize)]
pub struct BatchDetectionResult {
    pub results: Vec<DetectionResultItem>,
    pub total_count: usize,
    pub real_count: usize,
    pub fake_count: usize,
    pub average_confidence: f64,
}

/// 单模态活体检测命令
#[tauri::command]
pub async fn detect_single_mode(
    request: SingleModeRequest,
    client: State<'_, Client>,
) -> Result<BatchDetectionResult, String> {
    // 从环境变量获取后端 API 基础地址
    let api_base_url = std::env::var("API_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let api_url = format!("{}/infer/single", api_base_url);

    // 构建请求体
    let request_body = serde_json::json!({
        "mode": request.mode,
        "modality": request.modality,
        "images": request.images
    });

    // 发送 POST 请求
    let response = client
        .post(&api_url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    // 检查响应状态
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("服务器返回错误 ({}): {}", status, error_text));
    }

    // 解析响应
    let api_response: BatchDetectionResult = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    Ok(api_response)
}

/// 融合模式活体检测命令
#[tauri::command]
pub async fn detect_fusion_mode(
    request: FusionModeRequest,
    client: State<'_, Client>,
) -> Result<BatchDetectionResult, String> {
    // 从环境变量获取后端 API 基础地址
    let api_base_url = std::env::var("API_BASE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let api_url = format!("{}/infer/fusion", api_base_url);

    // 构建请求体
    let request_body = serde_json::json!({
        "mode": request.mode,
        "pairs": request.pairs
    });

    // 发送 POST 请求
    let response = client
        .post(&api_url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    // 检查响应状态
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("服务器返回错误 ({}): {}", status, error_text));
    }

    // 解析响应
    let api_response: BatchDetectionResult = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    Ok(api_response)
}

/// 获取支持的图片格式
#[tauri::command]
pub fn get_supported_formats(
    config: State<'_, ConfigState>,
) -> Result<Vec<String>, String> {
    Ok(config.0.image.supported_formats.clone())
}

/// 验证图片有效性
#[tauri::command]
pub fn validate_image(
    image_path: String,
    config: State<'_, ConfigState>,
) -> Result<bool, String> {
    use std::path::Path;

    // 获取支持的图片格式
    let supported_formats = get_supported_formats(config)?;

    let path = Path::new(&image_path);

    // 检查文件是否存在
    if !path.exists() {
        return Err(format!("文件不存在: {}", image_path));
    }

    // 检查是否是文件（不是目录）
    if !path.is_file() {
        return Err(format!("路径不是文件: {}", image_path));
    }

    // 检查文件扩展名
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase());

    match extension {
        Some(ext) => {
            if supported_formats.contains(&ext) {
                Ok(true)
            } else {
                Err(format!(
                    "不支持的图片格式: {}. 支持的格式: {}",
                    ext,
                    supported_formats.join(", ")
                ))
            }
        }
        None => Err(format!("无法获取文件扩展名: {}", image_path)),
    }
}