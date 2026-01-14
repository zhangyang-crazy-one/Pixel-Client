// Tauri IPC API service layer
// Provides type-safe communication with the Tauri Rust backend

import { invoke } from '@tauri-apps/api/core';
import type {
  AppConfig,
  ChatMessage,
  StreamingChunk,
  HighlightResult,
  ExcalidrawScene,
  ExcalidrawElement,
} from '../types';

/**
 * Tauri API client for backend communication
 */
export const tauriApi = {
  /**
   * Get current application configuration
   */
  async getConfig(): Promise<AppConfig> {
    return invoke('get_config');
  },

  /**
   * Update application configuration
   */
  async updateConfig(config: AppConfig): Promise<void> {
    return invoke('update_config', { config });
  },

  /**
   * Get all chat messages
   */
  async getMessages(): Promise<ChatMessage[]> {
    return invoke('get_messages');
  },

  /**
   * Add a new chat message
   */
  async addMessage(message: ChatMessage): Promise<void> {
    return invoke('add_message', { message });
  },

  /**
   * Clear all messages
   */
  async clearMessages(): Promise<void> {
    return invoke('clear_messages');
  },

  /**
   * Send a desktop notification
   */
  async sendNotification(title: string, body: string): Promise<void> {
    return invoke('send_notification', { title, body });
  },

  /**
   * Highlight code syntax (placeholder - frontend uses highlight.js)
   */
  async highlightCode(code: string, language: string): Promise<HighlightResult> {
    return invoke('highlight_code', { code, language });
  },

  /**
   * Render markdown to HTML (placeholder - frontend uses react-markdown)
   */
  async renderMarkdown(content: string): Promise<string> {
    return invoke('render_markdown', { content });
  },

  /**
   * Create an Excalidraw scene
   */
  async createExcalidrawScene(elements: ExcalidrawElement[]): Promise<ExcalidrawScene> {
    return invoke('create_excalidraw_scene', { elements });
  },

  /**
   * Export scene to image (placeholder - frontend uses html-to-image)
   */
  async exportScene(scene: ExcalidrawScene, format: string): Promise<string> {
    return invoke('export_scene', { scene, format });
  },
};

export type { AppConfig, ChatMessage, StreamingChunk, HighlightResult, ExcalidrawScene, ExcalidrawElement };
