/**
 * ExcalidrawViewer - Component for viewing and editing Excalidraw diagrams
 */

import { useState, useCallback, useRef, useEffect, type MouseEvent } from 'react';

interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  strokeColor?: string;
  backgroundColor?: string;
}

interface ExcalidrawScene {
  elements: ExcalidrawElement[];
  appState: string;
}

interface ExcalidrawViewerProps {
  scene?: ExcalidrawScene;
  onSceneChange?: (scene: ExcalidrawScene) => void;
  readOnly?: boolean;
  width?: number;
  height?: number;
}

export function ExcalidrawViewer({
  scene,
  onSceneChange,
  readOnly = false,
  width = 800,
  height = 600,
}: ExcalidrawViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elements, setElements] = useState<ExcalidrawElement[]>(scene?.elements ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'select' | 'rectangle' | 'ellipse' | 'arrow' | 'text'>('select');

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw elements
    elements.forEach((element) => {
      ctx.strokeStyle = element.strokeColor ?? '#000000';
      ctx.fillStyle = element.backgroundColor ?? 'transparent';
      ctx.lineWidth = 2;

      if (element.type === 'rectangle') {
        ctx.fillRect(element.x, element.y, element.width, element.height);
        ctx.strokeRect(element.x, element.y, element.width, element.height);
      } else if (element.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(
          element.x + element.width / 2,
          element.y + element.height / 2,
          element.width / 2,
          element.height / 2,
          0,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
      } else if (element.type === 'arrow') {
        // Draw line
        ctx.beginPath();
        ctx.moveTo(element.x, element.y);
        ctx.lineTo(element.x + element.width, element.y + element.height);
        ctx.stroke();
      } else if (element.type === 'text' && element.text) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = element.strokeColor ?? '#000000';
        ctx.fillText(element.text, element.x, element.y + 14);
      }

      // Draw selection indicator
      if (element.id === selectedId) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(element.x - 4, element.y - 4, element.width + 8, element.height + 8);
        ctx.setLineDash([]);
      }
    });

    // Draw tool indicator
    if (currentTool !== 'select' && isDrawing) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(0, 0, width, height);
      ctx.setLineDash([]);
    }
  }, [elements, width, height, selectedId, currentTool, isDrawing]);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (readOnly) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (currentTool === 'select') {
        // Find clicked element
        const clicked = elements.find(
          (el) => x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height
        );
        setSelectedId(clicked?.id ?? null);
      } else if (currentTool === 'rectangle') {
        const newElement: ExcalidrawElement = {
          id: `element_${Date.now()}`,
          type: 'rectangle',
          x,
          y,
          width: 100,
          height: 60,
          strokeColor: '#000000',
          backgroundColor: 'transparent',
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        onSceneChange?.({ elements: newElements, appState: scene?.appState ?? '{}' });
      } else if (currentTool === 'ellipse') {
        const newElement: ExcalidrawElement = {
          id: `element_${Date.now()}`,
          type: 'ellipse',
          x,
          y,
          width: 80,
          height: 50,
          strokeColor: '#000000',
          backgroundColor: 'transparent',
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        onSceneChange?.({ elements: newElements, appState: scene?.appState ?? '{}' });
      } else if (currentTool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          const newElement: ExcalidrawElement = {
            id: `element_${Date.now()}`,
            type: 'text',
            x,
            y,
            width: 100,
            height: 20,
            text,
            strokeColor: '#000000',
          };
          const newElements = [...elements, newElement];
          setElements(newElements);
          onSceneChange?.({ elements: newElements, appState: scene?.appState ?? '{}' });
        }
      }
    },
    [elements, currentTool, readOnly, scene?.appState, onSceneChange]
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!selectedId || readOnly) return;
    const newElements = elements.filter((el) => el.id !== selectedId);
    setElements(newElements);
    setSelectedId(null);
    onSceneChange?.({ elements: newElements, appState: scene?.appState ?? '{}' });
  }, [selectedId, elements, readOnly, scene?.appState, onSceneChange]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDelete]);

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-2 p-2 border rounded bg-gray-50 dark:bg-gray-800">
          <button
            onClick={() => setCurrentTool('select')}
            className={`p-2 rounded ${currentTool === 'select' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            title="Select"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentTool('rectangle')}
            className={`p-2 rounded ${currentTool === 'rectangle' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            title="Rectangle"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentTool('ellipse')}
            className={`p-2 rounded ${currentTool === 'ellipse' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            title="Ellipse"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setCurrentTool('text')}
            className={`p-2 rounded ${currentTool === 'text' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            title="Text"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <div className="flex-1" />
          {selectedId && (
            <button
              onClick={handleDelete}
              className="p-2 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
              title="Delete selected"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="border rounded shadow-sm cursor-crosshair"
        style={{ maxWidth: '100%', height: 'auto' }}
      />

      {/* Info */}
      <div className="text-sm text-gray-500 flex items-center gap-4">
        <span>{elements.length} elements</span>
        {selectedId && <span className="text-blue-500">Selected: {selectedId}</span>}
        <span className="ml-auto">Tool: {currentTool}</span>
      </div>
    </div>
  );
}
