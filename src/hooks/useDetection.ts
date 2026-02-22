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
  type WsEventMessage,
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

  const addImages = useCallback((newImages: ImageInfo[]) => {
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  const cleanupListeners = useCallback(() => {
    unlistenFnsRef.current.forEach((fn) => fn());
    unlistenFnsRef.current = [];
  }, []);

  const handleProgress = useCallback((wsMsg: WsEventMessage) => {
    if (wsMsg.processed_items !== null && wsMsg.total_items !== null) {
      const progress = Math.round(
        (wsMsg.processed_items / wsMsg.total_items) * 100
      );
      setUserState((prev) => ({
        ...prev,
        progress,
      }));
    }

    // 将当前结果添加到已完成列表
    if (wsMsg.result) {
      const result: DetectionResultItem = {
        id: `${wsMsg.task_id}_${wsMsg.processed_items || 0}`,
        result: wsMsg.result.result as "real" | "fake",
        confidence: wsMsg.result.confidence,
        timestamp: new Date().toISOString(),
        processingTime: wsMsg.result.processing_time,
      };
      setUserState((prev) => ({
        ...prev,
        completedResults: [...prev.completedResults, result],
      }));
    }

    if (wsMsg.message) {
      console.log("进度:", wsMsg.message);
    }
  }, []);

  const handleTaskCompleted = useCallback(
    (wsMsg: WsEventMessage) => {
      console.log("任务完成:", wsMsg);
      setStatus("success");
      setUserState((prev) => ({
        ...prev,
        taskId: null,
        progress: 100,
        isConnected: true,
      }));
    },
    []
  );

  const handleTaskFailed = useCallback((wsMsg: WsEventMessage) => {
    console.error("任务失败:", wsMsg);
    setError(wsMsg.message || "检测失败");
    setStatus("error");
    setUserState((prev) => ({
      ...prev,
      taskId: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      cleanupListeners();
    };
  }, [cleanupListeners]);

  const startDetection = useCallback(async () => {
    if (images.length === 0) {
      setError("请先上传图片");
      return;
    }

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

      // 每次检测都重新创建监听器，确保能接收事件
      cleanupListeners();

      const unlistenProgress = await listenWsProgress(handleProgress);
      const unlistenCompleted = await listenWsTaskCompleted(handleTaskCompleted);
      const unlistenFailed = await listenWsTaskFailed(handleTaskFailed);

      unlistenFnsRef.current = [
        unlistenProgress,
        unlistenCompleted,
        unlistenFailed,
      ];

      let clientId = userState.clientId;

      if (!clientId) {
        clientId = await connectWebsocket();
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
          clientId
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
          clientId
        );
      }

      if (!taskResponse.taskId) {
        throw new Error(taskResponse.message || "创建任务失败");
      }

      setUserState((prev) => ({
        ...prev,
        taskId: taskResponse.taskId,
      }));
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
    }
  }, [mode, images, userState.clientId, handleProgress, handleTaskCompleted, handleTaskFailed]);

  const reset = useCallback(() => {
    cleanupListeners();
    setImages([]);
    setStatus("idle");
    setError(null);
    setUserState({
      clientId: userState.clientId,
      taskId: null,
      isConnected: !!userState.clientId,
      progress: 0,
      completedResults: [],
    });
  }, [cleanupListeners, userState.clientId]);

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
