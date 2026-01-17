import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { excalidrawService } from '../services/excalidrawService';
import type {
  ExcalidrawData,
  ExcalidrawSceneInfo,
  ExcalidrawElement,
  AppState,
  ActiveTool,
} from '../types/excalidraw.types';

interface UseExcalidrawOptions {
  conversationId: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
  onSave?: (sceneId: string, data: ExcalidrawData) => void;
  onError?: (error: Error) => void;
}

interface UseExcalidrawReturn {
  // 状态
  currentSceneId: string | null;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  
  // 方法
  saveScene: (elements: readonly ExcalidrawElement[], appState: AppState) => Promise<string>;
  loadScene: (sceneId: string) => Promise<ExcalidrawData | null>;
  listScenes: () => Promise<ExcalidrawSceneInfo[]>;
  deleteScene: (sceneId: string) => Promise<void>;
  exportScene: (sceneId: string) => Promise<string>;
  importScene: (jsonData: string) => Promise<string>;
  clearScene: () => void;
}

/**
 * Excalidraw Hook - 管理 Excalidraw 场景状态和操作
 */
export function useExcalidraw(options: UseExcalidrawOptions): UseExcalidrawReturn {
  const {
    conversationId,
    autoSave = true,
    autoSaveInterval = 5000,
    onSave,
    onError,
  } = options;

  // 状态
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Refs
  const pendingDataRef = useRef<{
    elements: readonly ExcalidrawElement[];
    appState: AppState;
  } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 保存场景
  const saveScene = useCallback(
    async (elements: readonly ExcalidrawElement[], appState: AppState): Promise<string> => {
      setIsSaving(true);
      
      try {
        const sceneId = await excalidrawService.save(
          conversationId,
          elements,
          appState
        );
        
        setCurrentSceneId(sceneId);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        pendingDataRef.current = null;
        
        onSave?.(sceneId, {
          type: 'excalidraw',
          version: 2,
          source: '',
          elements: [...elements],
          appState,
          files: {},
        });
        
        return sceneId;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [conversationId, onSave, onError]
  );

  // 加载场景
  const loadScene = useCallback(
    async (sceneId: string): Promise<ExcalidrawData | null> => {
      setIsLoading(true);
      
      try {
        const data = await excalidrawService.load(sceneId);
        setCurrentSceneId(sceneId);
        setHasUnsavedChanges(false);
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  // 列出场景
  const listScenes = useCallback(async (): Promise<ExcalidrawSceneInfo[]> => {
    try {
      return await excalidrawService.list(conversationId);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      return [];
    }
  }, [conversationId, onError]);

  // 删除场景
  const deleteScene = useCallback(
    async (sceneId: string): Promise<void> => {
      try {
        await excalidrawService.delete(sceneId);
        if (currentSceneId === sceneId) {
          setCurrentSceneId(null);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        throw err;
      }
    },
    [currentSceneId, onError]
  );

  // 导出场景
  const exportScene = useCallback(
    async (sceneId: string): Promise<string> => {
      try {
        return await excalidrawService.export(sceneId);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        throw err;
      }
    },
    [onError]
  );

  // 导入场景
  const importScene = useCallback(
    async (jsonData: string): Promise<string> => {
      try {
        const sceneId = await excalidrawService.import(conversationId, jsonData);
        return sceneId;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err);
        throw err;
      }
    },
    [conversationId, onError]
  );

  // 清空场景
  const clearScene = useCallback(() => {
    setCurrentSceneId(null);
    setHasUnsavedChanges(false);
    pendingDataRef.current = null;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // 自动保存触发器 (供外部使用)
  const triggerAutoSave = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (!autoSave) return;
      
      pendingDataRef.current = { elements: [...elements], appState };
      
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(async () => {
        if (pendingDataRef.current) {
          try {
            await saveScene(
              pendingDataRef.current.elements,
              pendingDataRef.current.appState
            );
          } catch {
            // Error already handled in saveScene
          }
        }
      }, autoSaveInterval);
    },
    [autoSave, autoSaveInterval, saveScene]
  );

  // 清理
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    currentSceneId,
    isSaving,
    isLoading,
    lastSaved,
    hasUnsavedChanges,
    saveScene,
    loadScene,
    listScenes,
    deleteScene,
    exportScene,
    importScene,
    clearScene,
  };
}

/**
 * 默认 AppState
 */
export const defaultAppState: AppState = {
  zoom: { value: 1 },
  scrollX: 0,
  scrollY: 0,
  gridSize: null,
  viewBackgroundColor: '#ffffff',
  theme: 'dark',
  activeTool: { type: 'selection', customType: null, lastActiveTool: null, locked: false },
  selectedElementIds: {},
  selectedGroupIds: {},
  viewModeEnabled: false,
  zenModeEnabled: false,
  gridModeEnabled: false,
  objectsSnapModeEnabled: false,
  openDialog: null,
  openSidebar: null,
  currentItemStrokeColor: '#000000',
  currentItemBackgroundColor: 'transparent',
  currentItemFillStyle: 'hachure',
  currentItemStrokeWidth: 2,
  currentItemStrokeStyle: 'solid',
  currentItemFontSize: 20,
  currentItemFontFamily: 1,
  currentItemTextAlign: 'left',
  currentItemRoundness: null,
  showStats: false,
  collaborators: new Map(),
  userToFollow: null,
  name: null,
  fileHandle: null,
  scrolledOutside: false,
  offsetLeft: 0,
  offsetTop: 0,
  width: 0,
  height: 0,
};
