# 客户端 - 服务器通信文档

**版本**: 2.1
**最后更新**: 2026-03-04
**适用系统**: 人脸活体检测系统（Tauri + React 前端 + FastAPI 后端）

---

## 目录

1. [架构概览](#架构概览)
2. [认证流程](#认证流程)
3. [HTTP API 通信](#http-api-通信)
4. [WebSocket 通信](#websocket-通信)
5. [异步检测任务流程](#异步检测任务流程)
6. [任务取消流程](#任务取消流程)
7. [历史记录 API](#历史记录-api)
8. [消息格式详解](#消息格式详解)
9. [错误处理](#错误处理)
10. [连接管理](#连接管理)

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
| `/auth/token` | POST | 无 | 管理员登录获取 JWT Token |
| `/auth/activation-codes` | POST/GET/PUT/DELETE | JWT | 激活码管理（管理员） |
| `/infer/single` | POST | 需要 | 单模态检测 |
| `/infer/fusion` | POST | 需要 | 融合模式检测 |
| `/infer/task/{task_id}` | GET | 需要 | 查询任务状态 |
| `/infer/task/{task_id}` | DELETE | 需要 | **取消任务** |
| `/infer/tasks` | GET | 需要 | 获取任务列表 |
| `/infer/queue/status` | GET | JWT | 获取队列状态（管理员） |
| `/infer/ws` | WebSocket | 可选 | 实时进度推送 |
| `/history` | GET | 需要 | 查询历史记录 |
| `/history/stats` | GET | 需要 | 获取历史统计 |
| `/history` | DELETE | 需要 | 删除历史记录 |
| `/storage/images` | GET/POST/DELETE | 需要 | 图片存储管理 |
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

**注意**:
- `api_key` 参数用于认证，可选
- 未认证的连接可以被拒绝（取决于后端配置）
- 连接成功后，后端会发送 `{"type": "connected", "client_id": "..."}` 消息

### 消息类型

系统支持以下 WebSocket 消息类型：

| 消息类型 | 方向 | 描述 |
|---------|------|------|
| `connected` | 服务器→客户端 | 连接建立确认 |
| `progress_update` / `progress` | 服务器→客户端 | 处理进度更新 |
| `task_completed` | 服务器→客户端 | 任务全部成功完成 |
| `task_partial_failure` | 服务器→客户端 | 任务部分失败 |
| `task_failed` | 服务器→客户端 | 任务完全失败 |
| `task_cancelled` | 服务器→客户端 | **任务被用户取消** |

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

#### 任务取消消息（服务器 → 客户端）

```json
{
  "type": "task_cancelled",
  "data": {
    "task_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "status": "cancelled",
    "message": "任务已取消",
    "total_items": 10,
    "processed_items": 3,
    "successful_items": 3,
    "failed_items": 0
  }
}
```

**注意**: Rust 后端会将 `task_cancelled` 消息转发为 `ws_task_completed` 事件，`status` 字段设置为 `"cancelled"`，前端收到后设置状态为 `idle` 并显示提示。

---

## 任务取消流程

### 取消任务时序图

```
┌───────────┐      ┌───────────┐      ┌───────────┐      ┌───────────┐
│   用户    │      │ Tauri App │      │  Rust    │      │ FastAPI   │
│           │      │  (React)  │      │  Backend │      │  Server   │
└───────────┘      └───────────┘      └───────────┘      └───────────┘
     │                 │                  │                  │
     │ 1. 点击"取消任务"│                  │                  │
     │────────────────>│                  │                  │
     │                 │                  │                  │
     │                 │ 2. 获取 taskId   │                  │
     │                 │    和 apiKey     │                  │
     │                 │                  │                  │
     │                 │ 3. cancelDetection(taskId, apiKey) │
     │                 │─────────────────>│                  │
     │                 │                  │ 4. DELETE       │
     │                 │                  │    /infer/task/{id}
     │                 │                  │─────────────────>│
     │                 │                  │                  │ 5. 设置取消标志
     │                 │                  │                  │    is_cancelling=true
     │                 │                  │ 6. 返回任务状态  │
     │                 │                  │<─────────────────│
     │                 │<─────────────────│                  │
     │                 │                  │                  │
     │                 │                  │ 7. 后台任务检查取消 │
     │                 │                  │    check_cancellation()
     │                 │                  │                  │
     │                 │                  │ 8. 发送 task_cancelled
     │                 │<─────────────────│─────────────────│
     │                 │ 9. 转发为        │                  │
     │                 │    ws_task_completed
     │                 │    status="cancelled"
     │<────────────────│ 10. 显示"已取消"  │                  │
```

### 前端代码示例

```typescript
// useDetection.ts - 取消任务逻辑
const cancel = useCallback(async () => {
  const apiKey = localStorage.getItem("api_key") || "";
  const taskId = userState.taskId;  // 获取当前任务 ID

  if (!taskId) {
    console.error("取消任务失败：taskId 为空");
    return;
  }

  try {
    await cancelDetection(taskId, apiKey);  // 调用 Rust 命令
    setError("检测任务已取消");
    setStatus("idle");  // 重置状态
    cleanupProgressListeners();  // 清理监听器
    setUserState((prev) => ({
      ...prev,
      taskId: null,  // 清空任务 ID
    }));
  } catch (err) {
    console.error("取消任务失败:", err);
  }
}, [cleanupProgressListeners, userState.taskId]);
```

### Rust 后端代码示例

```rust
// src-tauri/src/util.rs
#[tauri::command]
pub async fn cancel_detection(
    task_id: String,
    api_key: String,
    http_client: State<'_, Client>,
) -> Result<AsyncTaskResponse, String> {
    let api_url = format!("{}/infer/task/{}", get_api_base_url(), task_id);

    let response = http_client
        .delete(&api_url)
        .header("X-API-Key", &api_key)
        .send()
        .await
        .map_err(|e| format!("网络请求失败：{}", e))?;

    if !response.status().is_success() {
        return Err(format!("取消任务失败 ({}): {}", response.status(), response.text().await?));
    }

    let task_response: AsyncTaskResponse = serde_json::from_str(&response.text().await?)?;
    Ok(task_response)
}
```

### 后端取消逻辑（Python）

```python
# backend/controller/infer_controller.py
@router.delete("/task/{task_id}", response_model=TaskStatusResponse)
async def cancel_task_endpoint(
    task_id: str,
    auth: Annotated[AuthCredentials, Depends(get_current_user)],
):
    # 1. 验证认证
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail="未授权访问")

    # 2. 获取任务状态
    task = await progress_tracker.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 3. 检查是否可取消
    if task.status in ("completed", "partial_failure", "failed", "cancelled"):
        raise HTTPException(status_code=400, detail=f"无法取消任务，当前状态：{task.status}")

    # 4. 设置取消标志
    success = await progress_tracker.cancel_task(task_id, "用户请求取消")
    if not success:
        raise HTTPException(status_code=400, detail="无法取消任务")

    # 5. 等待任务处理取消逻辑
    await asyncio.sleep(0.1)

    # 6. 返回更新后的任务状态
    updated_task = await progress_tracker.get_task(task_id)
    return TaskStatusResponse(...)
```

### 取消检测点

后端任务在以下位置检查取消标志：

```python
# backend/controller/infer_controller.py

# 1. 图片解码阶段
for i, img_base64 in enumerate(images):
    if await progress_tracker.check_cancellation(task_id):
        await progress_tracker.confirm_cancel(task_id)
        await connection_manager.broadcast_by_task(
            {"type": "task_cancelled", ...}, task_id
        )
        return
    decoded_images.append(decode_base64_image(img_base64))

# 2. 推理完成后
batch_results = await infer_service.detect_single_batch(...)

if await progress_tracker.check_cancellation(task_id):
    await progress_tracker.confirm_cancel(task_id)
    await connection_manager.broadcast_by_task(
        {"type": "task_cancelled", ...}, task_id
    )
    return
```

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
  id: string;           // 格式：`${taskId}_${processedItems}`
  result: "real" | "fake" | "error";
  confidence: number;
  timestamp: string;    // ISO 8601
  processingTime: number;
  errorMessage?: string;
  imageIndex?: number;
}

// 取消任务 API
export async function cancelDetection(taskId: string, apiKey: string): Promise<AsyncTaskResponse>

// 历史记录相关类型
interface HistoryTaskItem {
  taskId: string;
  clientId?: string;
  mode: string;
  status: string;       // "completed" | "partial_failure" | "failed"
  totalItems: number;
  successfulItems: number;
  failedItems: number;
  realCount: number;
  fakeCount: number;
  elapsedTimeMs: number;
  createdAt: string;
  completedAt?: string;
  results?: HistoryResultItem[];
}

interface HistoryResultItem {
  mode: string;
  modality?: string;    // "rgb" | "ir"
  result: string;
  confidence: number;
  probabilities: number[];
  processingTime: number;
  imageIndex?: number;
  error?: string;
}

interface HistoryStatsResponse {
  totalTasks: number;
  totalInferences: number;
  totalReal: number;
  totalFake: number;
  totalErrors: number;
  successRate: number;      // 0-100
  avgProcessingTimeMs: number;
  dateRange?: {
    start: string;
    end: string;
  };
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

## 历史记录 API

历史记录功能用于查询、统计和删除已完成的检测任务。所有检测任务完成后会自动保存到服务器数据库。

### API 端点

| 端点 | 方法 | 认证 | 描述 |
|------|------|------|------|
| `/history` | GET | 需要 | 查询历史记录（支持分页和过滤） |
| `/history/stats` | GET | 需要 | 获取统计信息 |
| `/history` | DELETE | 需要 | 删除历史记录 |
| `/history/task/{task_id}` | GET | 需要 | 获取单个任务详情 |

### 查询历史记录

**请求示例**:
```http
GET /history?page=1&page_size=20&mode=single&status=completed&days=7&client_id=xxx HTTP/1.1
Host: localhost:8000
X-API-Key: sk_xxx
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | integer | 否 | 页码（默认 1，从 1 开始） |
| `page_size` | integer | 否 | 每页数量（默认 20，最大 100） |
| `client_id` | string | 否 | 客户端 ID 过滤 |
| `mode` | string | 否 | 模式过滤（`single` / `fusion`） |
| `status` | string | 否 | 状态过滤（逗号分隔：`completed,partial_failure,failed`） |
| `days` | integer | 否 | 最近 N 天的记录 |

**响应示例**:
```json
{
  "total": 128,
  "page": 1,
  "page_size": 20,
  "total_pages": 7,
  "items": [
    {
      "task_id": "a1b2c3d4-...",
      "client_id": "550e8400-...",
      "mode": "single",
      "status": "completed",
      "total_items": 5,
      "successful_items": 5,
      "failed_items": 0,
      "real_count": 3,
      "fake_count": 2,
      "elapsed_time_ms": 1234,
      "created_at": "2026-03-04T10:00:00Z",
      "completed_at": "2026-03-04T10:00:01Z",
      "results": [
        {
          "mode": "single",
          "result": "real",
          "confidence": 0.95,
          "probabilities": [0.05, 0.95],
          "processing_time": 120,
          "image_index": 0
        }
      ]
    }
  ]
}
```

### 获取统计信息

**请求示例**:
```http
GET /history/stats?mode=single&days=30 HTTP/1.1
Host: localhost:8000
X-API-Key: sk_xxx
```

**响应示例**:
```json
{
  "total_tasks": 128,
  "total_inferences": 256,
  "total_real": 180,
  "total_fake": 50,
  "total_errors": 26,
  "success_rate": 89.84,
  "avg_processing_time_ms": 234.5,
  "date_range": {
    "start": "2026-02-02T00:00:00Z",
    "end": "2026-03-04T23:59:59Z"
  }
}
```

**统计字段说明**:
| 字段 | 说明 | 计算方式 |
|------|------|----------|
| `total_tasks` | 总任务数 | 符合条件的任务总数 |
| `total_inferences` | 总推理数 | 所有任务的图片总数 |
| `total_real` | 真实人脸总数 | `SUM(real_count)` |
| `total_fake` | 攻击人脸总数 | `SUM(fake_count)` |
| `total_errors` | 错误总数 | `SUM(error_count)` |
| `success_rate` | 成功率 | `(total_real + total_fake) / (total_real + total_fake + total_errors) × 100` |
| `avg_processing_time_ms` | 平均处理时间 | `AVG(elapsed_time_ms)` |

### 删除历史记录

**请求示例**:
```http
DELETE /history?task_ids=id1,id2,id3 HTTP/1.1
Host: localhost:8000
X-API-Key: sk_xxx
```

或使用 `days_ago` 参数删除旧记录：
```http
DELETE /history?days_ago=30 HTTP/1.1
Host: localhost:8000
X-API-Key: sk_xxx
```

**响应示例**:
```json
{
  "deleted_count": 3,
  "message": "成功删除 3 条记录"
}
```

### 认证说明

- **普通用户**（API Key 认证）：只能查询/删除自己的记录
- **管理员**（JWT Token 认证）：可以查询/删除所有记录

后端通过 `api_key_hash` 来识别用户身份：
```python
# 从 auth.user_id 提取 api_key_hash
# auth.user_id 格式："api_key:activated_ACT_xxxxxx"
api_key_hash = auth.user_id.replace("api_key:", "")[:32]
```

### 前端查询代码示例

```typescript
// src/api/tauri.ts
export async function queryHistory(params: HistoryQueryParams): Promise<HistoryQueryResponse> {
  const queryParams: Record<string, string> = {};
  if (params.clientId) queryParams.clientId = params.clientId;
  if (params.mode) queryParams.mode = params.mode;
  if (params.status) queryParams.status = params.status;
  if (params.days) queryParams.days = params.days.toString();
  if (params.page) queryParams.page = params.page.toString();
  if (params.pageSize) queryParams.pageSize = params.pageSize.toString();

  const apiKey = getApiKey();  // 从 localStorage 获取
  return await invoke<HistoryQueryResponse>("query_history", {
    params: queryParams,
    apiKey,
  });
}

// src/components/history/HistoryPage.tsx
const loadData = useCallback(async () => {
  const params: HistoryQueryParams = { page, pageSize };
  // 注意：不传入 clientId，后端已通过 api_key_hash 过滤
  if (filters.mode) params.mode = filters.mode;
  if (filters.status) params.status = filters.status;
  if (filters.days) params.days = parseInt(filters.days, 10);

  const [historyRes, statsRes] = await Promise.all([
    queryHistory(params),
    getHistoryStats({ mode: filters.mode, status: filters.status, days: parseInt(filters.days, 10) }),
  ]);

  setHistoryItems(historyRes.items);
  setStats(statsRes);
}, [page, filters]);
```

### 注意事项

1. **api_key_hash 一致性**: 保存和查询时使用相同的 `api_key_hash` 计算方式
2. **不使用 clientId 过滤**: 前端查询时不传入 `clientId` 参数，避免 WebSocket 重连后查询不到新数据
3. **分页性能**: `page_size` 最大为 100，建议默认使用 20
4. **日期范围**: `days` 参数用于查询最近 N 天的记录，从当前时间往前推算

---

## 错误处理

### 错误类型

| 错误级别 | 触发条件 | 客户端响应 |
|---------|---------|----------|
| **连接错误** | WebSocket 连接失败 | 显示"连接后端失败"，提示检查后端服务 |
| **认证错误** | API Key 无效/过期 | 返回激活页面，要求重新激活 |
| **推理错误** | 单张图片推理失败 | `result: "error"`，显示错误卡片 |
| **任务失败** | 整个任务执行失败 | 显示错误消息，允许重试 |
| **取消错误** | 取消已完成/不存在任务 | 显示相应提示（400/404） |

### 取消任务错误响应

**取消已完成的任务** (400):
```json
{
  "detail": "无法取消任务，当前状态：completed"
}
```

**取消不存在的任务** (404):
```json
{
  "detail": "任务不存在"
}
```

### 错误响应格式

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
              ↓
        发起检测任务 → 接收进度 → 任务完成/取消 → 清理监听器
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
  const unlistenCompleted = await listenWsTaskCompleted((wsMsg) => {
    // 检查 status 字段，处理取消状态
    if (wsMsg.status === "cancelled") {
      setStatus("idle");
      setError("检测任务已取消");
    } else {
      setStatus("success");
    }
    setUserState((prev) => ({ ...prev, taskId: null }));
  });
  const unlistenFailed = await listenWsTaskFailed(...);

  unlistenFnsRef.current = [unlistenProgress, unlistenCompleted, unlistenFailed];
}, []);

// 取消任务时清理监听器
const cancel = useCallback(async () => {
  const taskId = userState.taskId;
  const apiKey = localStorage.getItem("api_key") || "";

  if (!taskId) return;

  await cancelDetection(taskId, apiKey);
  cleanupProgressListeners();  // 清理进度监听器
  setStatus("idle");
  setUserState((prev) => ({ ...prev, taskId: null }));
}, [userState.taskId]);
```

### 监听器清理策略

| 场景 | 清理的监听器 | 保留的监听器 |
|------|------------|-------------|
| `reset()` | 进度/完成/失败监听器 | `ws_connected` |
| `cancel()` | 进度/完成/失败监听器 | `ws_connected` |
| 组件卸载 | 所有监听器 | 无 |
| 重新检测 | 进度/完成/失败监听器，然后重新注册 | `ws_connected` |

### 连接重连策略

1. 检测到断开 → 设置 `isConnected: false`
2. 用户重新点击"开始检测" → 自动调用 `connectWebsocket()`
3. Rust 后端会断开旧连接，建立新连接
4. 前端通过 `ws_connected` 事件获取新的 `client_id`

### 任务取消处理策略

- **取消时机**: 仅在任务进行中（`status === "detecting"` 或 `"connecting"`）且存在有效 `taskId` 时显示
- **取消后行为**:
  - 保留已处理的检测结果
  - 状态重置为 `idle`
  - 显示"检测任务已取消"提示信息
  - 清理进度监听器
- **后端处理**:
  - 设置 `is_cancelling = true` 标志
  - 任务在执行轮询点检查标志并响应
  - 发送 `task_cancelled` WebSocket 消息

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

### 任务取消流程日志

```
[Tauri] 用户点击"取消任务"按钮
[Tauri] 获取当前 taskId: a1b2c3d4-...
[Tauri] 调用 cancelDetection(taskId, apiKey)
[Rust] 发送 DELETE /infer/task/a1b2c3d4-...
[Rust] 请求头：X-API-Key: sk_xxx
[Backend] 收到 DELETE /infer/task/a1b2c3d4-...
[Backend] 验证认证：通过
[Backend] 获取任务状态：status="running"
[Backend] 设置取消标志：is_cancelling=true
[Backend] 返回：{"task_id": "a1b2c3d4-...", "message": "任务已取消"}
[Rust] 收到取消响应，转发给前端
[Tauri] 收到取消成功响应
[Tauri] 设置 error="检测任务已取消"
[Tauri] 设置 status="idle"
[Tauri] 清理进度监听器
[React] 显示"检测任务已取消"提示
[Backend] 后台任务检查到取消标志
[Backend] 发送 task_cancelled 消息
[Rust] 收到 task_cancelled，转发为 ws_task_completed (status="cancelled")
[Tauri] 收到 ws_task_completed，status="cancelled"
[Tauri] 确认状态已重置，忽略
```

### 历史记录查询日志

```
[React] HistoryPage 组件挂载
[React] 调用 loadData()
[Tauri] 调用 queryHistory({ page: 1, pageSize: 20, mode: "single" })
[Tauri] 从 localStorage 获取 apiKey: sk_xxx
[Rust] query_history 被调用，params: { page: "1", page_size: "20", mode: "single" }
[Rust] api_key 长度：32
[Rust] 发送 GET /history?page=1&page_size=20&mode=single
[Rust] 请求头：X-API-Key: sk_xxx
[Backend] 收到 GET /history
[Backend] 验证认证：通过 (api_key)
[Backend] auth.user_id: "api_key:activated_ACT_xxxxxx"
[Backend] api_key_hash: "activated_ACT_xxxxxx"
[Backend] 查询数据库：SELECT * FROM tasks WHERE api_key_hash = ? AND mode = ?
[Backend] 返回结果：total=25, items=[...]
[Rust] 收到响应，转发给前端
[Tauri] 收到历史记录：total=25, items 长度=20
[React] 更新历史列表状态
[React] 渲染 HistoryTable 和 HistoryStatsPanel
```

---

**文档结束**

## 修订历史

| 版本 | 日期 | 修订内容 |
|------|------|----------|
| 2.1 | 2026-03-04 | 添加任务取消流程、历史记录 API 详解、task_cancelled 消息类型 |
| 2.0 | 2026-02-27 | 初始版本，包含 HTTP API、WebSocket 通信、异步任务流程 |
