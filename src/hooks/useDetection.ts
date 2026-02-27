import { useState, useCallback, useRef, useEffect } from "react";
import type {
  DetectionMode,
  ImageInfo,
  DetectionStatus,
  UserState,
  DetectionResultItem,
} from "../types";
import {
  detectSingleModeAsync,
  detectFusionModeAsync,
  getSupportedFormats,
  connectWebsocket,
  listenWsProgress,
  listenWsTaskCompleted,
  listenWsTaskFailed,
  listenWsConnected,
  AsyncTaskResponse,
} from "../api/tauri";

interface UseDetectionReturn {
  mode: DetectionMode;
  setMode: (mode: DetectionMode) => void;
  images: ImageInfo[];
  addImages: (images: ImageInfo[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  status: DetectionStatus;
  error: string | null;
  userState: UserState;
  startDetection: () => Promise<void>;
  reset: () => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function pairImagesByFilename(images: ImageInfo[]): {
  pairs: Array<{ rgb: ImageInfo; ir: ImageInfo }>;
  unpairedRgb: ImageInfo[];
  unpairedIr: ImageInfo[];
  invalidFiles: ImageInfo[];
} {
  const rgbImages = new Map<string, ImageInfo>();
  const irImages = new Map<string, ImageInfo>();
  const invalidFiles: ImageInfo[] = [];

  for (const image of images) {
    const filename = image.file.name;
    const underscoreIndex = filename.indexOf("_");

    if (underscoreIndex === -1) {
      invalidFiles.push(image);
      continue;
    }

    const prefix = filename.substring(0, underscoreIndex).toLowerCase();
    const extIndex = filename.lastIndexOf(".");
    const identifier = filename.substring(
      underscoreIndex + 1,
      extIndex > underscoreIndex ? extIndex : undefined
    );

    if (prefix === "rgb") {
      rgbImages.set(identifier, image);
    } else if (prefix === "ir") {
      irImages.set(identifier, image);
    } else {
      invalidFiles.push(image);
    }
  }

  const pairs: Array<{ rgb: ImageInfo; ir: ImageInfo }> = [];
  const unpairedRgb: ImageInfo[] = [];
  const unpairedIr: ImageInfo[] = [];

  for (const [identifier, rgbImg] of rgbImages) {
    const irImg = irImages.get(identifier);
    if (irImg) {
      pairs.push({ rgb: rgbImg, ir: irImg });
    } else {
      unpairedRgb.push(rgbImg);
    }
  }

  for (const [identifier, irImg] of irImages) {
    if (!rgbImages.has(identifier)) {
      unpairedIr.push(irImg);
    }
  }

  return { pairs, unpairedRgb, unpairedIr, invalidFiles };
}

async function checkFormat(images: ImageInfo[]): Promise<string[]> {
  const supportedFormats = await getSupportedFormats();
  const invalidImages: string[] = [];

  for (const img of images) {
    const ext = img.file.name.split(".").pop()?.toLowerCase() || "";
    if (!supportedFormats.includes(ext)) {
      invalidImages.push(img.file.name);
    }
  }

  return invalidImages;
}

export function useDetection(): UseDetectionReturn {
  const [mode, setMode] = useState<DetectionMode>("single");
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [status, setStatus] = useState<DetectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [userState, setUserState] = useState<UserState>({
    clientId: null,
    taskId: null,
    isConnected: false,
    progress: 0,
    completedResults: [],
  });

  const unlistenFnsRef = useRef<Array<() => void>>([]);

  // 存储 ws_connected 的 unlisten 函数（这个不需要清理）
  const unlistenConnectedRef = useRef<(() => void) | null>(null);

  // 使用 ref 存储 clientId，避免 startDetection 回调因 clientId 变化而重建
  const clientIdRef = useRef<string | null>(null);

  // 用于跟踪当前任务是否已完成（解决竞态条件）
  const isTaskCompletedRef = useRef(false);

  // 用于等待 client_id 的 Promise resolve 函数
  const clientIdResolveRef = useRef<((id: string) => void) | null>(null);

  // 同步 clientIdRef 和 userState.clientId
  useEffect(() => {
    clientIdRef.current = userState.clientId;
  }, [userState.clientId]);

  const addImages = useCallback((newImages: ImageInfo[]) => {
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  // 只清理进度和任务完成/失败监听器
  const cleanupProgressListeners = useCallback(() => {
    console.log("[useDetection] 清理进度监听器");
    unlistenFnsRef.current.forEach((fn) => fn());
    unlistenFnsRef.current = [];
  }, []);

  // 注册进度监听器（在每次检测前调用）
  const registerProgressListeners = useCallback(async () => {
    console.log("[useDetection] 注册进度监听器");
    let mounted = true;

    const unlistenProgress = await listenWsProgress((wsMsg) => {
      if (!mounted) return;
      console.log("[useDetection] 收到进度事件:", wsMsg);
      if (wsMsg.processedItems !== null && wsMsg.totalItems !== null) {
        const progress = Math.round(
          (wsMsg.processedItems / wsMsg.totalItems) * 100
        );
        setUserState((prev) => ({
          ...prev,
          progress,
        }));
      }

      // 将当前结果添加到已完成列表
      if (wsMsg.result) {
        const result: DetectionResultItem = {
          id: `${wsMsg.taskId}_${wsMsg.processedItems || 0}`,
          result: wsMsg.result.result as "real" | "fake" | "error",
          confidence: wsMsg.result.confidence,
          timestamp: new Date().toISOString(),
          processingTime: wsMsg.result.processingTime,
          errorMessage: wsMsg.result.result === "error" ? (wsMsg.result.error || wsMsg.message || "推理失败") : undefined,
          imageIndex: wsMsg.result.imageIndex,
        };
        setUserState((prev) => ({
          ...prev,
          completedResults: [...prev.completedResults, result],
        }));
      }

      if (wsMsg.message) {
        console.log("进度:", wsMsg.message);
      }
    });

    const unlistenCompleted = await listenWsTaskCompleted((wsMsg) => {
      if (!mounted) return;
      console.log("[useDetection] 收到任务完成事件:", wsMsg);
      console.log("[useDetection] 设置 status = success, taskId = null");
      // 标记任务已完成，防止竞态条件
      isTaskCompletedRef.current = true;
      setStatus("success");
      setUserState((prev) => ({
        ...prev,
        taskId: null,
        progress: 100,
        isConnected: true,
      }));
    });

    const unlistenFailed = await listenWsTaskFailed((wsMsg) => {
      if (!mounted) return;
      console.log("[useDetection] 收到任务失败事件:", wsMsg);
      setError(wsMsg.message || "检测失败");
      setStatus("error");
      setUserState((prev) => ({
        ...prev,
        taskId: null,
      }));
    });

    if (!mounted) {
      unlistenProgress();
      unlistenCompleted();
      unlistenFailed();
      return;
    }

    unlistenFnsRef.current = [
      unlistenProgress,
      unlistenCompleted,
      unlistenFailed,
    ];
    console.log("[useDetection] 进度监听器注册完成");
  }, []);

  // 组件挂载时注册 WebSocket 事件监听器（只注册一次）
  useEffect(() => {
    const registerListeners = async () => {
      console.log("[useDetection] 注册 WebSocket 事件监听器");

      // 注册 ws_connected 事件监听器（只注册一次，不清理）
      const unlistenConnected = await listenWsConnected((clientId) => {
        console.log("[useDetection] 收到 ws_connected 事件，clientId:", clientId);
        // 通过 ref 设置 clientId
        clientIdRef.current = clientId;
        // resolve Promise
        if (clientIdResolveRef.current) {
          clientIdResolveRef.current(clientId);
          clientIdResolveRef.current = null;
        }
      });

      // 保存 connected 监听器，不清理
      unlistenConnectedRef.current = unlistenConnected;
      console.log("[useDetection] WebSocket connected 监听器注册完成");
    };

    registerListeners();

    return () => {
      console.log("[useDetection] 清理事件监听器");
      // 组件卸载时清理 connected 监听器
      if (unlistenConnectedRef.current) {
        unlistenConnectedRef.current();
        unlistenConnectedRef.current = null;
      }
      // 清理进度监听器
      cleanupProgressListeners();
    };
  }, [cleanupProgressListeners]);

  const startDetection = useCallback(async () => {
    if (images.length === 0) {
      setError("请先上传图片");
      return;
    }

    // 重置任务完成标记
    isTaskCompletedRef.current = false;

    // 每次检测前清理旧的进度监听器，然后重新注册
    cleanupProgressListeners();
    await registerProgressListeners();

    setStatus("connecting");
    setError(null);
    setUserState((prev) => ({
      ...prev,
      progress: 0,
      completedResults: [],
    }));

    try {
      const invalidImages = await checkFormat(images);
      if (invalidImages.length > 0) {
        throw new Error(`以下图片验证失败: ${invalidImages.join(", ")}`);
      }

      // 使用 ref 获取 clientId，避免闭包问题
      let clientId = clientIdRef.current;

      // 从 localStorage 获取 API Key
      const apiKey = localStorage.getItem("api_key") || "";

      if (!clientId) {
        console.log("[useDetection] 连接 WebSocket...");
        // 创建 Promise 等待 client_id
        const clientIdPromise = new Promise<string>((resolve) => {
          clientIdResolveRef.current = resolve;
        });

        // 调用 connectWebsocket（返回 "pending"）
        await connectWebsocket(apiKey);

        // 等待 ws_connected 事件获取真正的 client_id
        clientId = await clientIdPromise;
        console.log("[useDetection] 获取到 clientId:", clientId);
        setUserState((prev) => ({
          ...prev,
          clientId,
          isConnected: true,
        }));
      }

      setStatus("detecting");

      let taskResponse: AsyncTaskResponse;

      if (mode === "single") {
        const base64Images = await Promise.all(
          images.map((img) => fileToBase64(img.file))
        );
        taskResponse = await detectSingleModeAsync(
          {
            mode: "single",
            modality: "rgb",
            images: base64Images,
          },
          clientId,
          apiKey
        );
      } else {
        const { pairs, unpairedRgb, unpairedIr, invalidFiles } =
          pairImagesByFilename(images);

        const errors: string[] = [];

        if (invalidFiles.length > 0) {
          errors.push(
            `以下文件命名格式不正确: ${invalidFiles
              .map((img) => img.file.name)
              .join(", ")}`
          );
        }

        if (unpairedRgb.length > 0) {
          errors.push(
            `以下RGB图片缺少对应的IR图片: ${unpairedRgb
              .map((img) => img.file.name)
              .join(", ")}`
          );
        }

        if (unpairedIr.length > 0) {
          errors.push(
            `以下IR图片缺少对应的RGB图片: ${unpairedIr
              .map((img) => img.file.name)
              .join(", ")}`
          );
        }

        if (pairs.length === 0) {
          errors.push(
            "未找到可配对的RGB和IR图片，请确保文件名格式为rgb_xxx和ir_xxx"
          );
        }

        if (errors.length > 0) {
          setError(errors.join("; ").substring(0, 20));
          setStatus("idle");
          return;
        }

        const pairsData = await Promise.all(
          pairs.map(async ({ rgb, ir }) => ({
            rgb: await fileToBase64(rgb.file),
            ir: await fileToBase64(ir.file),
          }))
        );

        taskResponse = await detectFusionModeAsync(
          {
            mode: "fusion",
            pairs: pairsData,
          },
          clientId,
          apiKey
        );
      }

      if (!taskResponse.task_id) {
        throw new Error(taskResponse.message || "创建任务失败");
      }

      // 只有在任务未完成时才设置 taskId（解决竞态条件）
      if (!isTaskCompletedRef.current) {
        console.log("[useDetection] 任务创建成功, taskId:", taskResponse.task_id);
        setUserState((prev) => ({
          ...prev,
          taskId: taskResponse.task_id,
        }));
      } else {
        console.log("[useDetection] 任务已完成，跳过设置 taskId");
      }
    } catch (err) {
      let errorMsg = "检测失败";
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "string") {
        errorMsg = err;
      } else if (err && typeof err === "object" && "message" in err) {
        errorMsg = String((err as { message: unknown }).message);
      }

      if (
        errorMsg.includes("网络请求失败") ||
        errorMsg.includes("Failed to fetch") ||
        errorMsg.includes("error sending request")
      ) {
        errorMsg = "无法连接后端服务，请确保后端已启动";
      }

      setError(errorMsg);
      setStatus("error");
      // 重置 taskId，允许用户重新尝试
      setUserState((prev) => ({ ...prev, taskId: null }));
    }
  }, [mode, images]);

  const reset = useCallback(() => {
    console.log("[useDetection] 执行 reset()");
    // 每次重置时清理进度监听器
    cleanupProgressListeners();
    setImages([]);
    setStatus("idle");
    setError(null);
    setUserState((prev) => ({
      clientId: prev.clientId,
      taskId: null,
      isConnected: !!prev.clientId,
      progress: 0,
      completedResults: [],
    }));
  }, [cleanupProgressListeners]);

  return {
    mode,
    setMode,
    images,
    addImages,
    removeImage,
    clearImages,
    status,
    error,
    userState,
    startDetection,
    reset,
  };
}
