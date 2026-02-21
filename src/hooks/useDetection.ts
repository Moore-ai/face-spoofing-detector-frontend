import { useState, useCallback } from "react";
import type {
  DetectionMode,
  ImageInfo,
  BatchDetectionResult,
  DetectionStatus,
} from "../types";
import { detectSingleMode, detectFusionMode, getSupportedFormats } from "../api/tauri";

interface UseDetectionReturn {
  mode: DetectionMode;
  setMode: (mode: DetectionMode) => void;
  images: ImageInfo[];
  addImages: (images: ImageInfo[]) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  status: DetectionStatus;
  results: BatchDetectionResult | null;
  error: string | null;
  startDetection: () => Promise<void>;
  reset: () => void;
}

/**
 * 将File对象转换为base64字符串
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除data:image/xxx;base64,前缀
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

/**
 * 按文件名规则配对RGB和IR图片
 * 规则：文件名中下划线前部分为rgb_或ir_，下划线后部分相同的文件配对
 * 例如：rgb_001.jpg 和 ir_001.png 配对（标识符为001）
 */
function pairImagesByFilename(images: ImageInfo[]): {
  pairs: Array<{ rgb: ImageInfo; ir: ImageInfo }>;
  unpairedRgb: ImageInfo[];
  unpairedIr: ImageInfo[];
  invalidFiles: ImageInfo[];
} {
  const rgbImages = new Map<string, ImageInfo>();
  const irImages = new Map<string, ImageInfo>();
  const invalidFiles: ImageInfo[] = [];

  // 按前缀分类图片
  for (const image of images) {
    const filename = image.file.name;
    const underscoreIndex = filename.indexOf("_");

    if (underscoreIndex === -1) {
      invalidFiles.push(image);
      continue;
    }

    const prefix = filename.substring(0, underscoreIndex).toLowerCase();
    // 提取标识符（下划线后到扩展名前的部分）
    const extIndex = filename.lastIndexOf(".");
    const identifier = filename.substring(underscoreIndex + 1, extIndex > underscoreIndex ? extIndex : undefined);

    if (prefix === "rgb") {
      rgbImages.set(identifier, image);
    } else if (prefix === "ir") {
      irImages.set(identifier, image);
    } else {
      invalidFiles.push(image);
    }
  }

  // 配对：找出同时存在rgb和ir的标识符
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

  // 找出未配对的IR图片
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

/**
 * 检测状态管理Hook
 * 管理检测模式、图片列表、检测状态和结果
 */
export function useDetection(): UseDetectionReturn {
  const [mode, setMode] = useState<DetectionMode>("single");
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [status, setStatus] = useState<DetectionStatus>("idle");
  const [results, setResults] = useState<BatchDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addImages = useCallback((newImages: ImageInfo[]) => {
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  const startDetection = useCallback(async () => {
    if (images.length === 0) {
      setError("请先上传图片");
      return;
    }

    setStatus("detecting");
    setError(null);

    try {
      // 验证所有图片
      const invalidImages = await checkFormat(images);
      if (invalidImages.length > 0) {
        throw new Error(`以下图片验证失败: ${invalidImages.join(", ")}`);
      }

      let result: BatchDetectionResult;

      if (mode === "single") {
        // 单模态模式：将所有图片转换为base64
        const base64Images = await Promise.all(
          images.map((img) => fileToBase64(img.file))
        );
        result = await detectSingleMode({
          mode: "single",
          modality: "rgb",
          images: base64Images,
        });
      } else {
        // 融合模式：按文件名规则配对RGB和IR图片
        const { pairs, unpairedRgb, unpairedIr, invalidFiles } = pairImagesByFilename(images);

        // 检查是否有未配对的图片或格式错误的文件
        const errors: string[] = [];

        if (invalidFiles.length > 0) {
          errors.push(`以下文件命名格式不正确: ${invalidFiles.map((img) => img.file.name).join(", ")}`);
        }

        if (unpairedRgb.length > 0) {
          errors.push(`以下RGB图片缺少对应的IR图片: ${unpairedRgb.map((img) => img.file.name).join(", ")}`);
        }

        if (unpairedIr.length > 0) {
          errors.push(`以下IR图片缺少对应的RGB图片: ${unpairedIr.map((img) => img.file.name).join(", ")}`);
        }

        if (pairs.length === 0) {
          errors.push("未找到可配对的RGB和IR图片，请确保文件名格式为rgb_xxx和ir_xxx");
        }

        if (errors.length > 0) {
          alert(errors.join("; "));
          return;
        }

        // 将配对的图片转换为base64
        const pairsData = await Promise.all(
          pairs.map(async ({ rgb, ir }) => ({
            rgb: await fileToBase64(rgb.file),
            ir: await fileToBase64(ir.file),
          }))
        );

        result = await detectFusionMode({
          mode: "fusion",
          pairs: pairsData,
        });
      }

      setResults(result);
      setStatus("success");
    } catch (err) {
      let errorMsg = "检测失败";
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === "string") {
        errorMsg = err;
      }
      
      setError(errorMsg);
      setStatus("error");
    }
  }, [mode, images]);

  const reset = useCallback(() => {
    setImages([]);
    setResults(null);
    setStatus("idle");
    setError(null);
  }, []);

  return {
    mode,
    setMode,
    images,
    addImages,
    removeImage,
    clearImages,
    status,
    results,
    error,
    startDetection,
    reset,
  };
}
