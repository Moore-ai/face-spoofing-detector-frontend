import { useRef, useEffect, useCallback } from "react";
import type { ModalityType, ImageInfo } from "../../types";
import type { BaseProps } from "../../types";
import { getModalityFromFilename } from "../../utils/imageUtils";

interface ImageUploaderProps extends BaseProps {
  mode: "single" | "fusion";
  images: ImageInfo[];
  onImagesAdd: (images: ImageInfo[]) => void;
  onImageRemove: (id: string) => void;
  disabled?: boolean;
  maxFiles?: number;
}

/**
 * 图片上传组件
 * 支持拖拽上传和点击上传
 * 单模态模式：上传RGB或IR图片
 * 融合模式：成对上传RGB和IR图片
 */
export function ImageUploader({
  mode,
  images,
  onImagesAdd,
  onImageRemove,
  disabled = false,
  maxFiles = 50,
  className = "",
}: ImageUploaderProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当 images 为空时重置文件输入框，确保可以重新选择相同文件
  useEffect(() => {
    if (images.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [images.length]);

  // 处理文件列表，转换为 ImageInfo
  const processFiles = useCallback((files: FileList | File[]): ImageInfo[] => {
    const fileArray = Array.from(files);
    const currentCount = images.length;
    const availableSlots = maxFiles - currentCount;

    const newImages: ImageInfo[] = [];
    let processed = 0;

    fileArray.slice(0, availableSlots).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const modality: ModalityType = mode === "fusion"
          ? getModalityFromFilename(file.name)
          : "rgb";

        newImages.push({
          id: `${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
          file,
          preview: e.target?.result as string,
          modality,
        });

        processed++;
        // 所有文件处理完成后一次性添加
        if (processed === Math.min(fileArray.length, availableSlots)) {
          onImagesAdd(newImages);
        }
      };
      reader.readAsDataURL(file);
    });

    return newImages;
  }, [images.length, maxFiles, mode, onImagesAdd]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    processFiles(files);
  }, [processFiles]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;

    const imageFiles = Array.from(event.dataTransfer.files).filter(
      (file) => file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) return;
    processFiles(imageFiles);
  }, [disabled, processFiles]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleRemoveClick = useCallback((id: string) => {
    onImageRemove(id);
  }, [onImageRemove]);

  return (
    <div className={`image-uploader ${className}`}>
      <div
        className={`upload-zone ${disabled ? "disabled" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={disabled}
          className="upload-input"
          id="image-upload"
        />
        <label htmlFor="image-upload" className="upload-label">
          <div className="upload-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <span className="upload-text">
            点击或拖拽上传图片
          </span>
          <span className="upload-hint">
            {mode === "fusion"
              ? "请成对上传RGB和IR图像"
              : "支持JPG、PNG、BMP等格式"}
          </span>
          <span className="upload-count">
            已上传 {images.length} / {maxFiles} 张
          </span>
        </label>
      </div>

      {images.length > 0 && (
        <div className="image-list">
          {images.map((image) => (
            <div key={image.id} className={`image-item ${image.modality}`}>
              <img src={image.preview} alt={image.file.name} />
              <span className="image-modality">{image.modality.toUpperCase()}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => handleRemoveClick(image.id)}
                disabled={disabled}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
