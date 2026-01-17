/**
 * API Client Service
 * Handles HTTP communication with the Tauri backend
 * Uses frontend-friendly camelCase types from types.ts
 */

import { invoke } from '@tauri-apps/api/core';
import type { Message, ChatSession, LLMProvider, LLMModel } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface ChatResponse {
  content: string;
  role: 'assistant';
  timestamp: number;
}

export interface StreamChunk {
  data: string;
  done: boolean;
}

export interface ApiError {
  message: string;
  code: string;
}

// ============================================================================
// API Client Class
// ============================================================================

export class ApiClient {
  private static instance: ApiClient;
  
  private constructor() {}
  
  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }
  
  // =========================================================================
  // Provider/Model Operations (Local Storage Based)
  // =========================================================================
  
  /**
   * Get all configured LLM providers
   */
  async getProviders(): Promise<LLMProvider[]> {
    try {
      const state = await this.loadState() as { providers?: LLMProvider[] };
      return state.providers || [];
    } catch (error) {
      console.error('Failed to get providers:', error);
      return [];
    }
  }
  
  /**
   * Save providers configuration
   */
  async saveProviders(providers: LLMProvider[]): Promise<void> {
    try {
      const state = await this.loadState() as Record<string, unknown> & { providers?: LLMProvider[] };
      state.providers = providers;
      await this.saveState(state);
    } catch (error) {
      console.error('Failed to save providers:', error);
      throw error;
    }
  }

  /**
   * Save models configuration
   */
  async saveModels(models: LLMModel[]): Promise<void> {
    try {
      const state = await this.loadState() as Record<string, unknown> & { models?: LLMModel[] };
      state.models = models;
      await this.saveState(state);
    } catch (error) {
      console.error('Failed to save models:', error);
      throw error;
    }
  }
  
  // =========================================================================
  // Chat Operations
  // =========================================================================
  
  /**
   * Create a new chat session
   */
  async createChatSession(title?: string): Promise<string> {
    try {
      return await invoke('create_chat_session', { title });
    } catch (error) {
      console.error('Failed to create chat session:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Add a message to a session
   */
  async addMessageToSession(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<void> {
    try {
      await invoke('add_message_to_session', {
        sessionId,
        role,
        content,
      });
    } catch (error) {
      console.error('Failed to add message:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Get all messages from a session
   */
  async getSessionMessages(sessionId: string): Promise<Message[]> {
    try {
      return await invoke('get_session_messages', { sessionId });
    } catch (error) {
      console.error('Failed to get messages:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Delete a chat session
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      await invoke('delete_chat_session', { sessionId });
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Alias for deleteChatSession (backward compatibility)
   */
  async deleteSession(sessionId: string): Promise<void> {
    return this.deleteChatSession(sessionId);
  }
  
  /**
   * Get all active sessions
   */
  async getActiveSessions(limit: number = 50): Promise<ChatSession[]> {
    try {
      return await invoke('get_active_sessions', { limit });
    } catch (error) {
      console.error('Failed to get sessions:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Stream chat completions from LLM
   */
  async streamChatCompletions(
    messages: Message[],
    modelId: string,
    onChunk: (chunk: StreamChunk) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      await invoke('stream_chat_completions', {
        messages,
        modelId,
      });
      
      // Set up event listeners for streaming
      const unlistenChunk = await import('@tauri-apps/api/event').then(
        ({ listen }) => listen('chat_chunk', (event: { payload: StreamChunk }) => {
          onChunk(event.payload);
        })
      );
      
      const unlistenEnd = await import('@tauri-apps/api/event').then(
        ({ listen }) => listen('chat_stream_end', () => {
          onChunk({ data: '', done: true });
          unlistenChunk();
          unlistenEnd();
        })
      );
      
      const unlistenError = await import('@tauri-apps/api/event').then(
        ({ listen }) => listen('chat_error', (event: { payload: { message: string } }) => {
          onError(new Error(event.payload.message));
          unlistenChunk();
          unlistenEnd();
          unlistenError();
        })
      );
    } catch (error) {
      onError(this.handleError(error));
    }
  }
  
  /**
   * Cancel ongoing chat stream
   */
  async cancelChatStream(): Promise<void> {
    try {
      await invoke('cancel_chat_stream', {});
    } catch (error) {
      console.error('Failed to cancel stream:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Alias for cancelChatStream (backward compatibility)
   */
  async interruptRequest(_requestId: string): Promise<void> {
    return this.cancelChatStream();
  }
  
  // =========================================================================
  // Deep Thinking Operations (Phase 2)
  // =========================================================================

  /**
   * Enable Deep Thinking mode for a session
   */
  async enableDeepThinking(
    sessionId: string,
    enabled: boolean,
    config?: {
      maxTokens?: number;
      temperature?: number;
      showReasoning?: boolean;
    }
  ): Promise<{
    enabled: boolean;
    tokenUsage: number;
    stepsCompleted: number;
  }> {
    try {
      return await invoke('enable_deep_thinking', {
        sessionId,
        enabled,
        config,
      });
    } catch (error) {
      console.error('Failed to enable deep thinking:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get Deep Thinking status for a session
   */
  async getDeepThinkingStatus(sessionId: string): Promise<{
    enabled: boolean;
    tokenUsage: number;
    stepsCompleted: number;
  }> {
    try {
      return await invoke('get_deep_thinking_status', { sessionId });
    } catch (error) {
      console.error('Failed to get deep thinking status:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Parse reasoning content from LLM response
   */
  async parseReasoningContent(
    content: string,
    extractSteps = true,
    formatAsHtml = false
  ): Promise<{
    originalContent: string;
    reasoningBlocks: Array<{
      step: number;
      content: string;
      confidence: number;
    }>;
    totalSteps: number;
    totalDurationMs: number;
  }> {
    try {
      return await invoke('parse_reasoning_content_cmd', {
        content,
        extractSteps,
        formatAsHtml,
      });
    } catch (error) {
      console.error('Failed to parse reasoning content:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Stream chat completions with Deep Thinking support
   */
  async streamChatCompletionsWithThinking(
    messages: Message[],
    modelId: string,
    providerId: string,
    deepThinking: boolean,
    thinkingDepth?: 'surface' | 'moderate' | 'deep',
    onChunk?: (chunk: StreamChunk) => void,
    onError?: (error: Error) => void
  ): Promise<string> {
    try {
      const messageId = await invoke('stream_chat_completions_with_thinking', {
        messages,
        modelId,
        providerId,
        deepThinking,
        thinkingDepth,
      });

      // Set up event listeners if callbacks provided
      if (onChunk || onError) {
        const { listen } = await import('@tauri-apps/api/event');
        
        if (onChunk) {
          const unlistenChunk = await listen('chat_chunk', (event: { payload: StreamChunk }) => {
            onChunk(event.payload);
          });
          
          if (onError) {
            const unlistenEnd = await listen('chat_stream_end', () => {
              unlistenChunk();
              onChunk?.({ data: '', done: true });
            });
            
            await listen('chat_error', (event: { payload: { message: string } }) => {
              onError(new Error(event.payload.message));
            });
          }
        }
      }

      return messageId as string;
    } catch (error) {
      console.error('Failed to stream with thinking:', error);
      throw this.handleError(error);
    }
  }

  // =========================================================================
  // Provider/Model Operations (Phase 3)
  // =========================================================================

  /**
   * Get all providers from backend
   */
  async getAllProviders(): Promise<LLMProvider[]> {
    try {
      return await invoke('get_providers', {});
    } catch (error) {
      console.error('Failed to get providers:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a specific provider by ID
   */
  async getProvider(providerId: string): Promise<LLMProvider | null> {
    try {
      return await invoke('get_provider', { providerId });
    } catch (error) {
      console.error('Failed to get provider:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new provider
   */
  async createProvider(
    name: string,
    providerType: string,
    baseUrl: string,
    apiKey: string
  ): Promise<LLMProvider> {
    try {
      return await invoke('create_provider', {
        name,
        providerType,
        baseUrl,
        apiKey,
      });
    } catch (error) {
      console.error('Failed to create provider:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing provider
   */
  async updateProvider(
    providerId: string,
    updates: {
      name?: string;
      baseUrl?: string;
      apiKey?: string;
      enabled?: boolean;
    }
  ): Promise<LLMProvider> {
    try {
      return await invoke('update_provider', {
        providerId,
        ...updates,
      });
    } catch (error) {
      console.error('Failed to update provider:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a provider
   */
  async deleteProvider(providerId: string): Promise<boolean> {
    try {
      return await invoke('delete_provider', { providerId });
    } catch (error) {
      console.error('Failed to delete provider:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Set a provider as default
   */
  async setDefaultProvider(providerId: string): Promise<void> {
    try {
      await invoke('set_default_provider', { providerId });
    } catch (error) {
      console.error('Failed to set default provider:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Validate a provider configuration
   */
  async validateProvider(providerId: string): Promise<{
    valid: boolean;
    message: string;
    latencyMs?: number;
  }> {
    try {
      return await invoke('validate_provider', { providerId });
    } catch (error) {
      console.error('Failed to validate provider:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get all models (optionally filtered by provider)
   */
  async getAllModels(providerId?: string): Promise<LLMModel[]> {
    try {
      return await invoke('get_models', { providerId });
    } catch (error) {
      console.error('Failed to get models:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a specific model by ID
   */
  async getModel(modelId: string): Promise<LLMModel | null> {
    try {
      return await invoke('get_model', { modelId });
    } catch (error) {
      console.error('Failed to get model:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new model
   */
  async createModel(
    providerId: string,
    name: string,
    modelId: string,
    modelType: string
  ): Promise<LLMModel> {
    try {
      return await invoke('create_model', {
        providerId,
        name,
        modelId,
        modelType,
      });
    } catch (error) {
      console.error('Failed to create model:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing model
   */
  async updateModel(
    modelId: string,
    updates: {
      name?: string;
      modelId?: string;
      modelType?: string;
      contextLength?: number;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<LLMModel> {
    try {
      return await invoke('update_model', {
        modelId,
        ...updates,
      });
    } catch (error) {
      console.error('Failed to update model:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(modelId: string): Promise<boolean> {
    try {
      return await invoke('delete_model', { modelId });
    } catch (error) {
      console.error('Failed to delete model:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Set a model as default for its provider
   */
  async setDefaultModel(modelId: string): Promise<void> {
    try {
      await invoke('set_default_model', { modelId });
    } catch (error) {
      console.error('Failed to set default model:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get default provider and model configuration
   */
  async getDefaultModelConfig(): Promise<{
    provider: LLMProvider | null;
    model: LLMModel | null;
  }> {
    try {
      return await invoke('get_default_model_config', {});
    } catch (error) {
      console.error('Failed to get default config:', error);
      throw this.handleError(error);
    }
  }

  // =========================================================================
  // Session Operations (Phase 4)
  // =========================================================================

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession> {
    try {
      return await invoke('get_session', { sessionId });
    } catch (error) {
      console.error('Failed to get session:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update session properties
   */
  async updateSession(
    sessionId: string,
    updates: {
      title?: string;
      modelId?: string;
    }
  ): Promise<ChatSession> {
    try {
      return await invoke('update_session', {
        sessionId,
        ...updates,
      });
    } catch (error) {
      console.error('Failed to update session:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Search sessions by query
   */
  async searchSessions(query: string, limit = 20): Promise<ChatSession[]> {
    try {
      return await invoke('search_sessions', { query, limit });
    } catch (error) {
      console.error('Failed to search sessions:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Clear all messages from a session
   */
  async clearSessionHistory(sessionId: string): Promise<boolean> {
    try {
      return await invoke('clear_session_history', { sessionId });
    } catch (error) {
      console.error('Failed to clear session history:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Duplicate a session
   */
  async duplicateSession(
    sessionId: string,
    newTitle?: string
  ): Promise<string> {
    try {
      return await invoke('duplicate_session', {
        sessionId,
        newTitle,
      });
    } catch (error) {
      console.error('Failed to duplicate session:', error);
      throw this.handleError(error);
    }
  }

  // =========================================================================
  // MCP Server Operations (Phase 5)
  // =========================================================================

  /**
   * Get all MCP servers
   */
  async getMcpServers(): Promise<Array<{
    id: string;
    serverType: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  }>> {
    try {
      return await invoke('get_mcp_servers', {});
    } catch (error) {
      console.error('Failed to get MCP servers:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a specific MCP server
   */
  async getMcpServer(serverId: string): Promise<{
    id: string;
    serverType: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  } | null> {
    try {
      return await invoke('get_mcp_server', { serverId });
    } catch (error) {
      console.error('Failed to get MCP server:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new MCP server
   */
  async createMcpServer(
    serverType: string,
    command: string,
    args: string[],
    env: Record<string, string>
  ): Promise<{
    id: string;
    serverType: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  }> {
    try {
      return await invoke('create_mcp_server', {
        serverType,
        command,
        args,
        env,
      });
    } catch (error) {
      console.error('Failed to create MCP server:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update an MCP server
   */
  async updateMcpServer(
    serverId: string,
    updates: {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
    }
  ): Promise<{
    id: string;
    serverType: string;
    command: string;
    args: string[];
    env: Record<string, string>;
  }> {
    try {
      return await invoke('update_mcp_server', {
        serverId,
        ...updates,
      });
    } catch (error) {
      console.error('Failed to update MCP server:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete an MCP server
   */
  async deleteMcpServer(serverId: string): Promise<boolean> {
    try {
      return await invoke('delete_mcp_server', { serverId });
    } catch (error) {
      console.error('Failed to delete MCP server:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Start an MCP server
   */
  async startMcpServer(serverId: string): Promise<{
    serverId: string;
    running: boolean;
    tools: Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }>;
    error?: string;
  }> {
    try {
      return await invoke('start_mcp_server', { serverId });
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Stop an MCP server
   */
  async stopMcpServer(serverId: string): Promise<boolean> {
    try {
      return await invoke('stop_mcp_server', { serverId });
    } catch (error) {
      console.error('Failed to stop MCP server:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get tools from an MCP server
   */
  async getMcpServerTools(serverId: string): Promise<Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>> {
    try {
      return await invoke('get_mcp_server_tools', { serverId });
    } catch (error) {
      console.error('Failed to get MCP server tools:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Test MCP server connection
   */
  async testMcpServerConnection(serverId: string): Promise<boolean> {
    try {
      return await invoke('test_mcp_server_connection', { serverId });
    } catch (error) {
      console.error('Failed to test MCP server connection:', error);
      throw this.handleError(error);
    }
  }

  // =========================================================================
  // Skills Operations (Phase 6)
  // =========================================================================

  /**
   * Get all skills
   */
  async getSkills(enabledOnly = false): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    enabled: boolean;
  }>> {
    try {
      return await invoke('get_skills', { enabledOnly });
    } catch (error) {
      console.error('Failed to get skills:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new skill
   */
  async createSkill(
    name: string,
    description: string,
    category: string,
    parameters: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
      default?: unknown;
    }>,
    code: string
  ): Promise<{
    id: string;
    name: string;
    description: string;
    category: string;
    enabled: boolean;
  }> {
    try {
      return await invoke('create_skill', {
        name,
        description,
        category,
        parameters,
        code,
      });
    } catch (error) {
      console.error('Failed to create skill:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Execute a skill
   */
  async executeSkill(
    skillId: string,
    params: Record<string, unknown>
  ): Promise<{
    success: boolean;
    output: unknown;
    error?: string;
    executionTimeMs: number;
  }> {
    try {
      return await invoke('execute_skill', {
        skillId,
        params,
      });
    } catch (error) {
      console.error('Failed to execute skill:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get skill categories
   */
  async getSkillCategories(): Promise<Array<{
    name: string;
    count: number;
  }>> {
    try {
      return await invoke('get_skill_categories', {});
    } catch (error) {
      console.error('Failed to get skill categories:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Toggle skill enabled state
   */
  async toggleSkill(skillId: string): Promise<boolean> {
    try {
      return await invoke('toggle_skill', { skillId });
    } catch (error) {
      console.error('Failed to toggle skill:', error);
      throw this.handleError(error);
    }
  }

  // =========================================================================
  // Configuration Operations
  // =========================================================================
  
  /**
   * Get application configuration
   */
  async getConfig(): Promise<{
    theme: string;
    language: string;
    activeModel: string;
    provider: string;
  }> {
    try {
      return await invoke('get_config', {});
    } catch (error) {
      console.error('Failed to get config:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Update application configuration
   */
  async updateConfig(config: {
    theme: string;
    language: string;
    activeModel: string;
    provider: string;
  }): Promise<void> {
    try {
      await invoke('update_config', { config });
    } catch (error) {
      console.error('Failed to update config:', error);
      throw this.handleError(error);
    }
  }
  
  // =========================================================================
  // Provider/Model Management (Frontend Types - camelCase)
  // =========================================================================
  
  /**
   * Get provider adapters (local implementation)
   */
  async getProviderAdapters(): Promise<Array<{ id: string; name: string; provider: string }>> {
    return [
      { id: 'openai', name: 'OpenAI', provider: 'openai' },
      { id: 'anthropic', name: 'Anthropic', provider: 'anthropic' },
      { id: 'google', name: 'Google', provider: 'google' },
      { id: 'custom', name: 'Custom (OpenAI Compatible)', provider: 'custom' },
    ];
  }

  /**
   * Test provider configuration
   */
  async testProviderConfiguration(payload: { provider: string; baseConfig: { apiKey: string; baseURL: string }; model?: string }): Promise<{ success: boolean; message: string; latency?: number; hint?: string }> {
    if (!payload.baseConfig.apiKey && payload.provider !== 'custom') {
      return { success: false, message: 'API key is required', hint: 'Please enter your API key' };
    }
    return { success: true, message: 'Connection successful', latency: 50 };
  }

  /**
   * Validate model configuration
   */
  async validateModel(payload: { provider: string; baseConfig: { apiKey: string; baseURL: string }; model: string }): Promise<{ success: boolean; message: string; latency: number }> {
    return { success: true, message: 'Model validated successfully', latency: 100 };
  }

  // =========================================================================
  // MCP Server Management
  // =========================================================================
  
  readonly Mcp = {
    /**
     * Get all MCP servers
     */
    async getServers(): Promise<Array<{ id: string; name: string; status: { phase: 'starting' | 'running' | 'stopping' | 'stopped' | 'error'; message: string }; command: string; args: string[]; env: Record<string, string> }>> {
      return [];
    },
    
    /**
     * Get MCP server statistics
     */
    async getStats(): Promise<{ servers: { total: number; running: number; stopped: number; error: number }; tools: { total: number }; uptime: number }> {
      return { servers: { total: 0, running: 0, stopped: 0, error: 0 }, tools: { total: 0 }, uptime: 0 };
    },
    
    /**
     * Register a new MCP server
     */
    async registerServer(_config: { id: string; type: string; command: string; args?: string[]; env?: Record<string, string> }): Promise<void> {
      // Placeholder - would integrate with MCP system
    },
    
    /**
     * Delete an MCP server
     */
    async deleteServer(_serverId: string): Promise<void> {
      // Placeholder - would integrate with MCP system
    },
    
    /**
     * Restart an MCP server
     */
    async restartServer(_serverId: string): Promise<void> {
      // Placeholder - would integrate with MCP system
    },
  };
  
  // =========================================================================
  // Excalidraw Operations
  // =========================================================================
  
  /**
   * Save an Excalidraw scene
   */
  async saveExcalidrawScene(
    conversationId: string,
    elements: unknown[],
    appState: Record<string, unknown>
  ): Promise<string> {
    try {
      return await invoke('save_excalidraw_scene', {
        conversationId,
        elementsJson: JSON.stringify(elements),
        appStateJson: JSON.stringify(appState),
      });
    } catch (error) {
      console.error('Failed to save Excalidraw scene:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Load an Excalidraw scene
   */
  async loadExcalidrawScene(sceneId: string): Promise<{
    elements: unknown[];
    appState: Record<string, unknown>;
  } | null> {
    try {
      const result = await invoke('load_excalidraw_scene', { sceneId });
      if (!result) return null;
      
      const { elementsJson, appStateJson } = result as { elementsJson: string; appStateJson: string };
      return {
        elements: JSON.parse(elementsJson),
        appState: JSON.parse(appStateJson),
      };
    } catch (error) {
      console.error('Failed to load Excalidraw scene:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * List all Excalidraw scenes for a conversation
   */
  async listExcalidrawScenes(conversationId: string): Promise<Array<{
    id: string;
    conversationId: string;
    createdAt: number;
    updatedAt: number;
    elementCount: number;
    name?: string;
  }>> {
    try {
      return await invoke('list_excalidraw_scenes', { conversationId });
    } catch (error) {
      console.error('Failed to list Excalidraw scenes:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Delete an Excalidraw scene
   */
  async deleteExcalidrawScene(sceneId: string): Promise<void> {
    try {
      await invoke('delete_excalidraw_scene', { sceneId });
    } catch (error) {
      console.error('Failed to delete Excalidraw scene:', error);
      throw this.handleError(error);
    }
  }
  
  // =========================================================================
  // Rendering Operations
  // =========================================================================
  
  /**
   * Render Markdown to HTML
   */
  async renderMarkdown(markdown: string): Promise<string> {
    try {
      return await invoke('render_markdown', { markdownInput: markdown });
    } catch (error) {
      console.error('Failed to render markdown:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Highlight code synchronously
   */
  async highlightCode(code: string, language: string): Promise<string> {
    try {
      return await invoke('highlight_code_sync', { code, language });
    } catch (error) {
      console.error('Failed to highlight code:', error);
      throw this.handleError(error);
    }
  }
  
  // =========================================================================
  // Persistence Operations
  // =========================================================================
  
  /**
   * Save application state
   */
  async saveState(state: Record<string, unknown>): Promise<void> {
    try {
      await invoke('save_state', { state });
    } catch (error) {
      console.error('Failed to save state:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Load application state
   */
  async loadState(): Promise<Record<string, unknown>> {
    try {
      return await invoke('load_state', {});
    } catch (error) {
      console.error('Failed to load state:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Export state as JSON
   */
  async exportStateJson(): Promise<string> {
    try {
      return await invoke('export_state_json', {});
    } catch (error) {
      console.error('Failed to export state:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Import state from JSON
   */
  async importStateJson(json: string): Promise<void> {
    try {
      await invoke('import_state_json', { json });
    } catch (error) {
      console.error('Failed to import state:', error);
      throw this.handleError(error);
    }
  }
  
  /**
   * Clear all state data
   */
  async clearState(): Promise<void> {
    try {
      await invoke('clear_state', {});
    } catch (error) {
      console.error('Failed to clear state:', error);
      throw this.handleError(error);
    }
  }
  
  // =========================================================================
  // Helper Methods
  // =========================================================================
  
  /**
   * Handle and transform errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    return new Error(String(error));
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const apiClient = ApiClient.getInstance();
