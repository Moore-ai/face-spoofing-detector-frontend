# 客户端 - 服务器通信文档

**版本**: 2.0
**最后更新**: 2026-02-27
**适用系统**: 人脸活体检测系统（Tauri + React 前端 + FastAPI 后端）

---

## 目录

1. [架构概览](#架构概览)
2. [认证流程](#认证流程)
3. [HTTP API 通信](#http-api-通信)
4. [WebSocket 通信](#websocket-通信)
5. [异步检测任务流程](#异步检测任务流程)
6. [消息格式详解](#消息格式详解)
7. [错误处理](#错误处理)
8. [连接管理](#连接管理)

---

## 架构概览

### 系统组件

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端 (Tauri)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React UI  │  │  Rust 后端  │  │  HTTP Client (reqwest)  │   │
│  │  (TypeScript)│  │  (tauri.rs) │  │  WebSocket (tungstenite)│ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      服务器 (FastAPI + Python)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  HTTP Router│  │  WebSocket  │  │   Inference Service     │ │
│  │ (controllers)│  │  Manager    │  │   (Model Inferencer)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │   Auth      │  │  Progress   │                              │
│  │  (JWT/API)  │  │   Tracker   │                              │
│  └─────────────┘  └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 通信模式

系统采用 **HTTP + WebSocket** 混合通信模式：

| 通信类型 | 用途 | 协议 |
|---------|------|------|
| HTTP RESTful API | 激活码验证、任务创建、状态查询 | HTTP/1.1 |
| WebSocket | 实时进度推送、检测结果推送 | WS (RFC 6455) |

---

## 认证流程

### 认证方式

系统支持三种认证方式：

1. **激活码模式** (客户端主要使用)
   - 用户输入激活码 → 换取 API Key
   - API Key 存储在 localStorage 中长期使用

2. **API Key 模式** (HTTP 请求)
   - 通过 `X-API-Key` 请求头传递
   - 用于推理请求、任务查询

3. **JWT Token 模式** (管理后台)
   - 通过 `Authorization: Bearer <token>` 传递
   - 用于管理员操作

### 激活码认证流程

```
┌──────────────┐                              ┌──────────────┐
│     用户     │                              │    服务器     │
│              │                              │              │
│  1. 输入激活码 │                              │              │
│─────────────>│                              │              │
│              │  2. POST /auth/activate      │              │
│              │     {code: "ACT-xxx"}        │              │
│              │─────────────────────────────>│              │
│              │                              │  3. 验证激活码 │
│              │  4. 返回 API Key             │              │
│              │<─────────────────────────────│              │
│  5. 保存 API Key│                            │              │
│              │                              │              │
│              │  6. 后续请求携带 API Key      │              │
│              │     X-API-Key: sk_xxx        │              │
│              │─────────────────────────────>│              │
└──────────────┘                              └──────────────┘
```

**请求示例**:
```http
POST /auth/activate HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{
  "code": "ACT-XXXXXXXX-XXXXXXXX"
}
```

**响应示例**:
```json
{
  "api_key": "sk_a1b2c3d4e5f6g7h8",
  "message": "激活成功",
  "expires_at": "2026-03-27T00:00:00"
}
```

---

## HTTP API 通信

### API 端点总览

| 端点 | 方法 | 认证 | 描述 |
|------|------|------|------|
| `/auth/activate` | POST | 无 | 激活码换取 API Key |
| `/infer/single` | POST | 需要 | 单模态检测 |
| `/infer/fusion` | POST | 需要 | 融合模式检测 |
| `/infer/task/{task_id}` | GET | 需要 | 查询任务状态 |
| `/infer/ws` | WebSocket | 可选 | 实时进度推送 |
| `/health` | GET | 无 | 健康检查 |

### 请求/响应格式

#### 单模态检测请求

```http
POST /infer/single HTTP/1.1
Host: localhost:8000
X-API-Key: sk_xxx
X-Client-Id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "mode": "single",
  "modality": "rgb",
  "images": [
    "base64_encoded_image_1",
    "base64_encoded_image_2"
  ]
}
```

#### 响应（异步任务创建）

```json
{
  "task_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "message": "单模态检测任务已创建，正在后台处理"
}
```

#### 融合模式检测请求

```json
{
  "mode": "fusion",
  "pairs": [
    {
      "rgb": "base64_encoded_rgb_image_1",
      "ir": "base64_encoded_ir_image_1"
    },
    {
      "rgb": "base64_encoded_rgb_image_2",
      "ir": "base64_encoded_ir_image_2"
    }
  ]
}
```

---

## WebSocket 通信

### 连接建立流程

```
┌──────────────┐                              ┌──────────────┐
│   Tauri 客户端 │                              │   FastAPI 服务器│
│              │                              │              │
│  1. 连接 WS   │                              │              │
│  ws://.../ws │                              │              │
│─────────────>│                              │              │
│              │  2. 验证 API Key (查询参数)   │              │
│              │     ?api_key=sk_xxx          │              │
│              │  3. 生成 client_id           │              │
│              │  4. 发送连接确认             │              │
│              │<─────────────────────────────│              │
│  5. 保存 client_id│                          │              │
│              │                              │              │
│  6. 发送检测请求 (HTTP)                      │              │
│              │  7. 后台执行检测             │              │
│              │  8. 推送进度 (WS)            │              │
│              │<─────────────────────────────│              │
│  9. 显示进度 │                              │              │
│              │  10. 推送完成通知 (WS)       │              │
│              │<─────────────────────────────│              │
└──────────────┘                              └──────────────┘
```

### WebSocket URL 格式

```
ws://localhost:8000/infer/ws?api_key=sk_xxx
wss://api.example.com/infer/ws?token=jwt_xxx  (生产环境)
```

### 消息类型

#### 连接确认消息（服务器 → 客户端）

```json
{
  "type": "connected",
  "client_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 进度更新消息（服务器 → 客户端）

```json
{
  "type": "progress_update",
  "data": {
    "task_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "total_items": 10,
    "completed_items": 3,
    "progress_percentage": 30.0,
    "status": "running",
    "message": "完成第 3/10 张图片的推理",
    "current_result": {
      "mode": "single",
      "result": "real",
      "confidence": 0.95,
      "probabilities": [0.05, 0.95],
      "processing_time": 120,
      "image_index": 2,
      "error": null,
      "success": true
    }
  }
}
```

#### 任务完成消息（服务器 → 客户端）

所有图片成功：
```json
{
  "type": "task_completed",
  "data": {
    "task_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "status": "completed",
    "message": "任务完成",
    "total_items": 10,
    "processed_items": 10,
    "successful_items": 10,
    "failed_items": 0,
    "errors": null
  }
}
```

部分失败：
```json
{
  "type": "task_partial_failure",
  "data": {
    "task_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "status": "partial_failure",
    "message": "任务完成，2 项失败",
    "total_items": 10,
    "processed_items": 10,
    "successful_items": 8,
    "failed_items": 2,
    "errors": [
      {
        "index": 3,
        "error": "图像解码失败",
        "retry_count": 3
      },
      {
        "index": 7,
        "error": "模型推理超时",
        "retry_count": 3
      }
    ]
  }
}
```

#### 任务失败消息（服务器 → 客户端）

```json
{
  "type": "task_failed",
  "data": {
    "task_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "status": "failed",
    "message": "服务器内部错误：模型加载失败"
  }
}
```

---

## 异步检测任务流程

### 完整时序图

```
┌───────────┐      ┌───────────┐      ┌───────────┐      ┌───────────┐
│   用户    │      │ Tauri App │      │  Rust    │      │ FastAPI   │
│           │      │  (React)  │      │  Backend │      │  Server   │
└───────────┘      └───────────┘      └───────────┘      └───────────┘
     │                 │                  │                  │
     │ 1. 点击检测      │                  │                  │
     │────────────────>│                  │                  │
     │                 │                  │                  │
     │                 │ 2. 检查 WebSocket│                  │
     │                 │    连接状态       │                  │
     │                 │                  │                  │
     │                 │ 3. 如未连接，建立 WS               │
     │                 │    连接          │                  │
     │                 │    (connect_    │                  │
     │                 │     websocket)  │                  │
     │                 │─────────────────>│                  │
     │                 │                  │ 4. 连接到        │
     │                 │                  │    FastAPI WS    │
     │                 │                  │─────────────────>│
     │                 │                  │                  │ 5. 生成
     │                 │                  │                  │    client_id
     │                 │                  │<─────────────────│ 6. 返回
     │                 │                  │    client_id     │
     │                 │<─────────────────│                  │
     │                 │ 7. 触发          │                  │
     │                 │    ws_connected  │                  │
     │                 │    事件          │                  │
     │                 │                  │                  │
     │                 │ 8. 获取          │                  │
     │                 │    client_id    │                  │
     │                 │                  │                  │
     │                 │ 9. 转换图片为    │                  │
     │                 │    base64       │                  │
     │                 │                  │                  │
     │                 │ 10. 调用         │                  │
     │                 │     detect_     │                  │
     │                 │     single_     │                  │
     │                 │     mode_async  │                  │
     │                 │─────────────────>│                  │
     │                 │                  │ 11. POST        │
     │                 │                  │     /infer/single│
     │                 │                  │─────────────────>│
     │                 │                  │                  │ 12. 创建任务
     │                 │                  │                  │     注册到 client
     │                 │                  │                  │ 13. 返回 task_id
     │                 │<─────────────────│─────────────────│
     │                 │ 14. 返回         │                  │
     │                 │     task_id     │                  │
     │                 │<─────────────────│                  │
     │                 │                  │                  │
     │                 │                  │ 15. 后台执行检测 │
     │                 │                  │ (每完成一张图片)  │
     │                 │                  │                  │
     │                 │                  │ 16. 推送进度    │
     │                 │                  │     ws_progress │
     │                 │<─────────────────│─────────────────│
     │                 │ 17. 添加到       │                  │
     │                 │     completed   │                  │
     │                 │     Results     │                  │
     │                 │ 18. UI 实时更新  │                  │
     │<────────────────│                  │                  │
     │                 │                  │                  │
     │                 │                  │ 19. 所有图片完成 │
     │                 │                  │ 20. 推送完成通知 │
     │                 │<─────────────────│─────────────────│
     │                 │ 21. 设置 status  │                  │
     │                 │     = success   │                  │
     │<────────────────│ 22. 显示结果    │                  │
```

### 前端代码流程

```typescript
// 1. 检查 WebSocket 连接状态
let clientId = clientIdRef.current;

// 2. 如未连接，建立 WebSocket
if (!clientId) {
  const clientIdPromise = new Promise<string>((resolve) => {
    clientIdResolveRef.current = resolve;
  });

  await connectWebsocket(apiKey);  // Rust: invoke("connect_websocket")
  clientId = await clientIdPromise;  // 等待 ws_connected 事件
}

// 3. 准备请求数据
const base64Images = images.map(img => fileToBase64(img.file));

// 4. 发起异步检测
const taskResponse = await detectSingleModeAsync(
  { mode: "single", modality: "rgb", images: base64Images },
  clientId,
  apiKey
);

// 5. 后台接收进度更新（通过 WebSocket 监听器）
// 每次收到 ws_progress 事件，completedResults 数组会增加
// ResultPanel 会实时显示新结果
```

### Rust 后端代码流程

```rust
// connect_websocket 命令
#[tauri::command]
pub async fn connect_websocket(
    app: AppHandle,
    ws_state: State<'_, WsConnectionStateRef>,
    api_key: String,
) -> Result<String, String> {
    // 1. 断开旧连接（如果有）
    // 2. 建立新 WebSocket 连接到后端
    // 3. 等待接收 client_id
    // 4. 通过 ws_connected 事件发送给前端
}

// detect_single_mode_async 命令
#[tauri::command]
pub async fn detect_single_mode_async(
    request: SingleModeRequest,
    client_id: String,
    api_key: String,
    http_client: State<'_, Client>,
) -> Result<AsyncTaskResponse, String> {
    // 1. 发送 HTTP POST 到 /infer/single
    // 2. 携带 X-Client-Id 和 X-API-Key
    // 3. 返回 task_id
}
```

---

## 消息格式详解

### 前端类型定义 (TypeScript)

```typescript
// WebSocket 事件消息
interface WsEventMessage {
  event_type: "progress" | "task_completed" | "task_failed";
  task_id: string;
  status: string | null;
  message: string | null;
  result: RustTaskDetectionResultItem | null;
  totalItems: number | null;
  processedItems: number | null;
  completedResults: RustTaskDetectionResultItem[] | null;
}

// 检测结果项
interface RustTaskDetectionResultItem {
  mode: string;
  result: string;       // "real" | "fake" | "error"
  confidence: number;
  probabilities: number[];
  processingTime: number;
  error?: string;       // 错误信息（当 result 为"error"时）
  imageIndex?: number;  // 图片在批次中的索引
}

// 检测结果（前端内部使用）
interface DetectionResultItem {
  id: string;
  result: "real" | "fake" | "error";
  confidence: number;
  timestamp: string;
  processingTime: number;
  errorMessage?: string;
  imageIndex?: number;
}
```

### Rust 类型定义

```rust
// WebSocket 消息（转发给前端）
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

// 检测结果项（来自 Python 后端）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectionResultItem {
    pub mode: String,
    pub result: String,
    pub confidence: f64,
    pub probabilities: Vec<f64>,
    pub processing_time: u64,
    pub error: Option<String>,
    pub image_index: Option<u32>,
}
```

### Python 后端类型定义

```python
class DetectionResultItem(BaseModel):
    mode: str
    result: str  # "real", "fake", 或 "error"
    confidence: float
    probabilities: np.ndarray
    processing_time: int
    image_index: Optional[int] = None  # 批次中的索引
    error: Optional[str] = None  # 错误信息
    retry_count: int = 0  # 重试次数
    success: bool = True  # 是否成功
```

---

## 错误处理

### 错误类型

| 错误级别 | 触发条件 | 客户端响应 |
|---------|---------|----------|
| **连接错误** | WebSocket 连接失败 | 显示"连接后端失败"，提示检查后端服务 |
| **认证错误** | API Key 无效/过期 | 返回激活页面，要求重新激活 |
| **推理错误** | 单张图片推理失败 | `result: "error"`，显示错误卡片 |
| **任务失败** | 整个任务执行失败 | 显示错误消息，允许重试 |

### 错误响应格式

#### 图片级错误（在进度消息中）

```json
{
  "type": "progress_update",
  "data": {
    "task_id": "...",
    "current_result": {
      "mode": "single",
      "result": "error",
      "confidence": 0.0,
      "probabilities": [0.0, 0.0],
      "processing_time": 0,
      "image_index": 2,
      "error": "图像解码失败：无效的 JPEG 格式",
      "success": false
    }
  }
}
```

#### 任务级错误

```json
{
  "type": "task_failed",
  "data": {
    "task_id": "...",
    "status": "failed",
    "message": "服务器内部错误：CUDA 显存不足"
  }
}
```

### 前端错误处理逻辑

```typescript
// useDetection.ts 中的错误处理

const unlistenProgress = await listenWsProgress((wsMsg) => {
  if (wsMsg.result) {
    const result: DetectionResultItem = {
      id: `${wsMsg.taskId}_${wsMsg.processedItems || 0}`,
      result: wsMsg.result.result as "real" | "fake" | "error",
      confidence: wsMsg.result.confidence,
      processingTime: wsMsg.result.processingTime,
      // 优先使用 result.error，其次使用 wsMsg.message
      errorMessage: wsMsg.result.result === "error"
        ? (wsMsg.result.error || wsMsg.message || "推理失败")
        : undefined,
    };
    // 添加到已完成列表，UI 会实时更新
    setUserState((prev) => ({
      ...prev,
      completedResults: [...prev.completedResults, result],
    }));
  }
});

const unlistenFailed = await listenWsTaskFailed((wsMsg) => {
  // 任务完全失败
  setError(wsMsg.message || "检测失败");
  setStatus("error");
});
```

---

## 连接管理

### WebSocket 生命周期

```
连接建立 → 等待 client_id → 连接成功 → 心跳保持 → 接收消息 → 断开/重连
```

### 连接状态管理 (Rust)

```rust
pub struct WsConnectionState {
    pub client_id: Option<String>,
    pub is_connected: bool,
    pub abort_handle: Option<tokio::task::JoinHandle<()>>,
}

// connect_websocket 会：
// 1. 断开旧连接（如果有）
// 2. 建立新连接
// 3. 启动监听任务（tokio::spawn）
// 4. 保存任务句柄用于取消
```

### 心跳机制

- **间隔**: 30 秒
- **消息**: `"ping"`
- **超时处理**: 发送失败则断开连接，触发 `ws_disconnected` 事件

### 前端监听器管理

```typescript
// ws_connected 监听器：只注册一次（组件挂载时）
useEffect(() => {
  const unlistenConnected = await listenWsConnected((clientId) => {
    clientIdRef.current = clientId;
    resolve(clientIdPromise);
  });
  unlistenConnectedRef.current = unlistenConnected;

  return () => {
    if (unlistenConnectedRef.current) {
      unlistenConnectedRef.current();
    }
  };
}, []);

// 进度监听器：每次检测前重新注册
const registerProgressListeners = useCallback(async () => {
  cleanupProgressListeners();  // 先清理旧的

  const unlistenProgress = await listenWsProgress(...);
  const unlistenCompleted = await listenWsTaskCompleted(...);
  const unlistenFailed = await listenWsTaskFailed(...);

  unlistenFnsRef.current = [unlistenProgress, unlistenCompleted, unlistenFailed];
}, []);
```

### 连接重连策略

1. 检测到断开 → 设置 `isConnected: false`
2. 用户重新点击"开始检测" → 自动调用 `connectWebsocket()`
3. Rust 后端会断开旧连接，建立新连接
4. 前端通过 `ws_connected` 事件获取新的 `client_id`

---

## 附录：完整通信日志示例

### 正常检测流程日志

```
[Tauri] 开始检测
[Tauri] WebSocket 未连接，建立新连接...
[Rust] 断开旧的 WebSocket 连接 (如果有)
[Rust] WebSocket 连接已建立，等待 client_id...
[Backend] 新 WebSocket 连接，生成 client_id: 550e8400-...
[Backend] 发送：{"type": "connected", "client_id": "550e8400-..."}
[Rust] 收到 WebSocket 消息类型：connected
[Rust] 发送 ws_connected 事件到前端
[Tauri] 收到 ws_connected 事件，clientId: 550e8400-...
[Tauri] 发送单模态推理请求...
[Backend] 收到 POST /infer/single, client_id: 550e8400-..., 图片数：3
[Backend] 创建任务：a1b2c3d4-...
[Backend] 任务注册到客户：550e8400-...
[Backend] 返回：{"task_id": "a1b2c3d4-..."}
[Tauri] 任务创建成功：task_id=a1b2c3d4-...
[Backend] 完成第 1/3 张图片的推理
[Backend] 发送进度：{"type": "progress_update", "data": {...}}
[Tauri] 收到进度事件：processedItems=1, totalItems=3
[Tauri] 添加结果到 completedResults (result="real")
[React] ResultPanel 重新渲染，显示第 1 个结果
[Backend] 完成第 2/3 张图片的推理
[Backend] 发送进度...
[Tauri] 添加结果 (result="error", error="图像解码失败")
[React] ResultPanel 显示第 2 个结果（错误卡片）
[Backend] 完成第 3/3 张图片的推理
[Backend] 发送进度...
[Backend] 任务完成，发送 task_partial_failure (因为有 1 个错误)
[Tauri] 收到任务完成事件
[Tauri] 设置 status = success
[React] ResultPanel 显示全部 3 个结果，顶部显示"完成 100%"
```

---

**文档结束**
