import { useState, useCallback } from "react";
import type {
  DetectionMode,
  ImageInfo,
  BatchDetectionResult,
  DetectionStatus,
} from "../types";
import { detectSingleMode, detectFusionMode } from "../api/tauri";

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
      let result: BatchDetectionResult;

      if (mode === "single") {
        result = await detectSingleMode({
          mode: "single",
          modality: "rgb",
          images: images.map((img) => img.preview),
        });
      } else {
        // 融合模式：将图片两两配对
        const pairs = [];
        for (let i = 0; i < images.length - 1; i += 2) {
          pairs.push({
            rgb: images[i].preview,
            ir: images[i + 1]?.preview || images[i].preview,
          });
        }
        result = await detectFusionMode({
          mode: "fusion",
          pairs,
        });
      }

      setResults(result);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "检测失败");
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
