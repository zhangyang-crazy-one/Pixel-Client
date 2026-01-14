/**
 * Streaming response chunk from LLM
 */
export interface StreamingChunk {
  chunk: string;
  delta: string;
  is_complete: boolean;
}
