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
#[serde(rename_all = "camelCase")]
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
    pub abort_handle: Option<tokio::task::JoinHandle<()>>,
}

impl WsConnectionState {
    pub fn new() -> Self {
        Self {
            client_id: None,
            is_connected: false,
            abort_handle: None,
        }
    }
}

pub type WsConnectionStateRef = Arc<Mutex<WsConnectionState>>;

fn get_api_base_url() -> String {
    std::env::var("API_BASE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string())
}

/// 连接 WebSocket 并持续监听消息，转发给前端
/// 如果已有活跃连接，会先断开旧连接
#[tauri::command]
pub async fn connect_websocket(
    app: AppHandle,
    ws_state: State<'_, WsConnectionStateRef>,
    api_key: String,
) -> Result<String, String> {
    // 先断开旧连接（如果有）
    {
        let mut state = ws_state.lock().await;
        if let Some(handle) = state.abort_handle.take() {
            log::info!("断开旧的 WebSocket 连接");
            handle.abort();
        }
        state.client_id = None;
        state.is_connected = false;
    }

    let base_url = get_api_base_url()
        .replace("http://", "ws://")
        .replace("https://", "wss://");
    // 在 URL 中添加 API Key 查询参数进行认证
    let ws_url = format!("{}/infer/ws?api_key={}", base_url, api_key);

    let (ws_stream, _) = connect_async(&ws_url)
        .await
        .map_err(|e| format!("WebSocket 连接失败：{}", e))?;

    log::info!("WebSocket 连接已建立，等待 client_id...");

    // 更新连接状态
    {
        let mut state = ws_state.lock().await;
        state.is_connected = true;
    }

    // 发送连接成功事件（client_id 稍后确定）
    // 将 ws_stream 移动到 tokio::spawn 中处理
    let app_clone = app.clone();
    let ws_state_inner = ws_state.inner().clone();

    // 使用 tokio::spawn 启动监听任务，保存句柄用于取消
    let listen_task = tokio::spawn(async move {
        let (mut write, mut read) = ws_stream.split();
        let client_id: Option<String>;

        // 等待接收 client_id
        match read.next().await {
            Some(Ok(WsMessage::Text(text))) => {
                let msg: WsConnectedMessage = match serde_json::from_str(&text) {
                    Ok(m) => m,
                    Err(e) => {
                        log::error!("解析连接消息失败：{}", e);
                        return;
                    }
                };
                if msg.msg_type == "connected" {
                    client_id = Some(msg.client_id.clone());
                    log::info!("WebSocket 已连接，client_id: {}", msg.client_id);
                    let _ = app_clone.emit("ws_connected", &msg.client_id);
                } else {
                    log::error!("未收到正确的连接确认消息");
                    return;
                }
            }
            Some(Ok(msg)) => {
                log::error!("收到意外的 WebSocket 消息：{:?}", msg);
                return;
            }
            Some(Err(e)) => {
                log::error!("WebSocket 读取错误：{}", e);
                return;
            }
            None => {
                log::error!("WebSocket 连接意外关闭");
                return;
            }
        }

        // 收到 client_id 后更新状态
        if let Some(ref cid) = client_id {
            let mut state = ws_state_inner.lock().await;
            state.client_id = Some(cid.clone());
        }

        let mut heartbeat_interval = tokio::time::interval(tokio::time::Duration::from_secs(30));

        loop {
            tokio::select! {
                _ = heartbeat_interval.tick() => {
                    if write.send(WsMessage::Text("ping".to_string())).await.is_err() {
                        log::info!("WebSocket 心跳发送失败，断开连接");
                        break;
                    }
                }
                msg = read.next() => {
                    match msg {
                        Some(Ok(WsMessage::Text(text))) => {
                            if client_id.is_some() {
                                let app_ref = app_clone.clone();
                                if let Err(e) = handle_ws_message(&app_ref, &text) {
                                    log::error!("处理 WebSocket 消息失败：{}", e);
                                }
                            }
                        }
                        Some(Ok(WsMessage::Close(_))) | None => {
                            log::info!("WebSocket 连接关闭");
                            break;
                        }
                        Some(Err(e)) => {
                            log::error!("WebSocket 错误：{}", e);
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
        state.abort_handle = None;
        let _ = app_clone.emit("ws_disconnected", ());
    });

    // 保存任务句柄
    {
        let mut state = ws_state.lock().await;
        state.abort_handle = Some(listen_task);
    }

    // 返回临时的 client_id，实际 client_id 由监听任务确定
    // 前端通过 ws_connected 事件获取真正的 client_id
    Ok("pending".to_string())
}

/// 处理收到的 WebSocket 消息并转发给前端
fn handle_ws_message(app: &AppHandle, text: &str) -> Result<(), String> {
    let value: serde_json::Value = serde_json::from_str(text)
        .map_err(|e| format!("解析 JSON 失败：{}", e))?;

    let msg_type = value.get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    log::info!("收到 WebSocket 消息类型：{}, 完整消息：{}", msg_type, text);

    match msg_type {
        "task_completed" => {
            log::info!("收到 task_completed 消息");
            let data = value.get("data").ok_or("缺少 data 字段")?;
            let task_id = data.get("task_id").and_then(|v| v.as_str()).unwrap_or("");
            log::info!("任务 ID: {}", task_id);

            let event = WsEventMessage {
                event_type: "task_completed".to_string(),
                task_id: task_id.to_string(),
                status: Some(data.get("status").and_then(|v| v.as_str()).unwrap_or("completed").to_string()),
                message: data.get("message").and_then(|v| v.as_str()).map(|s| s.to_string()),
                result: None,
                total_items: data.get("total_items").and_then(|v| v.as_u64()).map(|v| v as u32),
                processed_items: data.get("processed_items").and_then(|v| v.as_u64()).map(|v| v as u32),
                completed_results: None,
            };

            log::info!("发送 ws_task_completed 事件到前端");
            if let Err(e) = app.emit("ws_task_completed", &event) {
                log::error!("发送事件失败：{}", e);
            } else {
                log::info!("任务完成事件已发送到前端：{}", event.task_id);
            }
        }
        "task_failed" => {
            let data = value.get("data").ok_or("缺少 data 字段")?;
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
            log::error!("任务失败：{}", event.task_id);
        }
        "progress_update" | "progress" => {
            log::info!("收到进度更新消息：{}", text);
            let data = value.get("data").ok_or("缺少 data 字段")?;
            let result = data.get("current_result").and_then(|r| r.as_object()).map(|r| DetectionResultItem {
                mode: r.get("mode").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                result: r.get("result").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                confidence: r.get("confidence").and_then(|v| v.as_f64()).unwrap_or(0.0),
                probabilities: r.get("probabilities")
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_f64()).collect())
                    .unwrap_or_default(),
                processing_time: r.get("processing_time").and_then(|v| v.as_u64()).unwrap_or(0),
            });
            log::info!("解析结果：{:?}", result.as_ref().map(|r| &r.result));

            let total = data.get("total_items").and_then(|v| v.as_u64()).map(|v| v as u32);
            let current = data.get("completed_items").and_then(|v| v.as_u64()).map(|v| v as u32);
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
            log::debug!("进度：{}% - {}", progress, event.message.as_deref().unwrap_or(""));
        }
        _ => {
            log::debug!("收到未知类型消息：{}", msg_type);
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
    api_key: String,
    http_client: State<'_, Client>,
) -> Result<AsyncTaskResponse, String> {
    let api_url = format!("{}/infer/single", get_api_base_url());

    log::info!("发送单模态推理请求到：{}", api_url);
    log::info!("client_id: {}, 图片数量：{}", client_id, request.images.len());

    let response = http_client
        .post(&api_url)
        .header("X-Client-Id", &client_id)
        .header("X-API-Key", &api_key)
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("网络请求失败：{}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        log::error!("推理请求失败：{} - {}", status, error_text);
        return Err(format!("服务器返回错误 ({}): {}", status, error_text));
    }

    // 先读取响应文本用于调试
    let response_text = response.text().await.map_err(|e| format!("读取响应失败：{}", e))?;
    log::info!("推理响应原始内容：{}", response_text);

    // 解析 JSON
    let task_response: AsyncTaskResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败：{}, 响应内容：{}", e, response_text))?;

    log::info!("任务创建成功：task_id={}", task_response.task_id);
    Ok(task_response)
}

/// 融合模式活体检测命令（异步模式）
#[tauri::command]
pub async fn detect_fusion_mode_async(
    request: FusionModeRequest,
    client_id: String,
    api_key: String,
    http_client: State<'_, Client>,
) -> Result<AsyncTaskResponse, String> {
    let api_url = format!("{}/infer/fusion", get_api_base_url());

    log::info!("发送融合模式推理请求到：{}", api_url);
    log::info!("client_id: {}, 图像对数量：{}", client_id, request.pairs.len());

    let response = http_client
        .post(&api_url)
        .header("X-Client-Id", &client_id)
        .header("X-API-Key", &api_key)
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("网络请求失败：{}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        log::error!("推理请求失败：{} - {}", status, error_text);
        return Err(format!("服务器返回错误 ({}): {}", status, error_text));
    }

    // 先读取响应文本用于调试
    let response_text = response.text().await.map_err(|e| format!("读取响应失败：{}", e))?;
    log::info!("推理响应原始内容：{}", response_text);

    // 解析 JSON
    let task_response: AsyncTaskResponse = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析响应失败：{}, 响应内容：{}", e, response_text))?;

    log::info!("任务创建成功：task_id={}", task_response.task_id);
    Ok(task_response)
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
        return Err(format!("文件不存在：{}", image_path));
    }

    if !path.is_file() {
        return Err(format!("路径不是文件：{}", image_path));
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
                    "不支持的图片格式：{}. 支持的格式：{}",
                    ext,
                    supported_formats.join(", ")
                ))
            }
        }
        None => Err(format!("无法获取文件扩展名：{}", image_path)),
    }
}

// ===== 激活码验证 =====

/// 激活码验证请求（发送到后端）
#[derive(Debug, Serialize)]
struct BackendActivateRequest {
    code: String,
}

/// 激活码验证响应（从后端返回）
#[derive(Debug, Serialize, Deserialize)]
struct BackendActivateResponse {
    api_key: String,
    message: String,
    expires_at: Option<String>,
}

/// 激活码验证请求（前端传入）
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateRequest {
    pub activation_code: String,
}

/// 激活码验证响应（返回给前端）
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateResponse {
    pub success: bool,
    pub message: String,
    pub api_key: Option<String>,
    pub expires_at: Option<String>,
}

/// 验证激活码并获取 API Key
#[tauri::command]
pub async fn activate_license(
    request: ActivateRequest,
    http_client: State<'_, Client>,
) -> Result<ActivateResponse, String> {
    let code = &request.activation_code;

    // 简单的格式验证：以 ACT- 开头
    if !code.starts_with("ACT-") || code.len() < 5 {
        return Ok(ActivateResponse {
            success: false,
            message: "激活码格式不正确".to_string(),
            api_key: None,
            expires_at: None,
        });
    }

    // 调用后端 API 验证激活码
    let api_url = format!("{}/auth/activate", get_api_base_url());

    let backend_request = BackendActivateRequest {
        code: code.clone(),
    };

    // 记录详细日志用于调试
    log::info!("发送激活码验证请求到：{}", api_url);
    log::info!("激活码：{}... (长度：{}, 字节：{:?})",
               &code[..8.min(code.len())],
               code.len(),
               code.as_bytes());

    let response = http_client
        .post(&api_url)
        .header("Content-Type", "application/json")
        .header("User-Agent", "frontend-tauri-app/0.1.0")
        .json(&backend_request)
        .send()
        .await
        .map_err(|e| format!("网络请求失败：{}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        log::error!("激活码验证失败：{} - {}", status, error_text);
        return Ok(ActivateResponse {
            success: false,
            message: format!("服务器返回错误 ({}): {}", status, error_text),
            api_key: None,
            expires_at: None,
        });
    }

    let backend_response: BackendActivateResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败：{}", e))?;

    log::info!("激活码 {} 激活成功，用户 ID: {}", &code[..8], backend_response.message);

    Ok(ActivateResponse {
        success: true,
        message: backend_response.message,
        api_key: Some(backend_response.api_key),
        expires_at: backend_response.expires_at,
    })
}
