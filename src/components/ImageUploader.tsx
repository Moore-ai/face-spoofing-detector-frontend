import type { ModalityType, ImageInfo } from "../types";
import type { BaseProps } from "../types";

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
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages: ImageInfo[] = [];

    Array.from(files).forEach((file, index) => {
      if (images.length + newImages.length >= maxFiles) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const modality: ModalityType = mode === "fusion"
          ? (index % 2 === 0 ? "rgb" : "ir")
          : "rgb";

        const imageInfo: ImageInfo = {
          id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview: e.target?.result as string,
          modality,
        };

        newImages.push(imageInfo);

        if (newImages.length === Math.min(files.length, maxFiles - images.length)) {
          onImagesAdd(newImages);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;

    const files = Array.from(event.dataTransfer.files).filter(file =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) return;

    const newImages: ImageInfo[] = [];

    files.forEach((file, index) => {
      if (images.length + newImages.length >= maxFiles) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const modality: ModalityType = mode === "fusion"
          ? (index % 2 === 0 ? "rgb" : "ir")
          : "rgb";

        const imageInfo: ImageInfo = {
          id: `${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview: e.target?.result as string,
          modality,
        };

        newImages.push(imageInfo);

        if (newImages.length === Math.min(files.length, maxFiles - images.length)) {
          onImagesAdd([...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className={`image-uploader ${className}`}>
      <div
        className={`upload-zone ${disabled ? "disabled" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
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
                onClick={() => onImageRemove(image.id)}
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
