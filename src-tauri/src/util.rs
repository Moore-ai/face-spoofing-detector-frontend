use crate::config::ConfigState;
use futures_util::{SinkExt, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;
use tokio_tungstenite::{connect_async, tungstenite::Message as WsMessage};

/// 单模态检测请求
#[derive(Debug, Serialize, Deserialize)]
pub struct SingleModeRequest {
    pub mode: String,
    pub modality: String,
    pub images: Vec<String>,
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

/// 检测结果项（来自 Python 后端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectionResultItem {
    pub mode: String,
    pub result: String,
    pub confidence: f64,
    pub probabilities: Vec<f64>,
    pub processing_time: u64,
}

/// 异步任务响应
#[derive(Debug, Serialize, Deserialize)]
pub struct AsyncTaskResponse {
    pub task_id: String,
    pub message: String,
}

/// WebSocket 连接响应
#[derive(Debug, Serialize, Deserialize)]
pub struct WsConnectedMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub client_id: String,
}

/// WebSocket 消息（转发给前端）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsEventMessage {
    pub event_type: String,
    pub task_id: String,
    pub status: Option<String>,
    pub message: Option<String>,
    pub result: Option<DetectionResultItem>,
    pub total_items: Option<u32>,
    pub processed_items: Option<u32>,
    pub completed_results: Option<Vec<DetectionResultItem>>,
}

/// WebSocket 连接状态
pub struct WsConnectionState {
    pub client_id: Option<String>,
    pub is_connected: bool,
}

pub type WsConnectionStateRef = Arc<Mutex<WsConnectionState>>;

fn get_api_base_url() -> String {
    std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string())
}

/// 连接 WebSocket 并持续监听消息，转发给前端
#[tauri::command]
pub async fn connect_websocket(
    app: AppHandle,
    ws_state: State<'_, WsConnectionStateRef>,
) -> Result<String, String> {
    let ws_url = get_api_base_url()
        .replace("http://", "ws://")
        .replace("https://", "wss://");
    let ws_url = format!("{}/infer/ws", ws_url);

    let (ws_stream, _) = connect_async(&ws_url)
        .await
        .map_err(|e| format!("WebSocket连接失败: {}", e))?;

    let (mut write, mut read) = ws_stream.split();

    // 等待接收 client_id
    let client_id = match read.next().await {
        Some(Ok(WsMessage::Text(text))) => {
            let msg: WsConnectedMessage = serde_json::from_str(&text)
                .map_err(|e| format!("解析WebSocket消息失败: {}", e))?;
            if msg.msg_type == "connected" {
                msg.client_id
            } else {
                return Err("未收到正确的连接确认消息".to_string());
            }
        }
        Some(Ok(msg)) => {
            return Err(format!("收到意外的WebSocket消息: {:?}", msg));
        }
        Some(Err(e)) => {
            return Err(format!("WebSocket读取错误: {}", e));
        }
        None => {
            return Err("WebSocket连接意外关闭".to_string());
        }
    };

    // 更新连接状态
    {
        let mut state = ws_state.lock().await;
        state.client_id = Some(client_id.clone());
        state.is_connected = true;
    }

    log::info!("WebSocket已连接，client_id: {}", client_id);

    // 发送连接成功事件
    let _ = app.emit("ws_connected", &client_id);

    // 保持连接并持续监听消息
    let app_clone = app.clone();
    let ws_state_inner = ws_state.inner().clone();

    tokio::spawn(async move {
        let mut heartbeat_interval = tokio::time::interval(tokio::time::Duration::from_secs(30));

        loop {
            tokio::select! {
                _ = heartbeat_interval.tick() => {
                    if write.send(WsMessage::Text("ping".to_string())).await.is_err() {
                        break;
                    }
                }
                msg = read.next() => {
                    match msg {
                        Some(Ok(WsMessage::Text(text))) => {
                            if let Err(e) = handle_ws_message(&app_clone, &text) {
                                log::error!("处理WebSocket消息失败: {}", e);
                            }
                        }
                        Some(Ok(WsMessage::Close(_))) | None => {
                            log::info!("WebSocket连接关闭");
                            break;
                        }
                        Some(Err(e)) => {
                            log::error!("WebSocket错误: {}", e);
                            break;
                        }
                        _ => {}
                    }
                }
            }
        }

        // 连接断开后更新状态
        let mut state = ws_state_inner.lock().await;
        state.client_id = None;
        state.is_connected = false;
        let _ = app_clone.emit("ws_disconnected", ());
    });

    Ok(client_id)
}

