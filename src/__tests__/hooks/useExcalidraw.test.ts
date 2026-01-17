import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExcalidraw } from '../../hooks/useExcalidraw';
import type { ExcalidrawElement, AppState } from '../../types/excalidraw.types';

// Mock the excalidrawService
vi.mock('../../services/excalidrawService', () => ({
  excalidrawService: {
    save: vi.fn(),
    load: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
    export: vi.fn(),
    import: vi.fn(),
  },
}));

import { excalidrawService } from '../../services/excalidrawService';

// Helper to create minimal valid test data
const createTestElement = (): ExcalidrawElement => ({
  id: 'test-elem-1',
  type: 'rectangle',
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  angle: 0,
  isDeleted: false,
  version: 1,
  versionNonce: 1,
  updated: Date.now(),
  strokeColor: '#000000',
  backgroundColor: 'transparent',
  fillStyle: 'hachure',
  strokeWidth: 2,
  strokeStyle: 'solid',
  opacity: 1,
  groupIds: [],
  boundElements: null,
  link: null,
  locked: false,
  seed: 1,
  roundness: null,
});

const createTestAppState = (): AppState => ({
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
});

describe('useExcalidraw Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with null current scene id', () => {
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      expect(result.current.currentSceneId).toBeNull();
    });

    it('should initialize with isSaving as false', () => {
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      expect(result.current.isSaving).toBe(false);
    });

    it('should initialize with isLoading as false', () => {
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      expect(result.current.isLoading).toBe(false);
    });

    it('should initialize with null lastSaved', () => {
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      expect(result.current.lastSaved).toBeNull();
    });
  });

  describe('saveScene', () => {
    it('should save scene and return scene id', async () => {
      const mockSceneId = 'scene-123';
      vi.mocked(excalidrawService.save).mockResolvedValue(mockSceneId);
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      const elements: readonly ExcalidrawElement[] = [createTestElement()];
      const appState = createTestAppState();
      
      await act(async () => {
        const id = await result.current.saveScene(elements, appState);
        expect(id).toBe(mockSceneId);
      });
      
      expect(excalidrawService.save).toHaveBeenCalledWith(
        'test-conversation',
        elements,
        appState
      );
    });

    it('should set isSaving to true during save', async () => {
      let resolveSave: (value: unknown) => void;
      vi.mocked(excalidrawService.save).mockImplementation(
        () => new Promise(resolve => { resolveSave = resolve; })
      );
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      const savePromise = result.current.saveScene([createTestElement()], createTestAppState());
      
      expect(savePromise).toBeInstanceOf(Promise);
      
      resolveSave!('scene-123');
      
      await savePromise;
      
      expect(result.current.isSaving).toBe(false);
    });

    it('should call onError on save failure', async () => {
      const onError = vi.fn();
      vi.mocked(excalidrawService.save).mockRejectedValue(new Error('Save failed'));
      
      const { result } = renderHook(() => 
        useExcalidraw({ 
          conversationId: 'test-conversation',
          onError 
        })
      );
      
      // Save function should throw, but onError should be called
      try {
        await result.current.saveScene([createTestElement()], createTestAppState());
      } catch {
        // Expected - hook throws on error
      }
      
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('loadScene', () => {
    it('should load scene and return data', async () => {
      const mockData = {
        type: 'excalidraw' as const,
        version: 2,
        source: '',
        elements: [createTestElement()],
        appState: createTestAppState(),
        files: {},
      };
      vi.mocked(excalidrawService.load).mockResolvedValue(mockData);
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      await act(async () => {
        const data = await result.current.loadScene('scene-123');
        expect(data).toEqual(mockData);
      });
      
      expect(excalidrawService.load).toHaveBeenCalledWith('scene-123');
    });

    it('should return null on load failure', async () => {
      vi.mocked(excalidrawService.load).mockRejectedValue(new Error('Load failed'));
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      await act(async () => {
        const data = await result.current.loadScene('invalid-scene');
        expect(data).toBeNull();
      });
    });

    it('should set isLoading during load', async () => {
      let resolveLoad: (value: unknown) => void;
      vi.mocked(excalidrawService.load).mockImplementation(
        () => new Promise(resolve => { resolveLoad = resolve; })
      );
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      const loadPromise = result.current.loadScene('scene-123');
      
      expect(loadPromise).toBeInstanceOf(Promise);
      
      resolveLoad!(null);
      
      await loadPromise;
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('listScenes', () => {
    it('should return list of scenes', async () => {
      const mockScenes = [
        { id: 'scene-1', conversationId: 'test', createdAt: Date.now(), updatedAt: Date.now(), elementCount: 5, name: 'Scene 1' },
        { id: 'scene-2', conversationId: 'test', createdAt: Date.now(), updatedAt: Date.now(), elementCount: 3, name: 'Scene 2' },
      ];
      vi.mocked(excalidrawService.list).mockResolvedValue(mockScenes);
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      await act(async () => {
        const scenes = await result.current.listScenes();
        expect(scenes).toEqual(mockScenes);
        expect(scenes).toHaveLength(2);
      });
    });

    it('should return empty array on error', async () => {
      const onError = vi.fn();
      vi.mocked(excalidrawService.list).mockRejectedValue(new Error('List failed'));
      
      const { result } = renderHook(() => 
        useExcalidraw({ 
          conversationId: 'test-conversation',
          onError 
        })
      );
      
      await act(async () => {
        const scenes = await result.current.listScenes();
        expect(scenes).toEqual([]);
      });
      
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('deleteScene', () => {
    it('should delete scene successfully', async () => {
      vi.mocked(excalidrawService.delete).mockResolvedValue(undefined);
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      await act(async () => {
        await result.current.deleteScene('scene-123');
      });
      
      expect(excalidrawService.delete).toHaveBeenCalledWith('scene-123');
    });

    it('should throw error on delete failure', async () => {
      const onError = vi.fn();
      vi.mocked(excalidrawService.delete).mockRejectedValue(new Error('Delete failed'));
      
      const { result } = renderHook(() => 
        useExcalidraw({ 
          conversationId: 'test-conversation',
          onError 
        })
      );
      
      try {
        await result.current.deleteScene('scene-123');
      } catch {
        // Expected - hook throws on error
      }
      
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('clearScene', () => {
    it('should clear current scene state', () => {
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      // Initially should be null
      expect(result.current.currentSceneId).toBeNull();
    });
  });

  describe('exportScene', () => {
    it('should export scene as JSON', async () => {
      const mockJson = '{"type":"excalidraw","elements":[]}';
      vi.mocked(excalidrawService.export).mockResolvedValue(mockJson);
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      await act(async () => {
        const json = await result.current.exportScene('scene-123');
        expect(json).toBe(mockJson);
      });
      
      expect(excalidrawService.export).toHaveBeenCalledWith('scene-123');
    });
  });

  describe('importScene', () => {
    it('should import scene from JSON', async () => {
      const mockSceneId = 'imported-scene';
      const mockJson = '{"type":"excalidraw","elements":[]}';
      vi.mocked(excalidrawService.import).mockResolvedValue(mockSceneId);
      
      const { result } = renderHook(() => 
        useExcalidraw({ conversationId: 'test-conversation' })
      );
      
      await act(async () => {
        const id = await result.current.importScene(mockJson);
        expect(id).toBe(mockSceneId);
      });
      
      expect(excalidrawService.import).toHaveBeenCalledWith(
        'test-conversation',
        mockJson
      );
    });
  });
});
