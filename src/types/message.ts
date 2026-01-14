/**
 * Chat message structure for LLM conversations
 */
export interface ChatMessage {
  role: string;
  content: string;
  timestamp: number;
}
