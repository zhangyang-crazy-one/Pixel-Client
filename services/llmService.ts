/**
 * LLM Service
 * Handles LLM API interactions for chat and mascot responses
 */

import { apiClient } from './apiClient';
import type { Message, LLMModel, LLMProvider } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface MascotResponse {
  comment: string;
  mood: 'happy' | 'neutral' | 'thinking' | 'surprised';
}

// ============================================================================
// Stream Chat Response
// ============================================================================

/**
 * Stream chat response from LLM with full options
 */
export async function streamChatResponse(
  messages: Message[],
  activeModel: LLMModel,
  activeProvider: LLMProvider,
  onChunk: (chunk: string) => void,
  onRequestId: (requestId: string) => void,
  activeSessionId: string,
  signal: AbortSignal,
  deepThinkingEnabled?: boolean
): Promise<void> {
  try {
    await apiClient.streamChatCompletions(
      messages,
      activeModel.id,
      (chunk) => {
        if (chunk.done) {
          onChunk(chunk.data);
        } else {
          onChunk(chunk.data);
        }
      },
      (error) => {
        console.error('Chat stream error:', error);
        throw error;
      }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Chat stream aborted');
    } else {
      throw error;
    }
  }
}

// ============================================================================
// Fetch Mascot Comment
// ============================================================================

/**
 * Get mascot comment based on messages and model context
 */
export async function fetchMascotComment(
  messages: Message[],
  modelId: string,
  systemPrompt: string
): Promise<string | null> {
  try {
    // Generate contextual comments based on the conversation
    const lastMessage = messages[messages.length - 1];
    const messageCount = messages.length;
    
    if (!lastMessage) {
      return "Hello! I'm your AI assistant. How can I help you today?";
    }

    // Simple contextual responses based on message patterns
    const userContent = lastMessage.content.toLowerCase();
    
    if (messageCount === 1) {
      return "I see you've started a new conversation! What would you like to explore?";
    }
    
    if (userContent.includes('hello') || userContent.includes('hi')) {
      return "Hello! Great to see you! What shall we work on together?";
    }
    
    if (userContent.includes('code') || userContent.includes('programming')) {
      return "I love coding challenges! Let's build something amazing together!";
    }
    
    if (userContent.includes('help') || userContent.includes('?')) {
      return "I'm here to help! Feel free to ask me anything, and I'll do my best to assist you.";
    }

    // Default contextual response
    const responses = [
      "Interesting! Tell me more about that.",
      "I see what you mean. Would you like me to elaborate?",
      "That's a great point! What's next?",
      "I'm following along. What would you like to explore further?",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  } catch (error) {
    console.error('Failed to fetch mascot comment:', error);
    return null;
  }
}

// ============================================================================
// Send Prompt (Non-streaming)
// ============================================================================

/**
 * Send a simple prompt and get a response (non-streaming)
 */
export async function sendPrompt(
  prompt: string,
  systemPrompt: string,
  modelId: string
): Promise<string> {
  const messages: Message[] = [
    { id: 'system', role: 'system', content: systemPrompt, timestamp: Date.now(), modelId: undefined, attachments: [], images: [] },
    { id: 'user', role: 'user', content: prompt, timestamp: Date.now(), modelId: undefined, attachments: [], images: [] },
  ];

  let fullResponse = '';
  
  await new Promise<void>((resolve, reject) => {
    apiClient.streamChatCompletions(
      messages,
      modelId,
      (chunk) => {
        if (chunk.done) {
          resolve();
        } else {
          fullResponse += chunk.data;
        }
      },
      (error) => {
        reject(error);
      }
    );
  });

  return fullResponse;
}

// ============================================================================
// Message Formatting Utilities
// ============================================================================

/**
 * Format messages for API call
 */
export function formatMessagesForAPI(messages: Message[]): Array<{
  role: string;
  content: string;
}> {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Count tokens in a message (approximation)
 */
export function countTokens(text: string): number {
  // Rough approximation: 4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Truncate messages to fit context window
 */
export function truncateMessages(
  messages: Message[],
  maxTokens: number,
  systemPrompt?: string
): Message[] {
  const systemTokens = systemPrompt ? countTokens(systemPrompt) : 0;
  const availableTokens = maxTokens - systemTokens - 100; // Reserve 100 tokens for response
  
  const result: Message[] = [];
  let currentTokens = 0;

  // Process messages from most recent to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = countTokens(msg.content);
    
    if (currentTokens + msgTokens <= availableTokens) {
      result.unshift(msg);
      currentTokens += msgTokens;
    } else if (msg.role === 'user') {
      // Keep user messages but truncate content
      const remainingTokens = availableTokens - currentTokens;
      const truncatedContent = msg.content.slice(0, remainingTokens * 4);
      result.unshift({
        ...msg,
        content: truncatedContent,
      });
      break;
    }
  }

  return result;
}
