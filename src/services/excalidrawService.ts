import { invoke } from '@tauri-apps/api/core';
import type { ExcalidrawData, ExcalidrawSceneInfo, AppState } from '../types/excalidraw.types';

/**
 * Excalidraw Service - Tauri IPC 封装
 * 封装与 Rust 后端的 Excalidraw 命令交互
 */
export const excalidrawService = {
  /**
   * 保存场景到磁盘
   */
  async save(
    conversationId: string,
    elements: readonly unknown[],
    appState: AppState
  ): Promise<string> {
    const elementsJson = JSON.stringify(elements);
    const appStateJson = JSON.stringify(appState);
    
    return await invoke('save_excalidraw_scene', {
      conversationId,
      elementsJson,
      appStateJson,
    });
  },

  /**
   * 从磁盘加载场景
   */
  async load(sceneId: string): Promise<ExcalidrawData> {
    const result = await invoke<{
      type: string;
      version: number;
      source: string;
      elements: unknown[];
      appState: Record<string, unknown>;
      files: Record<string, unknown>;
    }>('load_excalidraw_scene', { sceneId });
    
    return {
      type: 'excalidraw' as const,
      version: result.version,
      source: result.source,
      elements: result.elements as never[],
      appState: result.appState as unknown as AppState,
      files: result.files as never,
    };
  },

  /**
   * 列出对话的所有场景
   */
  async list(conversationId: string): Promise<ExcalidrawSceneInfo[]> {
    return await invoke<ExcalidrawSceneInfo[]>('list_excalidraw_scenes', {
      conversationId,
    });
  },

  /**
   * 删除场景
   */
  async delete(sceneId: string): Promise<void> {
    return await invoke('delete_excalidraw_scene', { sceneId });
  },

  /**
   * 导出场景 (JSON 格式)
   */
  async export(sceneId: string): Promise<string> {
    return await invoke('export_excalidraw_scene', { sceneId });
  },

  /**
   * 导入场景 (从 JSON)
   */
  async import(
    conversationId: string,
    jsonData: string
  ): Promise<string> {
    return await invoke('import_excalidraw_scene', {
      conversationId,
      jsonStr: jsonData,
    });
  },

  /**
   * 导出为 PNG (需要前端处理)
   */
  async exportToPng(
    elements: readonly unknown[],
    appState: Record<string, unknown>
  ): Promise<Blob> {
    // 此功能需要在前端使用 canvas 导出
    // Excalidraw 组件提供 exportToBlob 方法
    throw new Error('Use Excalidraw component exportToBlob instead');
  },

  /**
   * 加载文件
   */
  async loadFile(file: File): Promise<ExcalidrawData> {
    const text = await file.text();
    const data = JSON.parse(text);
    
    return {
      type: data.type || 'excalidraw',
      version: data.version || 2,
      source: data.source || '',
      elements: data.elements || [],
      appState: data.appState || {},
      files: data.files || {},
    };
  },
};

/**
 * 事件监听器设置
 */
export function setupExcalidrawEventListeners(): () => void {
  const listeners: (() => void)[] = [];
  
  // 这些事件监听器可以在组件中使用 useEffect 设置
  
  return () => {
    listeners.forEach((unsub) => unsub());
  };
}
