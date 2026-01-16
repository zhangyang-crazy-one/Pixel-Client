import React, { useCallback, useEffect, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { useExcalidraw, defaultAppState } from '../../hooks/useExcalidraw';
import type {
  ExcalidrawData,
  ExcalidrawSceneInfo,
  ExcalidrawElement,
  BinaryFiles,
  AppState,
  ExcalidrawImperativeAPI,
  OrderedExcalidrawElement,
} from '../../types/excalidraw.types';

interface ExcalidrawEditorProps {
  /** 会话 ID */
  conversationId: string;
  
  /** 初始场景 ID (加载现有场景) */
  initialSceneId?: string;
  
  /** 主题 */
  theme?: 'light' | 'dark';
  
  /** 只读模式 */
  readOnly?: boolean;
  
  /** 自动保存启用 */
  autoSave?: boolean;
  
  /** 保存时的回调 */
  onSave?: (sceneId: string, data: ExcalidrawData) => void;
  
  /** 加载完成回调 */
  onLoad?: (data: ExcalidrawData) => void;
  
  /** 变化回调 */
  onChange?: (data: ExcalidrawData) => void;
  
  /** 错误回调 */
  onError?: (error: Error) => void;
}

export function ExcalidrawEditor({
  conversationId,
  initialSceneId,
  theme = 'dark',
  readOnly = false,
  autoSave = true,
  onSave,
  onLoad,
  onChange,
  onError,
}: ExcalidrawEditorProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scenes, setScenes] = useState<ExcalidrawSceneInfo[]>([]);
  const [showSceneList, setShowSceneList] = useState(false);
  const [hasUndo, setHasUndo] = useState(false);
  const [hasRedo, setHasRedo] = useState(false);
  
  const {
    currentSceneId,
    isSaving,
    lastSaved,
    saveScene,
    loadScene,
    listScenes,
    deleteScene,
    clearScene,
  } = useExcalidraw({
    conversationId,
    autoSave,
    onSave,
    onError,
  });

  // 初始化加载
  useEffect(() => {
    if (initialSceneId && excalidrawAPI) {
      setIsLoading(true);
      loadScene(initialSceneId)
        .then((data) => {
          if (data) {
            excalidrawAPI.updateScene({
              elements: data.elements,
              appState: { ...defaultAppState, ...data.appState },
            });
            onLoad?.(data);
          }
        })
        .catch((err) => {
          onError?.(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [initialSceneId, excalidrawAPI, loadScene, onLoad, onError]);

  // 处理变化
  const handleChange = (
    elements: readonly OrderedExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    onChange?.({
      type: 'excalidraw',
      version: 2,
      source: '',
      elements: [...elements] as ExcalidrawElement[],
      appState,
      files,
    });
  };

  // 处理手动保存
  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;
    
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    
    try {
      await saveScene(elements as never[], appState);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [excalidrawAPI, saveScene, onError]);

  // 加载场景
  const handleLoadScene = useCallback(async (sceneId: string) => {
    if (!excalidrawAPI) return;
    
    setIsLoading(true);
    const data = await loadScene(sceneId);
    
    if (data) {
      excalidrawAPI.updateScene({
        elements: data.elements,
        appState: { ...defaultAppState, ...data.appState },
      });
      onLoad?.(data);
    }
    
    setIsLoading(false);
    setShowSceneList(false);
  }, [excalidrawAPI, loadScene, onLoad]);

  // 删除场景
  const handleDeleteScene = useCallback(async (sceneId: string) => {
    try {
      await deleteScene(sceneId);
      setScenes((prev) => prev.filter((s) => s.id !== sceneId));
      
      if (currentSceneId === sceneId) {
        clearScene();
        excalidrawAPI?.resetScene();
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [deleteScene, currentSceneId, clearScene, excalidrawAPI, onError]);

  // 刷新场景列表
  const handleRefreshScenes = useCallback(async () => {
    const list = await listScenes();
    setScenes(list);
  }, [listScenes]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // 处理导出 PNG
  const handleExportPNG = useCallback(async () => {
    if (!excalidrawAPI) return;
    
    try {
      const blob = await excalidrawAPI.exportToBlob({ format: 'png' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `excalidraw-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [excalidrawAPI, onError]);

  // 处理导出 SVG
  const handleExportSVG = useCallback(async () => {
    if (!excalidrawAPI) return;
    
    try {
      const svgElement = await excalidrawAPI.getExportSvg({ exportBackground: true });
      if (!svgElement) {
        throw new Error('Failed to generate SVG');
      }
      
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `excalidraw-${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }, [excalidrawAPI, onError]);

  // 处理撤销
  const handleUndo = useCallback(() => {
    excalidrawAPI?.history.undo();
    setHasUndo(excalidrawAPI?.history.hasUndo() ?? false);
    setHasRedo(excalidrawAPI?.history.hasRedo() ?? false);
  }, [excalidrawAPI]);

  // 处理重做
  const handleRedo = useCallback(() => {
    excalidrawAPI?.history.redo();
    setHasUndo(excalidrawAPI?.history.hasUndo() ?? false);
    setHasRedo(excalidrawAPI?.history.hasRedo() ?? false);
  }, [excalidrawAPI]);

  // 更新撤销/重做状态
  useEffect(() => {
    if (!excalidrawAPI) return;
    
    const updateHistoryState = () => {
      setHasUndo(excalidrawAPI.history.hasUndo());
      setHasRedo(excalidrawAPI.history.hasRedo());
    };
    
    // 初始状态
    updateHistoryState();
    
    // 监听变化 (通过定期检查)
    const interval = setInterval(updateHistoryState, 500);
    return () => clearInterval(interval);
  }, [excalidrawAPI]);

  return (
    <div className="excalidraw-editor" style={{ width: '100%', height: '100%' }}>
      {/* 工具栏 */}
      {!readOnly && (
        <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={handleSave}
            disabled={!excalidrawAPI || isSaving}
            className="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
          
          <button
            onClick={() => {
              handleRefreshScenes();
              setShowSceneList(true);
            }}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            加载
          </button>
          
          <button
            onClick={() => {
              clearScene();
              excalidrawAPI?.resetScene();
            }}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            新建
          </button>
          
          <button
            onClick={handleExportPNG}
            disabled={!excalidrawAPI}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            PNG
          </button>
          
          <button
            onClick={handleExportSVG}
            disabled={!excalidrawAPI}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            SVG
          </button>
          
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          
          <button
            onClick={handleUndo}
            disabled={!excalidrawAPI || !hasUndo}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            title="撤销"
          >
            ↩
          </button>
          
          <button
            onClick={handleRedo}
            disabled={!excalidrawAPI || !hasRedo}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            title="重做"
          >
            ↪
          </button>
          
          <div className="flex-1" />
          
          {lastSaved && (
            <span className="text-sm text-gray-500">
              最后保存: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          {currentSceneId && (
            <span className="text-sm text-gray-500">
              场景: {currentSceneId.slice(0, 8)}...
            </span>
          )}
        </div>
      )}
      
      {/* Excalidraw 组件 */}
      <div style={{ width: '100%', height: 'calc(100% - 48px)' }}>
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api as unknown as ExcalidrawImperativeAPI)}
          // @ts-ignore - Excalidraw 库类型与我们的类型有差异
          onChange={handleChange}
          initialData={{
            elements: [],
            appState: { ...defaultAppState, theme } as any,
          }}
          theme={theme}
          viewModeEnabled={readOnly}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: {
                saveFileToDisk: true,
              },
              toggleTheme: true,
            },
          }}
        />
      </div>
      
      {/* 场景列表弹窗 */}
      {showSceneList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">场景列表</h3>
              <button
                onClick={() => setShowSceneList(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {scenes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无场景</p>
            ) : (
              <ul className="space-y-2">
                {scenes.map((scene) => (
                  <li
                    key={scene.id}
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded"
                  >
                    <div>
                      <span className="font-medium">
                        {scene.name || scene.id.slice(0, 8)}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {scene.elementCount} 元素
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadScene(scene.id)}
                        className="px-2 py-1 text-sm bg-blue-500 text-white rounded"
                      >
                        加载
                      </button>
                      <button
                        onClick={() => handleDeleteScene(scene.id)}
                        className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                      >
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      {/* 加载遮罩 */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            加载中...
          </div>
        </div>
      )}
    </div>
  );
}

export default ExcalidrawEditor;
