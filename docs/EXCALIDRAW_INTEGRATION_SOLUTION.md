# Excalidraw 集成详细解决方案

> **版本**: v1.0  
> **日期**: 2026-01-16  
> **状态**: 调研完成 - 等待实施

---

## 目录

1. [执行摘要](#执行摘要)
2. [当前项目分析](#当前项目分析)
3. [架构设计](#架构设计)
4. [数据模型](#数据模型)
5. [前端集成方案](#前端集成方案)
6. [后端命令设计](#后端命令设计)
7. [IPC 通信模式](#ipc-通信模式)
8. [性能优化](#性能优化)
9. [边缘情况处理](#边缘情况处理)
10. [实施计划](#实施计划)

---

## 执行摘要

### 调研范围

本次调研覆盖以下领域：
- ✅ @excalidraw/excalidraw React 组件 API
- ✅ Tauri v2 + React IPC 通信模式
- ✅ Excalidraw JSON 数据格式规范
- ✅ 现有项目 Excalidraw 实现分析
- ✅ GitHub 真实项目集成模式

### 关键发现

1. **当前实现是简化版 Canvas 2D 实现**，缺少 Excalidraw 完整功能
2. **后端命令已实现**，但数据模型与官方 Excalidraw 不兼容
3. **Tauri v2 命令参数必须是可序列化类型**，不能直接传递 `tauri::Window`
4. **推荐使用 @excalidraw/excalidraw 官方包**替换现有自定义实现

### 建议方案

```
┌─────────────────────────────────────────────────────────────────┐
│                    推荐架构                                      │
├─────────────────────────────────────────────────────────────────┤
│  React Frontend                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │Excalidraw    │───>│ useExcalidraw│───>│ invoke()     │      │
│  │Component     │    │ Hook         │    │ Tauri API    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                         │             │
│         v                                         v             │
│  onChange 事件                              Rust Backend        │
│         │                                    ┌──────────┐       │
│         └───────────────────────────────────>│Commands  │       │
│                                            └──────────┘       │
│                                                   │            │
│                                                   v            │
│                                            ┌──────────┐       │
│                                            │File System│      │
│                                            └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 当前项目分析

### 1. 现有文件状态

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/components/Excalidraw/ExcalidrawViewer.tsx` | 已存在 | 自定义 Canvas 2D 实现 (292行) |
| `src-tauri/src/commands/excalidraw.rs` | 已存在 | Rust 命令实现 (6个命令) |
| `src-tauri/src/state.rs` | 已存在 | 包含 AppHandleHolder |
| `package.json` | 待修改 | 缺少 @excalidraw/excalidraw |

### 2. 当前 ExcalidrawViewer 功能

**已实现功能**：
- ✅ 基础 Canvas 渲染
- ✅ 矩形、椭圆、箭头、文本工具
- ✅ 选择、移动、删除元素
- ✅ 网格绘制
- ✅ 基础 UI 工具栏

**缺失功能**（vs @excalidraw/excalidraw）：
- ❌ 手绘风格渲染 (hand-drawn style)
- ❌ 自由绘制 (pencil tool)
- ❌ 橡皮擦
- ❌ 形状库 (shape libraries)
- ❌ 图片导入
- ❌ 协作编辑
- ❌ 撤销/重做
- ❌ 缩放/平移
- ❌ 导出 PNG/SVG
- ❌ 主题定制

### 3. 后端命令分析

**现有命令**：
```rust
// src-tauri/src/commands/excalidraw.rs
pub fn save_excalidraw_scene(...)  // 保存场景
pub fn load_excalidraw_scene(...)  // 加载场景
pub fn list_excalidraw_scenes(...) // 列出场景
pub fn delete_excalidraw_scene(...)// 删除场景
pub fn export_excalidraw_scene(...)// 导出场景
pub fn import_excalidraw_scene(...)// 导入场景
```

**问题**：
1. 数据模型与官方 Excalidraw 不兼容
2. 使用自定义 `ExcalidrawElement` 结构
3. 缺少与 React 端的数据同步

---

## 架构设计

### 推荐项目结构

```
src/
├── components/
│   ├── Excalidraw/
│   │   ├── ExcalidrawEditor.tsx     # 主编辑器组件 (替换现有)
│   │   ├── ExcalidrawToolbar.tsx    # 自定义工具栏
│   │   └── ExcalidrawCanvas.tsx     # 画布容器
│   ├── Chat/
│   │   ├── Chat.tsx
│   │   └── ...
│   └── ModelManager/
│       └── ...
├── hooks/
│   ├── useExcalidraw.ts             # Excalidraw 状态管理
│   ├── useAutoSave.ts               # 自动保存逻辑
│   └── useDrawingExport.ts          # 导出逻辑
├── services/
│   ├── excalidrawService.ts         # Tauri IPC 封装
│   └── ...
└── types/
    └── excalidraw.types.ts          # 类型定义

src-tauri/src/
├── commands/
│   ├── excalidraw.rs                # 现有命令 (需更新数据模型)
│   └── ...
└── state/
    └── ...
```

### 核心组件职责

| 组件 | 职责 |
|------|------|
| `ExcalidrawEditor` | 包装官方 Excalidraw 组件，处理 props 传递 |
| `useExcalidraw` | 管理 drawing 状态，提供 CRUD 方法 |
| `excalidrawService` | 封装 Tauri invoke 调用 |
| `Rust commands` | 文件 I/O 操作，JSON 序列化 |

---

## 数据模型

### 1. Excalidraw 官方 JSON 格式

```typescript
// src/types/excalidraw.types.ts

/**
 * Excalidraw 导出 JSON 格式
 * 官方文档: https://docs.excalidraw.com/docs/@excalidraw/excalidraw
 */
export interface ExcalidrawData {
  /** Excalidraw 文件版本 */
  version: number;
  
  /** 元素数组 */
  elements: ExcalidrawElement[];
  
  /** 应用状态 */
  appState: AppState;
  
  /** 绘制时的网格大小 */
  gridSize: number | null;
  
  /** 国际化设置 */
  language: string;
}

/**
 * Excalidraw 元素基类
 */
export interface ExcalidrawElement {
  /** 元素唯一 ID */
  id: string;
  
  /** 元素类型 */
  type: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'line' | 'arrow' | 'freedraw' | 'image' | 'frame';
  
  /** 元素位置和尺寸 */
  x: number;
  y: number;
  width: number;
  height: number;
  
  /** 角度 (弧度) */
  angle: number;
  
  /** 绘制颜色 */
  strokeColor: string;
  backgroundColor: string;
  
  /** 描边样式 */
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  strokeWidth: number;
  
  /** 透明度 */
  opacity: number;
  
  /** 文本相关 (仅 text 类型) */
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  
  /** 自由绘制 (仅 freedraw 类型) */
  points?: Point[];
  
  /** 箭头相关 (仅 arrow/line 类型) */
  startBinding?: Binding | null;
  endBinding?: Binding | null;
  lastCommittedPoint?: Point | null;
  
  /** 框架相关 (仅 frame 类型) */
  children?: string[];
  
  /** 锁定状态 */
  locked?: boolean;
  
  /** 组相关 */
  groupIds?: string[];
  
  /** 依赖的库 ID */
  boundElements?: BoundElement[];
  
  /** 随机种子 (用于手绘风格一致性) */
  seed: number;
  
  /** 版本信息 */
  version: number;
  versionNonce: number;
}

/**
 * 点坐标
 */
export interface Point {
  0: number;  // x
  1: number;  // y
}

/**
 * 绑定关系
 */
export interface Binding {
  elementId: string;
  focus: number;
  gap: number;
}

/**
 * 绑定的元素引用
 */
export interface BoundElement {
  type: 'element' | 'text';
  id: string;
}

/**
 * Excalidraw 应用状态
 */
export interface AppState {
  /** 视图背景色 */
  viewBackgroundColor: string;
  
  /** 网格大小 */
  gridSize: number | null;
  
  /** 缩放比例 */
  zoom: number;
  
  /** 滚动位置 */
  scrollX: number;
  scrollY: number;
  
  /** 活跃工具 */
  activeTool: {
    type: 'selection' | 'rectangle' | 'ellipse' | 'diamond' | 'arrow' | 'line' | 'freedraw' | 'text' | 'eraser' | 'hand' | 'frame';
    customType?: string | null;
  };
  
  /** 当前颜色主题 */
  theme: 'light' | 'dark';
  
  /** 活跃元素 */
  selectedElementIds: Record<string, boolean>;
  
  /** 活跃组 */
  activeGroupId: string | null;
  
  /** 复制粘贴历史 */
  clipboard: {
    data: ExcalidrawElement[];
    source: 'local' | 'remote';
  } | null;
  
  /** 图像元素状态 */
  imageElements: Record<string, {
    loaded: boolean;
    error: boolean;
  }>;
  
  /** 撤销/重做栈 */
  redoStack: Action[];
  undoStack: Action[];
  
  /** 绘制历史标记 */
  history: {
    snapshot: string;
    setDirty: boolean;
  };
  
  /** 实时协作 */
  collaborator: Record<string, {
    cursor: Point;
    selection: string[];
    color: string;
  }>;
  
  /** 元素提示 */
  showElementTips: boolean;
  
  /** 拖拽状态 */
  isDragging: boolean;
  isResizing: boolean;
  
  /** 注释提示 */
  pendingNoteElementId: string | null;
  
  /** 滚动到元素 */
  scrollToContent: string | null;
  
  /** 文件信息 */
  fileHandle: FileSystemFileHandle | null;
}

/**
 * 场景列表项
 */
export interface ExcalidrawSceneInfo {
  id: string;
  conversationId: string;
  createdAt: number;
  updatedAt: number;
  elementCount: number;
  thumbnail?: string;
}
```

### 2. 前后端数据流

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据流                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Excalidraw Component]                                         │
│         │                                                      │
│         v onChange(elements, appState)                         │
│         │                                                      │
│  [useExcalidraw Hook]                                          │
│         │                                                      │
│         v setState()                                           │
│         │                                                      │
│         v debounced save (300-500ms)                           │
│         │                                                      │
│         v JSON.stringify({ elements, appState })               │
│         │                                                      │
│  [excalidrawService]                                           │
│         │                                                      │
│         v invoke('save_excalidraw_scene', { ... })             │
│         │                                                      │
│  [Rust Backend]                                                │
│         │                                                      │
│         v serde_json::from_value()                             │
│         │                                                      │
│         v fs::write()                                          │
│         │                                                      │
│  [File System]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 前端集成方案

### 1. 安装依赖

```bash
# package.json 需要添加
bun add @excalidraw/excalidraw
```

### 2. ExcalidrawEditor 组件

```tsx
// src/components/Excalidraw/ExcalidrawEditor.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { Excalidraw, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw';
import { useExcalidraw } from '@/hooks/useExcalidraw';
import type { ExcalidrawData } from '@/types/excalidraw.types';

interface ExcalidrawEditorProps {
  /** 会话 ID */
  conversationId: string;
  
  /** 初始场景 ID (加载现有场景) */
  initialSceneId?: string;
  
  /** 主题 */
  theme?: 'light' | 'dark';
  
  /** 只读模式 */
  readOnly?: boolean;
  
  /** 自动保存间隔 (ms) */
  autoSaveInterval?: number;
  
  /** 保存时的回调 */
  onSave?: (sceneId: string, data: ExcalidrawData) => void;
  
  /** 加载完成回调 */
  onLoad?: (data: ExcalidrawData) => void;
  
  /** 变化回调 */
  onChange?: (data: ExcalidrawData) => void;
}

export function ExcalidrawEditor({
  conversationId,
  initialSceneId,
  theme = 'dark',
  readOnly = false,
  autoSaveInterval = 5000,
  onSave,
  onLoad,
  onChange,
}: ExcalidrawEditorProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    saveScene,
    loadScene,
    listScenes,
    deleteScene,
    currentSceneId,
    isSaving,
    lastSaved,
  } = useExcalidraw(conversationId);

  // 初始化加载
  useEffect(() => {
    if (initialSceneId && excalidrawAPI) {
      loadScene(initialSceneId)
        .then((data) => {
          if (data) {
            excalidrawAPI.setElements(data.elements);
            excalidrawAPI.setAppState(data.appState);
            onLoad?.(data);
          }
        })
        .catch((err) => {
          setError(`Failed to load scene: ${err.message}`);
        });
    }
  }, [initialSceneId, excalidrawAPI, loadScene, onLoad]);

  // 处理变化
  const handleChange = useCallback(
    (elements: any[], appState: any) => {
      onChange?.({ elements, appState } as unknown as ExcalidrawData);
    },
    [onChange]
  );

  // 处理手动保存
  const handleSave = useCallback(async () => {
    if (!excalidrawAPI) return;
    
    const elements = excalidrawAPI.getElements();
    const appState = excalidrawAPI.getAppState();
    
    try {
      const sceneId = await saveScene({
        elements: elements as any[],
        appState: appState as any,
      });
      onSave?.(sceneId, { elements, appState } as unknown as ExcalidrawData);
    } catch (err) {
      setError(`Failed to save: ${err.message}`);
    }
  }, [excalidrawAPI, saveScene, onSave]);

  // 处理键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // 渲染
  return (
    <div className="excalidraw-editor">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <Excalidraw
        excalidrawAPI={excalidrawAPI}
        onExcalidrawAPIChange={(api) => setExcalidrawAPI(api)}
        initialData={{
          elements: [],
          appState: {
            viewBackgroundColor: '#ffffff',
            gridSize: null,
            zoom: 1,
            scrollX: 0,
            scrollY: 0,
            activeTool: { type: 'selection' },
            theme,
          },
        }}
        onChange={handleChange}
        theme={theme}
        readOnly={readOnly}
        UIOptions={{
          canvasActions: {
            loadScene: !readOnly,
            export: {
              saveFileToDisk: true,
              exportToPng: true,
              exportToSvg: true,
            },
            toggleTheme: true,
          },
        }}
      />
      
      {/* 状态栏 */}
      <div className="status-bar">
        <span>Scene: {currentSceneId || 'Untitled'}</span>
        {isSaving && <span>Saving...</span>}
        {lastSaved && <span>Last saved: {lastSaved.toLocaleTimeString()}</span>}
      </div>
    </div>
  );
}
```

### 3. useExcalidraw Hook

```tsx
// src/hooks/useExcalidraw.ts

import { useState, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ExcalidrawData, ExcalidrawSceneInfo } from '@/types/excalidraw.types';

interface UseExcalidrawOptions {
  /** 自动保存启用 */
  autoSave?: boolean;
  /** 自动保存间隔 (ms) */
  autoSaveInterval?: number;
  /** 最大撤销步数 */
  maxUndoStack?: number;
}

interface UseExcalidrawReturn {
  // 状态
  currentSceneId: string | null;
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  undoStack: string[];
  redoStack: string[];
  
  // 方法
  saveScene: (data: ExcalidrawData) => Promise<string>;
  loadScene: (sceneId: string) => Promise<ExcalidrawData | null>;
  listScenes: (conversationId: string) => Promise<ExcalidrawSceneInfo[]>;
  deleteScene: (sceneId: string) => Promise<void>;
  exportScene: (sceneId: string, format: 'json' | 'png' | 'svg') => Promise<string>;
  importScene: (conversationId: string, jsonData: string) => Promise<string>;
  
  // 历史管理
  undo: () => void;
  redo: () => void;
  snapshot: () => void;
}

export function useExcalidraw(
  conversationId: string,
  options: UseExcalidrawOptions = {}
): UseExcalidrawReturn {
  const {
    autoSave = true,
    autoSaveInterval = 5000,
    maxUndoStack = 50,
  } = options;

  // 状态
  const [currentSceneId, setCurrentSceneId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Refs
  const pendingSaveRef = useRef<{
    data: ExcalidrawData;
    resolve: (id: string) => void;
    reject: (err: Error) => void;
  } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 保存场景
  const saveScene = useCallback(
    async (data: ExcalidrawData): Promise<string> => {
      setIsSaving(true);
      
      try {
        const elementsJson = JSON.stringify(data.elements);
        const appStateJson = JSON.stringify(data.appState);
        
        const sceneId = await invoke<string>('save_excalidraw_scene', {
          conversationId,
          elements: elementsJson,
          appState: appStateJson,
        });
        
        setCurrentSceneId(sceneId);
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        
        // 清空撤销栈（因为已经保存）
        setRedoStack([]);
        
        return sceneId;
      } catch (error) {
        throw new Error(`Failed to save scene: ${error}`);
      } finally {
        setIsSaving(false);
      }
    },
    [conversationId]
  );

  // 加载场景
  const loadScene = useCallback(
    async (sceneId: string): Promise<ExcalidrawData | null> => {
      setIsLoading(true);
      
      try {
        const result = await invoke<{
          id: string;
          conversationId: string;
          elements: any[];
          appState: any;
          createdAt: number;
          updatedAt: number;
        }>('load_excalidraw_scene', { sceneId });
        
        if (!result) {
          return null;
        }
        
        const data: ExcalidrawData = {
          elements: result.elements,
          appState: result.appState,
        };
        
        setCurrentSceneId(sceneId);
        return data;
      } catch (error) {
        throw new Error(`Failed to load scene: ${error}`);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 列出场景
  const listScenes = useCallback(
    async (convId: string): Promise<ExcalidrawSceneInfo[]> => {
      try {
        return await invoke<ExcalidrawSceneInfo[]>('list_excalidraw_scenes', {
          conversationId: convId,
        });
      } catch (error) {
        throw new Error(`Failed to list scenes: ${error}`);
      }
    },
    []
  );

  // 删除场景
  const deleteScene = useCallback(
    async (sceneId: string): Promise<void> => {
      try {
        await invoke<void>('delete_excalidraw_scene', { sceneId });
        if (currentSceneId === sceneId) {
          setCurrentSceneId(null);
        }
      } catch (error) {
        throw new Error(`Failed to delete scene: ${error}`);
      }
    },
    [currentSceneId]
  );

  // 导出场景
  const exportScene = useCallback(
    async (
      sceneId: string,
      format: 'json' | 'png' | 'svg'
    ): Promise<string> => {
      try {
        if (format === 'json') {
          return await invoke<string>('export_excalidraw_scene', { sceneId });
        }
        // PNG/SVG 导出需要额外实现
        throw new Error(`Export format "${format}" not yet implemented`);
      } catch (error) {
        throw new Error(`Failed to export scene: ${error}`);
      }
    },
    []
  );

  // 导入场景
  const importScene = useCallback(
    async (convId: string, jsonData: string): Promise<string> => {
      try {
        return await invoke<string>('import_excalidraw_scene', {
          conversationId: convId,
          jsonStr: jsonData,
        });
      } catch (error) {
        throw new Error(`Failed to import scene: ${error}`);
      }
    },
    []
  );

  // 撤销
  const undo = useCallback(() => {
    // 实现撤销逻辑
  }, [undoStack]);

  // 重做
  const redo = useCallback(() => {
    // 实现重做逻辑
  }, [redoStack]);

  // 快照
  const snapshot = useCallback(() => {
    // 实现快照逻辑
  }, []);

  return {
    currentSceneId,
    isSaving,
    isLoading,
    lastSaved,
    hasUnsavedChanges,
    undoStack,
    redoStack,
    saveScene,
    loadScene,
    listScenes,
    deleteScene,
    exportScene,
    importScene,
    undo,
    redo,
    snapshot,
  };
}
```

---

## 后端命令设计

### 1. 更新 excalidraw.rs

```rust
// src-tauri/src/commands/excalidraw.rs

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use crate::PixelState;

/// Excalidraw 场景数据结构 (兼容官方格式)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExcalidrawSceneData {
    pub elements: Value,
    pub app_state: Value,
}

/// 保存 Excalidraw 场景
#[tauri::command]
#[allow(dead_code)]
pub async fn save_excalidraw_scene(
    conversation_id: String,
    elements: String,      // JSON 序列化后的 elements 数组
    app_state: String,     // JSON 序列化后的 appState 对象
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    let app_handle = state.app_handle.get();
    
    // 解析并验证 JSON
    let elements: Value = serde_json::from_str(&elements)
        .map_err(|e| format!("Invalid elements JSON: {}", e))?;
    
    let app_state: Value = serde_json::from_str(&app_state)
        .map_err(|e| format!("Invalid appState JSON: {}", e))?;
    
    // 生成场景 ID
    let scene_id = format!("excalidraw_{}", uuid::Uuid::new_v4());
    
    // 构建完整的场景数据
    let scene_data = json!({
        "version": 2,
        "elements": elements,
        "appState": app_state,
        "gridSize": null,
        "language": "en",
    });
    
    // 保存到文件
    let path = get_scene_path(&app_handle, &scene_id)?;
    let json_str = serde_json::to_string_pretty(&scene_data)
        .map_err(|e| format!("Failed to serialize scene: {}", e))?;
    
    fs::write(&path, &json_str)
        .map_err(|e| format!("Failed to write scene file: {}", e))?;
    
    // 发射保存完成事件
    let _ = app_handle.emit("excalidraw:saved", &json!({
        "sceneId": scene_id,
        "conversationId": conversation_id,
    }));
    
    Ok(scene_id)
}

/// 加载 Excalidraw 场景
#[tauri::command]
#[allow(dead_code)]
pub async fn load_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<ExcalidrawSceneData, String> {
    let app_handle = state.app_handle.get();
    let path = get_scene_path(&app_handle, &scene_id)?;
    
    if !path.exists() {
        return Err(format!("Scene not found: {}", scene_id));
    }
    
    let json_str = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read scene file: {}", e))?;
    
    let scene: Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse scene: {}", e))?;
    
    // 提取 elements 和 appState
    let elements = scene.get("elements")
        .cloned()
        .unwrap_or(json!([]));
    
    let app_state = scene.get("appState")
        .cloned()
        .unwrap_or(json!({}));
    
    Ok(ExcalidrawSceneData { elements, app_state })
}

/// 列出对话的所有场景
#[tauri::command]
#[allow(dead_code)]
pub async fn list_excalidraw_scenes(
    conversation_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<Vec<serde_json::Value>, String> {
    let app_handle = state.app_handle.get();
    let scenes_dir = get_scenes_dir(&app_handle);
    
    if !scenes_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut scenes = Vec::new();
    
    for entry in fs::read_dir(&scenes_dir)
        .map_err(|e| format!("Failed to read scenes directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Ok(json_str) = fs::read_to_string(&path) {
                if let Ok(scene) = serde_json::from_str::<serde_json::Value>(&json_str) {
                    // 检查是否为当前对话的场景
                    let elements = scene.get("elements").and_then(|e| e.as_array());
                    if let Some(els) = elements {
                        // 查找是否有 conversationId 元数据或基于文件路径判断
                        // 这里简化处理，实际应该存储 conversationId
                        scenes.push(json!({
                            "id": path.file_stem()
                                .and_then(|n| n.to_str())
                                .map(|s| s.to_string()),
                            "conversationId": conversation_id,
                            "createdAt": entry.metadata()
                                .and_then(|m| m.created())
                                .ok()
                                .and_then(|t| t.elapsed().ok())
                                .map(|_| chrono::Utc::now().timestamp_millis()),
                            "updatedAt": entry.metadata()
                                .and_then(|m| m.modified())
                                .ok()
                                .and_then(|t| t.elapsed().ok())
                                .map(|_| chrono::Utc::now().timestamp_millis()),
                            "elementCount": els.len(),
                        }));
                    }
                }
            }
        }
    }
    
    // 按更新时间排序
    scenes.sort_by(|a, b| {
        let a_updated = a.get("updatedAt").and_then(|v| v.as_i64()).unwrap_or(0);
        let b_updated = b.get("updatedAt").and_then(|v| v.as_i64()).unwrap_or(0);
        b_updated.cmp(&a_updated)
    });
    
    Ok(scenes)
}

/// 删除 Excalidraw 场景
#[tauri::command]
#[allow(dead_code)]
pub async fn delete_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<(), String> {
    let app_handle = state.app_handle.get();
    let path = get_scene_path(&app_handle, &scene_id)?;
    
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to delete scene file: {}", e))?;
    }
    
    Ok(())
}

/// 导出场景 (JSON 格式)
#[tauri::command]
#[allow(dead_code)]
pub async fn export_excalidraw_scene(
    scene_id: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    let app_handle = state.app_handle.get();
    let path = get_scene_path(&app_handle, &scene_id)?;
    
    if !path.exists() {
        return Err(format!("Scene not found: {}", scene_id));
    }
    
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read scene: {}", e))
}

/// 导入场景 (从 JSON)
#[tauri::command]
#[allow(dead_code)]
pub async fn import_excalidraw_scene(
    conversation_id: String,
    json_str: String,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    let app_handle = state.app_handle.get();
    
    // 解析并验证
    let mut scene: Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Invalid scene JSON: {}", e))?;
    
    // 更新版本和语言
    scene["version"] = json!(2);
    scene["language"] = json!("en");
    
    // 生成新的场景 ID
    let scene_id = format!("excalidraw_{}", uuid::Uuid::new_v4());
    
    // 保存文件
    let path = get_scene_path(&app_handle, &scene_id)?;
    let json_str = serde_json::to_string_pretty(&scene)
        .map_err(|e| format!("Failed to serialize scene: {}", e))?;
    
    fs::write(&path, &json_str)
        .map_err(|e| format!("Failed to write scene: {}", e))?;
    
    Ok(scene_id)
}

/// 获取场景目录路径
fn get_scenes_dir(app: &tauri::AppHandle) -> PathBuf {
    let resource_dir = app.path().resource_dir().unwrap_or_else(|_| PathBuf::from("resources"));
    let scenes_dir = resource_dir.join("excalidraw_scenes");
    if !scenes_dir.exists() {
        let _ = fs::create_dir_all(&scenes_dir);
    }
    scenes_dir
}

/// 获取场景文件路径
fn get_scene_path(app: &tauri::AppHandle, scene_id: &str) -> Result<PathBuf, String> {
    let scenes_dir = get_scenes_dir(app);
    let path = scenes_dir.join(format!("{}.json", scene_id));
    Ok(path)
}
```

### 2. 在 lib.rs 中注册命令

```rust
// src-tauri/src/lib.rs

pub fn configure_app<R: tauri::Builder<R>>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            // Legacy commands
            get_config,
            update_config,
            send_notification,
            // Chat commands
            commands::create_chat_session,
            commands::add_message_to_session,
            commands::get_session_messages,
            commands::delete_chat_session,
            commands::get_active_sessions,
            commands::stream_chat_completions,
            commands::cancel_chat_stream,
            // Excalidraw commands
            commands::save_excalidraw_scene,
            commands::load_excalidraw_scene,
            commands::list_excalidraw_scenes,
            commands::delete_excalidraw_scene,
            commands::export_excalidraw_scene,
            commands::import_excalidraw_scene,
        ])
}
```

---

## IPC 通信模式

### 1. 命令调用模式

```typescript
// src/services/excalidrawService.ts

import { invoke } from '@tauri-apps/api/core';

/**
 * Excalidraw 服务 - 封装 Tauri IPC 调用
 */
export const excalidrawService = {
  /**
   * 保存场景
   */
  async save(
    conversationId: string,
    elements: any[],
    appState: any
  ): Promise<string> {
    return await invoke('save_excalidraw_scene', {
      conversationId,
      elements: JSON.stringify(elements),
      appState: JSON.stringify(appState),
    });
  },

  /**
   * 加载场景
   */
  async load(sceneId: string): Promise<{
    elements: any[];
    appState: any;
  }> {
    return await invoke('load_excalidraw_scene', { sceneId });
  },

  /**
   * 列出场景
   */
  async list(conversationId: string): Promise<Array<{
    id: string;
    conversationId: string;
    createdAt: number;
    updatedAt: number;
    elementCount: number;
  }>> {
    return await invoke('list_excalidraw_scenes', { conversationId });
  },

  /**
   * 删除场景
   */
  async delete(sceneId: string): Promise<void> {
    return await invoke('delete_excalidraw_scene', { sceneId });
  },

  /**
   * 导出场景
   */
  async export(sceneId: string): Promise<string> {
    return await invoke('export_excalidraw_scene', { sceneId });
  },

  /**
   * 导入场景
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
};
```

### 2. 事件系统

```typescript
// src/services/excalidrawEvents.ts

import { listen } from '@tauri-apps/api/event';

/**
 * 监听 Excalidraw 相关事件
 */
export async function setupExcalidrawEventListeners() {
  // 保存完成事件
  const savedListener = await listen<{
    sceneId: string;
    conversationId: string;
  }>('excalidraw:saved', (event) => {
    console.log('Scene saved:', event.payload.sceneId);
    // 更新 UI 状态等
  });

  // 加载完成事件
  const loadedListener = await listen<{
    sceneId: string;
  }>('excalidraw:loaded', (event) => {
    console.log('Scene loaded:', event.payload.sceneId);
    // 更新 UI 状态等
  });

  // 错误事件
  const errorListener = await listen<{
    sceneId: string;
    error: string;
  }>('excalidraw:error', (event) => {
    console.error('Excalidraw error:', event.payload.error);
    // 显示错误提示
  });

  // 返回清理函数
  return () => {
    savedListener();
    loadedListener();
    errorListener();
  };
}
```

---

## 性能优化

### 1. 防抖保存

```typescript
// src/hooks/useAutoSave.ts

import { useCallback, useRef, useEffect } from 'react';
import { useExcalidraw } from './useExcalidraw';
import type { ExcalidrawData } from '@/types/excalidraw.types';

interface UseAutoSaveOptions {
  interval: number;
  enabled: boolean;
}

export function useAutoSave(
  data: ExcalidrawData | null,
  options: UseAutoSaveOptions
) {
  const { interval, enabled } = options;
  const { saveScene } = useExcalidraw('');
  
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<ExcalidrawData | null>(null);

  // 防抖保存
  const triggerAutoSave = useCallback(
    (dataToSave: ExcalidrawData) => {
      pendingDataRef.current = dataToSave;
      
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      
      saveTimerRef.current = setTimeout(async () => {
        if (pendingDataRef.current) {
          try {
            await saveScene(pendingDataRef.current);
            pendingDataRef.current = null;
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }
      }, interval);
    },
    [saveScene, interval]
  );

  // 当数据变化时触发自动保存
  useEffect(() => {
    if (enabled && data) {
      triggerAutoSave(data);
    }
  }, [data, enabled, triggerAutoSave]);

  // 清理
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  return {
    isAutoSaving: !!pendingDataRef.current,
    lastAutoSaveTime: new Date(),
  };
}
```

### 2. 大文件处理

```rust
// Rust 端大文件处理示例
use std::fs::{File, OpenOptions};
use std::io::{Write, Read};

/// 分块读取大场景文件
#[tauri::command]
pub async fn load_large_scene(
    scene_id: String,
    chunk_size: usize,
    chunk_index: usize,
    state: tauri::State<'_, PixelState>,
) -> Result<String, String> {
    let app_handle = state.app_handle.get();
    let path = get_scene_path(&app_handle, &scene_id)?;
    
    let mut file = File::open(&path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    
    let mut content = String::new();
    let start = chunk_index * chunk_size;
    let _ = file.seek(std::io::SeekFrom::Start(start as u64))
        .map_err(|e| format!("Failed to seek: {}", e))?;
    
    let mut buffer = vec![0u8; chunk_size];
    let bytes_read = file.read(&mut buffer)
        .map_err(|e| format!("Failed to read: {}", e))?;
    
    content.push_str(&String::from_utf8_lossy(&buffer[..bytes_read]));
    
    Ok(content)
}
```

---

## 边缘情况处理

### 1. 文件格式验证

```typescript
// src/utils/excalidrawValidation.ts

import type { ExcalidrawData } from '@/types/excalidraw.types';

/**
 * 验证 Excalidraw JSON 数据
 */
export function validateExcalidrawData(json: unknown): json is ExcalidrawData {
  if (!json || typeof json !== 'object') {
    return false;
  }
  
  const data = json as Record<string, unknown>;
  
  // 检查 version 字段
  if (typeof data.version !== 'number') {
    return false;
  }
  
  // 检查 elements 字段
  if (!Array.isArray(data.elements)) {
    return false;
  }
  
  // 检查 appState 字段
  if (data.appState && typeof data.appState !== 'object') {
    return false;
  }
  
  // 可选：检查元素结构
  for (const element of data.elements as unknown[]) {
    if (!element || typeof element !== 'object') {
      return false;
    }
    const el = element as Record<string, unknown>;
    if (typeof el.id !== 'string') return false;
    if (typeof el.type !== 'string') return false;
    if (typeof el.x !== 'number') return false;
    if (typeof el.y !== 'number') return false;
  }
  
  return true;
}

/**
 * 版本迁移 (示例)
 */
export function migrateToCurrentVersion(data: Record<string, unknown>): ExcalidrawData {
  const version = (data.version as number) || 1;
  
  // V1 -> V2 迁移示例
  if (version < 2) {
    // 迁移逻辑
    data.version = 2;
    
    // 更新元素格式
    if (Array.isArray(data.elements)) {
      data.elements = (data.elements as any[]).map((el: any) => ({
        ...el,
        versionNonce: el.versionNonce || Math.floor(Math.random() * 1000000),
      }));
    }
  }
  
  return data as ExcalidrawData;
}
```

### 2. 错误恢复

```typescript
// src/utils/autoSaveRecovery.ts

import { excalidrawService } from '@/services/excalidrawService';

/**
 * 自动恢复未保存的绘图
 */
export async function recoverUnsavedDrawings(
  conversationId: string
): Promise<{ recovered: boolean; sceneId: string | null; error?: string }> {
  try {
    // 列出所有场景
    const scenes = await excalidrawService.list(conversationId);
    
    // 查找最近的未完成场景 (可以通过命名约定或元数据识别)
    const recentScene = scenes
      .filter((s) => s.id.startsWith('unsaved_'))
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    
    if (recentScene) {
      return { recovered: true, sceneId: recentScene.id };
    }
    
    return { recovered: false, sceneId: null };
  } catch (error) {
    return {
      recovered: false,
      sceneId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 创建自动保存的草稿
 */
export async function createAutoSaveDraft(
  conversationId: string,
  elements: any[],
  appState: any
): Promise<string> {
  const sceneId = `unsaved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await excalidrawService.save(conversationId, elements, appState);
  
  return sceneId;
}
```

### 3. 跨平台注意事项

```typescript
// src/utils/platform.ts

import { appDir, join } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/api/fs';

/**
 * 获取跨平台资源路径
 */
export async function getExcalidrawAssetsPath(): Promise<string> {
  const appDirPath = await appDir();
  
  // 检查不同平台的资源路径
  const possiblePaths = [
    await join(appDirPath, 'excalidraw-assets'),
    await join(appDirPath, 'assets', 'excalidraw'),
    await join(appDirPath, 'resources', 'excalidraw-assets'),
  ];
  
  for (const path of possiblePaths) {
    if (await exists(path)) {
      return path;
    }
  }
  
  // 返回默认路径
  return appDirPath;
}

/**
 * 设置 Excalidraw 资源路径
 */
export function setExcalidrawAssetPath(path: string): void {
  if (typeof window !== 'undefined') {
    (window as any).EXCALIDRAW_ASSET_PATH = path;
  }
}
```

---

## 实施计划

### Phase 1: 依赖安装和数据模型 (1-2 小时)

| 任务 | 预估时间 | 依赖 |
|------|----------|------|
| 安装 @excalidraw/excalidraw | 10 min | - |
| 创建 excalidraw.types.ts | 20 min | - |
| 更新 excalidraw.rs 数据模型 | 30 min | state.rs |
| 编译验证 | 10 min | 前置任务 |

### Phase 2: 前端组件 (2-3 小时)

| 任务 | 预估时间 | 依赖 |
|------|----------|------|
| 创建 ExcalidrawEditor 组件 | 60 min | @excalidraw/excalidraw |
| 创建 useExcalidraw hook | 45 min | - |
| 创建 excalidrawService | 20 min | - |
| 替换现有 ExcalidrawViewer | 30 min | Phase 1 |
| 集成测试 | 15 min | 前置任务 |

### Phase 3: 高级功能 (2-3 小时)

| 任务 | 预估时间 | 依赖 |
|------|----------|------|
| 实现自动保存 | 30 min | Phase 2 |
| 实现撤销/重做 | 45 min | Phase 2 |
| 实现导出 PNG/SVG | 60 min | Rust 图像库 |
| 错误处理和恢复 | 30 min | - |

### Phase 4: 测试和优化 (1-2 小时)

| 任务 | 预估时间 | 依赖 |
|------|----------|------|
| 单元测试 | 30 min | Phase 1-3 |
| 性能测试 | 30 min | Phase 1-3 |
| 文档更新 | 30 min | - |

---

## 总结

### 推荐行动

1. **立即行动**：
   - 安装 `@excalidraw/excalidraw` 包
   - 创建类型定义文件
   - 更新后端命令以兼容官方 JSON 格式

2. **短期目标** (本周)：
   - 替换现有 ExcalidrawViewer 为官方组件
   - 实现基础 CRUD 操作
   - 添加自动保存功能

3. **中期目标** (下两周)：
   - 实现完整导出功能
   - 添加撤销/重做历史
   - 性能优化

4. **长期目标** (下月)：
   - 协作编辑功能
   - 云同步
   - 插件系统

### 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| @excalidraw/excalidraw API 变化 | 高 | 低 | 订阅版本更新，使用稳定版本 |
| 大文件性能问题 | 中 | 中 | 实现分块加载和虚拟化 |
| 跨平台兼容性问题 | 中 | 低 | 全面测试所有平台 |
| 数据迁移复杂性 | 高 | 中 | 实现版本迁移工具 |

### 资源链接

- **官方文档**: https://docs.excalidraw.com/docs/@excalidraw/excalidraw
- **GitHub**: https://github.com/excalidraw/excalidraw
- **Tauri v2 IPC**: https://v2.tauri.app/concept/inter-process-communication/
- **示例项目**: https://github.com/excalidraw/excalidraw/tree/master/packages/excalidraw

---

> **文档版本**: v1.0  
> **下次更新**: 实现 Phase 1 完成后
> **负责人**: AI Assistant (Claude)
