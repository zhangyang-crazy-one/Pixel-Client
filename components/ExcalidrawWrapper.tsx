/**
 * ExcalidrawWrapper - A simplified wrapper for Excalidraw that works without backend
 * This component handles lazy loading and provides fallback for Tauri IPC errors
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Excalidraw, exportToBlob } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { invoke } from '@tauri-apps/api/core';
import type { Theme } from '../types';

// Excalidraw types (simplified)
interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  [key: string]: unknown;
}

interface ExcalidrawAppState {
  theme?: 'light' | 'dark';
  viewBackgroundColor?: string;
  [key: string]: unknown;
}

interface ExcalidrawImperativeAPI {
  updateScene: (data: { elements?: readonly ExcalidrawElement[]; appState?: Partial<ExcalidrawAppState> }) => void;
  getSceneElements: () => readonly ExcalidrawElement[];
  getAppState: () => ExcalidrawAppState;
  getFiles: () => Record<string, Uint8Array>;
  resetScene: () => void;
  history: {
    undo: () => void;
    redo: () => void;
    hasUndo: () => boolean;
    hasRedo: () => boolean;
  };
}

interface ExcalidrawWrapperProps {
  /** Theme from app */
  theme: Theme;
  /** Session ID for saving */
  sessionId?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Toast notification callback */
  onToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const STORAGE_KEY_PREFIX = 'excalidraw_scene_';

export function ExcalidrawWrapper({
  theme,
  sessionId = 'default',
  readOnly = false,
  onError,
  onToast,
}: ExcalidrawWrapperProps): React.ReactElement {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Determine Excalidraw theme based on app theme
  const excalidrawTheme: 'light' | 'dark' = 
    theme === 'light' || theme === 'shadcn_light' || theme === 'modern_light' 
      ? 'light' 
      : 'dark';

  // Load scene from localStorage on mount
  useEffect(() => {
    if (!excalidrawAPI) return;
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
      if (stored) {
        const data = JSON.parse(stored);
        excalidrawAPI.updateScene({
          elements: data.elements || [],
          appState: { ...data.appState, theme: excalidrawTheme },
        });
      }
    } catch (err) {
      console.warn('Failed to load scene from localStorage:', err);
    }
  }, [excalidrawAPI, sessionId, excalidrawTheme]);

  // Save scene to localStorage
  // @param showNotification - whether to show toast notification (false for auto-save)
  const saveScene = useCallback((showNotification = true) => {
    if (!excalidrawAPI || readOnly) return;

    setIsSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      const data = {
        type: 'excalidraw',
        version: 2,
        source: 'pixelverse',
        elements: [...elements],
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          theme: appState.theme,
        },
      };

      localStorage.setItem(`${STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(data));
      setLastSaved(new Date());
      if (showNotification) {
        onToast?.('画布已保存', 'success');
      }
    } catch (err) {
      console.error('Failed to save scene:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
      if (showNotification) {
        onToast?.('保存失败', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI, sessionId, readOnly, onError, onToast]);

  // Auto-save on change (debounced)
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: ExcalidrawAppState) => {
      if (readOnly) return;
      
      // Clear previous timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Debounce auto-save (no toast notification for auto-save)
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveScene(false);
      }, 2000);
    },
    [saveScene, readOnly]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Helper to convert Blob to Uint8Array for raw binary IPC
const blobToUint8Array = async (blob: Blob): Promise<Uint8Array> => {
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

// Export to PNG (uses Tauri Rust backend with raw binary IPC - optimized, no base64)
  const handleExportPNG = useCallback(async () => {
    if (!excalidrawAPI) return;

    setIsSaving(true);

    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      // Use standalone exportToBlob function from @excalidraw/excalidraw
      const blob = await exportToBlob({
        elements: [...elements],
        appState: {
          ...appState,
          exportWithDarkMode: excalidrawTheme === 'dark',
        },
        files,
        mimeType: 'image/png',
      });

      // Convert to Uint8Array for raw binary IPC (no base64 overhead!)
      const imageBytes = await blobToUint8Array(blob);

      // Try to save via Tauri Rust backend using raw binary IPC
      try {
        const savedPath = await invoke<string>('save_excalidraw_image_raw', imageBytes, {
          headers: {
            'X-Scene-Id': sessionId,
          },
        });

        console.log('Image saved via Tauri raw IPC to:', savedPath);
        setLastSaved(new Date());
        
        // Show success toast with file path
        const fileName = savedPath.split(/[/\\]/).pop() || 'excalidraw.png';
        const displayPath = `excalidraw_exports/${fileName}`;
        onToast?.(`图片已保存: ${displayPath}`, 'success');
      } catch (tauriError) {
        // Fallback: try base64 version
        console.warn('Raw IPC failed, trying base64 fallback:', tauriError);
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          const savedPath = await invoke<string>('save_excalidraw_image', {
            imageData: base64Data,
            sceneId: sessionId,
          });
          
          console.log('Image saved via base64 fallback to:', savedPath);
          setLastSaved(new Date());
          
          // Show success toast with file path
          const fileName = savedPath.split(/[/\\]/).pop() || 'excalidraw.png';
          const displayPath = `excalidraw_exports/${fileName}`;
          onToast?.(`图片已保存: ${displayPath}`, 'success');
        } catch (fallbackError) {
          console.warn('Tauri save failed completely:', fallbackError);
          onToast?.('保存失败，请重试', 'error');
        }
      }

      // Always download locally as user feedback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `excalidraw-${sessionId}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      onError?.(err instanceof Error ? err : new Error(String(err)));
      onToast?.('导出失败，请重试', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI, sessionId, excalidrawTheme, onError, onToast]);

  // Clear scene
  const handleClear = useCallback(() => {
    if (!excalidrawAPI) return;
    excalidrawAPI.resetScene();
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${sessionId}`);
    setLastSaved(null);
  }, [excalidrawAPI, sessionId]);

  return (
    <div className="excalidraw-wrapper" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      {!readOnly && (
        <div 
          className="excalidraw-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid var(--color-border, #333)',
            background: excalidrawTheme === 'dark' ? '#1e1e1e' : '#f5f5f5',
            minHeight: '44px',
          }}
        >
          <button
            onClick={saveScene}
            disabled={isSaving}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          <button
            onClick={handleExportPNG}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #555',
              background: 'transparent',
              color: excalidrawTheme === 'dark' ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Export PNG
          </button>
          
          <button
            onClick={handleClear}
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              border: '1px solid #ef4444',
              background: 'transparent',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Clear
          </button>
          
          <div style={{ flex: 1 }} />
          
          {lastSaved && (
            <span style={{ fontSize: '12px', color: '#888' }}>
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
      
      {/* Excalidraw Canvas */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Excalidraw
          excalidrawAPI={(api) => setExcalidrawAPI(api as unknown as ExcalidrawImperativeAPI)}
          onChange={handleChange as never}
          theme={excalidrawTheme}
          viewModeEnabled={readOnly}
          initialData={{
            appState: {
              theme: excalidrawTheme,
              viewBackgroundColor: excalidrawTheme === 'dark' ? '#1e1e1e' : '#ffffff',
            },
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: { saveFileToDisk: true },
              toggleTheme: false,
            },
          }}
        />
      </div>
    </div>
  );
}

export default ExcalidrawWrapper;
