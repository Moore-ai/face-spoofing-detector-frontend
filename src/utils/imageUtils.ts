import type { ModalityType } from "../types";

/**
 * 从文件名中提取模态类型（rgb/ir）
 * 规则：文件名中下划线前的部分为 rgb_ 或 ir_
 * 例如：
 *   - rgb_001.jpg → "rgb"
 *   - ir_001.png → "ir"
 *   - other.jpg → "rgb"（默认）
 */
export function getModalityFromFilename(filename: string): ModalityType {
  const underscoreIndex = filename.indexOf("_");
  
  if (underscoreIndex === -1) {
    return "rgb"; // 默认返回 rgb
  }
  
  const prefix = filename.substring(0, underscoreIndex).toLowerCase();
  
  if (prefix === "ir") {
    return "ir";
  }
  
  return "rgb"; // rgb 或其他前缀都视为 rgb
}
