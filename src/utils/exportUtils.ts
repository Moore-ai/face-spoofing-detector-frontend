import type { HistoryTaskItem, HistoryResultItem } from "../api/tauri";

/**
 * 将单张图片的检测结果转换为可导出的对象
 */
function toResultExportObject(result: HistoryResultItem): Record<string, unknown> {
  return {
    mode: result.mode,
    modality: result.modality,
    result: result.result,
    confidence: result.confidence,
    probabilities: result.probabilities,
    processingTime: result.processingTime,
    imageIndex: result.imageIndex,
    error: result.error,
    retryCount: result.retryCount,
  };
}

/**
 * 将 HistoryTaskItem 转换为可导出的对象
 */
function toExportObject(item: HistoryTaskItem): Record<string, unknown> {
  return {
    taskId: item.taskId,
    clientId: item.clientId,
    mode: item.mode,
    status: item.status,
    totalItems: item.totalItems,
    successfulItems: item.successfulItems,
    failedItems: item.failedItems,
    realCount: item.realCount,
    fakeCount: item.fakeCount,
    elapsedTimeMs: item.elapsedTimeMs,
    createdAt: item.createdAt,
    completedAt: item.completedAt,
    // 导出每张图片的检测结果
    results: item.results?.map(toResultExportObject) || [],
  };
}

/**
 * 导出为 JSON 格式
 */
export function exportToJSON(items: HistoryTaskItem[], filename: string): void {
  const data = items.map(toExportObject);
  const content = JSON.stringify(data, null, 2);
  downloadFile(content, filename, 'application/json');
}

/**
 * 导出为 XML 格式
 */
export function exportToXML(items: HistoryTaskItem[], filename: string): void {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<historyRecords>\n';

  for (const item of items) {
    xml += '  <record>\n';
    const obj = toExportObject(item);
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        continue;
      }
      // 处理 results 数组
      if (key === 'results' && Array.isArray(value) && value.length > 0) {
        xml += '    <results>\n';
        for (const result of value) {
          xml += '      <result>\n';
          for (const [resultKey, resultValue] of Object.entries(result as Record<string, unknown>)) {
            if (resultValue !== undefined && resultValue !== null) {
              if (Array.isArray(resultValue)) {
                xml += `        <${resultKey}>[${resultValue.join(',')}]</${resultKey}>\n`;
              } else {
                xml += `        <${resultKey}>${escapeXml(String(resultValue))}</${resultKey}>\n`;
              }
            }
          }
          xml += '      </result>\n';
        }
        xml += '    </results>\n';
      } else if (Array.isArray(value)) {
        xml += `    <${key}>[${value.join(',')}]</${key}>\n`;
      } else {
        xml += `    <${key}>${escapeXml(String(value))}</${key}>\n`;
      }
    }
    xml += '  </record>\n';
  }

  xml += '</historyRecords>';
  downloadFile(xml, filename, 'application/xml');
}

/**
 * 导出为 YAML 格式（简易实现）
 */
export function exportToYAML(items: HistoryTaskItem[], filename: string): void {
  let yaml = '# 历史记录导出\n';
  yaml += `# 导出时间：${new Date().toISOString()}\n`;
  yaml += `# 记录数：${items.length}\n\n`;
  yaml += 'records:\n';

  for (const item of items) {
    const obj = toExportObject(item);
    yaml += '  - record:\n';
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        continue;
      }
      // 处理 results 数组
      if (key === 'results' && Array.isArray(value) && value.length > 0) {
        yaml += '      results:\n';
        for (const result of value) {
          yaml += '        - result:\n';
          for (const [resultKey, resultValue] of Object.entries(result as Record<string, unknown>)) {
            if (resultValue !== undefined && resultValue !== null) {
              if (Array.isArray(resultValue)) {
                yaml += `            ${resultKey}: [${resultValue.join(',')}]`;
              } else {
                yaml += `            ${resultKey}: ${formatYAMLValue(resultValue as string | number | boolean)}`;
              }
              yaml += '\n';
            }
          }
        }
      } else if (Array.isArray(value)) {
        yaml += `      ${key}: [${value.map(formatYAMLValue).join(',')}]\n`;
      } else {
        yaml += `      ${key}: ${formatYAMLValue(value as string | number | boolean)}\n`;
      }
    }
  }

  downloadFile(yaml, filename, 'application/x-yaml');
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 格式化 YAML 值
 */
function formatYAMLValue(value: string | number | boolean): string {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const str = String(value);
  // 如果包含特殊字符，用引号包裹
  if (str.includes(':') || str.includes('#') || str.includes('\n') || str.startsWith(' ') || str.endsWith(' ')) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

/**
 * 通用文件下载函数
 * @param content 文件内容
 * @param filename 文件名
 * @param mimeType MIME 类型
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 导出类型
 */
export type ExportFormat = 'json' | 'xml' | 'yaml';

/**
 * 导出配置
 */
export interface ExportOptions {
  format?: ExportFormat;
  filename?: string;
}

/**
 * 导出历史记录
 * @param items 要导出的历史记录列表
 * @param options 导出配置
 */
export function exportHistory(
  items: HistoryTaskItem[],
  options: ExportOptions = {}
): void {
  const { format = 'json', filename } = options;

  if (items.length === 0) {
    console.warn('[exportHistory] 没有要导出的记录');
    return;
  }

  // 生成默认文件名：历史记录_YYYYMMDD_HHMMSS.格式
  const defaultFilename = `历史记录_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.${format}`;
  const finalFilename = filename || defaultFilename;

  switch (format) {
    case 'json':
      exportToJSON(items, finalFilename);
      break;
    case 'xml':
      exportToXML(items, finalFilename);
      break;
    case 'yaml':
      exportToYAML(items, finalFilename);
      break;
    default:
      console.error(`[exportHistory] 不支持的导出格式：${format}`);
  }
}
