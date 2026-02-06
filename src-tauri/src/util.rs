use serde::{Deserialize, Serialize};

/// 单模态检测请求
#[derive(Debug, Deserialize)]
pub struct SingleModeRequest {
    pub mode: String,
    pub modality: String,
    pub images: Vec<String>, // base64编码的图片
}

/// 融合模式请求中的图像对
#[derive(Debug, Deserialize)]
pub struct ImagePair {
    pub rgb: String,
    pub ir: String,
}

/// 融合模式检测请求
#[derive(Debug, Deserialize)]
pub struct FusionModeRequest {
    pub mode: String,
    pub pairs: Vec<ImagePair>,
}

/// 检测结果类型
#[derive(Debug, Serialize)]
pub struct DetectionResultItem {
    pub id: String,
    pub result: String, // "real" 或 "fake"
    pub confidence: f64,
    pub timestamp: String,
    pub processing_time: u64, // 毫秒
}

/// 批量检测结果
#[derive(Debug, Serialize)]
pub struct BatchDetectionResult {
    pub results: Vec<DetectionResultItem>,
    pub total_count: usize,
    pub real_count: usize,
    pub fake_count: usize,
    pub average_confidence: f64,
}

/// 单模态活体检测命令
#[tauri::command]
pub async fn detect_single_mode(request: SingleModeRequest) -> Result<BatchDetectionResult, String> {
    // TODO: 实现实际的检测逻辑
    // 这里返回模拟数据供前端开发使用
    
    let total = request.images.len();
    let mut results = Vec::with_capacity(total);
    
    for (i, _) in request.images.iter().enumerate() {
        results.push(DetectionResultItem {
            id: format!("single_{}_{}", i, chrono::Utc::now().timestamp_millis()),
            result: if i % 2 == 0 { "real".to_string() } else { "fake".to_string() },
            confidence: 0.85 + (i as f64 * 0.01) % 0.15,
            timestamp: chrono::Utc::now().to_rfc3339(),
            processing_time: 100 + (i as u64 * 10),
        });
    }
    
    let real_count = results.iter().filter(|r| r.result == "real").count();
    
    Ok(BatchDetectionResult {
        results,
        total_count: total,
        real_count,
        fake_count: total - real_count,
        average_confidence: 0.88,
    })
}

/// 融合模式活体检测命令
#[tauri::command]
pub async fn detect_fusion_mode(request: FusionModeRequest) -> Result<BatchDetectionResult, String> {
    // TODO: 实现实际的融合检测逻辑
    
    let total = request.pairs.len();
    let mut results = Vec::with_capacity(total);
    
    for (i, _) in request.pairs.iter().enumerate() {
        results.push(DetectionResultItem {
            id: format!("fusion_{}_{}", i, chrono::Utc::now().timestamp_millis()),
            result: if i % 3 == 0 { "fake".to_string() } else { "real".to_string() },
            confidence: 0.90 + (i as f64 * 0.005) % 0.1,
            timestamp: chrono::Utc::now().to_rfc3339(),
            processing_time: 150 + (i as u64 * 20),
        });
    }
    
    let real_count = results.iter().filter(|r| r.result == "real").count();
    
    Ok(BatchDetectionResult {
        results,
        total_count: total,
        real_count,
        fake_count: total - real_count,
        average_confidence: 0.92,
    })
}

/// 批量检测命令（通用接口）
#[tauri::command]
pub async fn batch_detect(
    image_paths: Vec<String>,
    mode: String,
) -> Result<BatchDetectionResult, String> {
    // TODO: 实现实际的批量检测逻辑
    
    let total = image_paths.len();
    let mut results = Vec::with_capacity(total);
    
    for (i, path) in image_paths.iter().enumerate() {
        results.push(DetectionResultItem {
            id: format!("batch_{}_{}", i, chrono::Utc::now().timestamp_millis()),
            result: if path.len() % 2 == 0 { "real".to_string() } else { "fake".to_string() },
            confidence: 0.80 + (i as f64 * 0.01) % 0.2,
            timestamp: chrono::Utc::now().to_rfc3339(),
            processing_time: 120 + (i as u64 * 15),
        });
    }
    
    let real_count = results.iter().filter(|r| r.result == "real").count();
    
    Ok(BatchDetectionResult {
        results,
        total_count: total,
        real_count,
        fake_count: total - real_count,
        average_confidence: 0.85,
    })
}

/// 获取支持的图片格式
#[tauri::command]
pub async fn get_supported_formats() -> Result<Vec<String>, String> {
    Ok(vec![
        "jpg".to_string(),
        "jpeg".to_string(),
        "png".to_string(),
        "bmp".to_string(),
        "webp".to_string(),
    ])
}

/// 验证图片有效性
#[tauri::command]
pub async fn validate_image(image_path: String) -> Result<bool, String> {
    // TODO: 实现实际的图片验证逻辑
    // 检查文件是否存在、格式是否正确等
    Ok(true)
}