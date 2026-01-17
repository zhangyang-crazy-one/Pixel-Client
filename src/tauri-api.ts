/**
 * Tauri API Wrapper
 * Provides type-safe invoke calls to Rust backend commands
 */

import { invoke } from '@tauri-apps/api/core';
import type { ChatSession, Message } from './types';

// ============================================
// Chat Commands
// ============================================

/**
 * Create a new chat session
 * @param title - Optional session title (defaults to timestamp-based name)
 * @returns Session ID of the created session
 */
export async function createChatSession(title?: string): Promise<string> {
  return invoke('create_chat_session', { title });
}

/**
 * Add a message to a session
 * @param sessionId - The session to add the message to
 * @param role - Message role ('user' | 'assistant' | 'system')
 * @param content - Message content
 * @returns The created message
 */
export async function addMessageToSession(
  sessionId: string,
  role: string,
  content: string
): Promise<Message> {
  return invoke('add_message_to_session', { sessionId, role, content });
}

/**
 * Get all messages from a session
 * @param sessionId - The session to get messages from
 * @returns Array of messages
 */
export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  return invoke('get_session_messages', { sessionId });
}

/**
 * Delete a chat session
 * @param sessionId - The session to delete
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  return invoke('delete_chat_session', { sessionId });
}

/**
 * Get all active sessions
 * @param limit - Maximum number of sessions to return (0 for all)
 * @returns Array of chat sessions sorted by updated_at desc
 */
export async function getActiveSessions(limit: number = 0): Promise<ChatSession[]> {
  return invoke('get_active_sessions', { limit });
}

// ============================================
// Renderer Commands
// ============================================

/**
 * Render Markdown to HTML
 * @param content - Markdown content
 * @returns Rendered HTML string
 */
export async function renderMarkdown(content: string): Promise<string> {
  return invoke('render_markdown', { content });
}

/**
 * Highlight code syntax
 * @param code - Code content
 * @param language - Programming language
 * @returns HTML string with syntax highlighting
 */
export async function highlightCode(code: string, language: string): Promise<string> {
  return invoke('highlight_code', { code, language });
}

// ============================================
// Persistence Commands
// ============================================

/**
 * Save current state to disk
 */
export async function saveState(): Promise<void> {
  return invoke('save_state');
}

/**
 * Load state from disk
 */
export async function loadState(): Promise<void> {
  return invoke('load_state');
}

/**
 * Get current state size in bytes
 * @returns Size of the state file
 */
export async function getStateSize(): Promise<number> {
  return invoke('get_state_size');
}

/**
 * Export state as JSON string
 * @returns JSON string representation of state
 */
export async function exportStateJson(): Promise<string> {
  return invoke('export_state_json');
}

/**
 * Import state from JSON string
 * @param json - JSON string to import
 */
export async function importStateJson(json: string): Promise<void> {
  return invoke('import_state_json', { json });
}

/**
 * Clear all state data
 */
export async function clearState(): Promise<void> {
  return invoke('clear_state');
}

/**
 * Create a backup of current state
 * @returns Backup file path
 */
export async function createBackup(): Promise<string> {
  return invoke('create_backup');
}
