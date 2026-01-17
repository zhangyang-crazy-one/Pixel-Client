import type { ExcalidrawElement } from './excalidraw_element';

/**
 * Complete Excalidraw scene with elements
 */
export interface ExcalidrawScene {
  elements: ExcalidrawElement[];
  app_state: string;
}

export type { HighlightResult } from './highlight_result';
export type { StreamingChunk } from './streaming_chunk';