/// 处理收到的WebSocket消息并转发给前端
fn handle_ws_message(app: &AppHandle, text: &str) -> Result<(), String> {
    let value: serde_json::Value = serde_json::from_str(text)
        .map_err(|e| format!("解析JSON失败: {}", e))?;

    let msg_type = value.get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    match msg_type {
        "task_completed" => {
            let data = value.get("data").ok_or("缺少data字段")?;
            let event = WsEventMessage {
                event_type: "task_completed".to_string(),
                task_id: data.get("task_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                status: Some(data.get("status").and_then(|v| v.as_str()).unwrap_or("completed").to_string()),
                message: data.get("message").and_then(|v| v.as_str()).map(|s| s.to_string()),
                result: None,
                total_items: data.get("total_items").and_then(|v| v.as_u64()).map(|v| v as u32),
                processed_items: data.get("processed_items").and_then(|v| v.as_u64()).map(|v| v as u32),
                completed_results: None,
            };
            let _ = app.emit("ws_task_completed", &event);
            log::info!("任务完成: {}", event.task_id);
        }
        "task_failed" => {
            let data = value.get("data").ok_or("缺少data字段")?;
            let event = WsEventMessage {
                event_type: "task_failed".to_string(),
                task_id: data.get("task_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                status: Some("failed".to_string()),
                message: data.get("message").and_then(|v| v.as_str()).map(|s| s.to_string()),
                result: None,
                total_items: None,
                processed_items: None,
                completed_results: None,
            };
            let _ = app.emit("ws_task_failed", &event);
            log::error!("任务失败: {}", event.task_id);
        }
        "progress" => {
            let data = value.get("data").ok_or("缺少data字段")?;
            let result = data.get("result").map(|r| DetectionResultItem {
                mode: r.get("mode").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                result: r.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                confidence: r.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.0),
                probabilities: r.get("probabilities")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_f64()).collect())
                    .unwrap_or_default(),
                processing_time: r.get("processing_time").and_then(|v| v.as_u64()).unwrap_or(0),
            });

            let total = data.get("total").and_then(|v| v.as_u64()).map(|v| v as u32);
            let current = data.get("current").and_then(|v| v.as_u64()).map(|v| v as u32);
            let progress = if let (Some(t), Some(c)) = (total, current) {
                if t > 0 { (c as f64 / t as f64 * 100.0) as u32 } else { 0 }
            } else {
                0
            };

            let event = WsEventMessage {
                event_type: "progress".to_string(),
                task_id: data.get("task_id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                status: Some("running".to_string()),
                message: data.get("message").and_then(|v| v.as_str()).map(|s| s.to_string()),
                result,
                total_items: total,
                processed_items: current,
                completed_results: None,
            };
            let _ = app.emit("ws_progress", &event);
            log::debug!("进度: {}% - {}", progress, event.message.as_deref().unwrap_or(""));
        }
        _ => {
            log::debug!("收到未知类型消息: {}", msg_type);
        }
    }

    Ok(())
}

/// 获取连接状态
#[tauri::command]
pub fn get_ws_status(
    ws_state: State<'_, WsConnectionStateRef>,
) -> Result<(Option<String>, bool), String> {
    let state = ws_state.blocking_lock();
    Ok((state.client_id.clone(), state.is_connected))
}

/// 单模态活体检测命令（异步模式）
#[tauri::command]
pub async fn detect_single_mode_async(
    request: SingleModeRequest,
    client_id: String,
    http_client: State<'_, Client>,
) -> Result<AsyncTaskResponse, String> {
    let api_url = format!("{}/infer/single", get_api_base_url());

    let response = http_client
        .post(&api_url)
        .header("X-Client-Id", &client_id)
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("服务器返回错误 ({}): {}", status, error_text));
    }

    response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))
}

/// 融合模式活体检测命令（异步模式）
#[tauri::command]
pub async fn detect_fusion_mode_async(
    request: FusionModeRequest,
    client_id: String,
    http_client: State<'_, Client>,
) -> Result<AsyncTaskResponse, String> {
    let api_url = format!("{}/infer/fusion", get_api_base_url());

    let response = http_client
        .post(&api_url)
        .header("X-Client-Id", &client_id)
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("服务器返回错误 ({}): {}", status, error_text));
    }

    response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))
}

/// 单模态活体检测命令（同步模式，保留兼容）
#[tauri::command]
pub async fn detect_single_mode(
    request: SingleModeRequest,
    client: State<'_, Client>,
) -> Result<serde_json::Value, String> {
    let api_url = format!("{}/infer/single", get_api_base_url());

    let request_body = serde_json::json!({
        "mode": request.mode,
        "modality": request.modality,
        "images": request.images
    });

    let response = client
        .post(&api_url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("服务器返回错误 ({}): {}", status, error_text));
    }

    response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))
}

/// 融合模式活体检测命令（同步模式，保留兼容）
#[tauri::command]
pub async fn detect_fusion_mode(
    request: FusionModeRequest,
    client: State<'_, Client>,
) -> Result<serde_json::Value, String> {
    let api_url = format!("{}/infer/fusion", get_api_base_url());

    let request_body = serde_json::json!({
        "mode": request.mode,
        "pairs": request.pairs
    });

    let response = client
        .post(&api_url)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("服务器返回错误 ({}): {}", status, error_text));
    }

    response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))
}

/// 获取支持的图片格式
#[tauri::command]
pub fn get_supported_formats(config: State<'_, ConfigState>) -> Result<Vec<String>, String> {
    Ok(config.0.image.supported_formats.clone())
}

/// 验证图片有效性
#[tauri::command]
pub fn validate_image(
    image_path: String,
    config: State<'_, ConfigState>,
) -> Result<bool, String> {
    use std::path::Path;

    let supported_formats = get_supported_formats(config)?;
    let path = Path::new(&image_path);

    if !path.exists() {
        return Err(format!("文件不存在: {}", image_path));
    }

    if !path.is_file() {
        return Err(format!("路径不是文件: {}", image_path));
    }

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

// ===== 激活码验证 =====

/// 激活码验证请求
#[derive(Debug, Serialize, Deserialize)]
pub struct ActivateRequest {
    pub activation_code: String,
}

/// 激活码验证响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ActivateResponse {
    pub success: bool,
    pub message: String,
    pub expires_at: Option<String>,
}

/// 验证激活码
#[tauri::command]
pub async fn activate_license(
    request: ActivateRequest,
) -> Result<ActivateResponse, String> {
    // 这里实现实际的激活码验证逻辑
    // 目前返回模拟成功响应

    // 简单的格式验证：ACT-XXXXXXXX-XXXXXXXX
    let code = &request.activation_code;
    if code.len() != 21 {
        return Ok(ActivateResponse {
            success: false,
            message: "激活码格式不正确".to_string(),
            expires_at: None,
        });
    }

    // 模拟网络请求延迟
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

    // TODO: 实际项目中应该调用后端 API 验证激活码
    // 例如：POST /api/activate { activation_code: "..." }

    Ok(ActivateResponse {
        success: true,
        message: "激活成功".to_string(),
        expires_at: None,
    })
}
