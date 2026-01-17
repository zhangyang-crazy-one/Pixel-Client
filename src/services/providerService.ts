/**
 * Provider Service
 * Handles LLM Provider management with the Tauri backend
 */

import { apiClient } from '../../services/apiClient';
import type { LLMProvider, LLMModel } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface ProviderFormData {
  name: string;
  providerType: string;
  baseUrl: string;
  apiKey: string;
}

export interface ModelFormData {
  providerId: string;
  name: string;
  modelId: string;
  modelType: string;
  contextLength?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  latencyMs?: number;
}

export interface DefaultConfig {
  provider: LLMProvider | null;
  model: LLMModel | null;
}

// ============================================================================
// Provider Operations
// ============================================================================

/**
 * Get all configured providers
 */
export async function getProviders(): Promise<LLMProvider[]> {
  return apiClient.getAllProviders();
}

/**
 * Get a specific provider by ID
 */
export async function getProvider(id: string): Promise<LLMProvider | null> {
  return apiClient.getProvider(id);
}

/**
 * Create a new provider
 */
export async function createProvider(data: ProviderFormData): Promise<LLMProvider> {
  return apiClient.createProvider(
    data.name,
    data.providerType,
    data.baseUrl,
    data.apiKey
  );
}

/**
 * Update an existing provider
 */
export async function updateProvider(
  id: string,
  updates: Partial<ProviderFormData>
): Promise<LLMProvider> {
  const apiUpdates: Record<string, unknown> = {};
  
  if (updates.name !== undefined) apiUpdates.name = updates.name;
  if (updates.baseUrl !== undefined) apiUpdates.baseUrl = updates.baseUrl;
  if (updates.apiKey !== undefined) apiUpdates.apiKey = updates.apiKey;
  
  return apiClient.updateProvider(id, apiUpdates);
}

/**
 * Delete a provider and its associated models
 */
export async function deleteProvider(id: string): Promise<boolean> {
  return apiClient.deleteProvider(id);
}

/**
 * Set a provider as the default
 */
export async function setDefaultProvider(id: string): Promise<void> {
  return apiClient.setDefaultProvider(id);
}

/**
 * Validate a provider by making a test API call
 */
export async function validateProvider(id: string): Promise<ValidationResult> {
  return apiClient.validateProvider(id);
}

/**
 * Get the default provider and model configuration
 */
export async function getDefaultConfig(): Promise<DefaultConfig> {
  return apiClient.getDefaultModelConfig();
}

// ============================================================================
// Model Operations
// ============================================================================

/**
 * Get all models, optionally filtered by provider
 */
export async function getModels(providerId?: string): Promise<LLMModel[]> {
  return apiClient.getAllModels(providerId);
}

/**
 * Get models for a specific provider
 */
export async function getModelsByProvider(providerId: string): Promise<LLMModel[]> {
  return apiClient.getAllModels(providerId);
}

/**
 * Get a specific model by ID
 */
export async function getModel(id: string): Promise<LLMModel | null> {
  return apiClient.getModel(id);
}

/**
 * Create a new model
 */
export async function createModel(data: ModelFormData): Promise<LLMModel> {
  return apiClient.createModel(
    data.providerId,
    data.name,
    data.modelId,
    data.modelType
  );
}

/**
 * Update an existing model
 */
export async function updateModel(
  id: string,
  updates: Partial<ModelFormData>
): Promise<LLMModel> {
  const apiUpdates: Record<string, unknown> = {};
  
  if (updates.name !== undefined) apiUpdates.name = updates.name;
  if (updates.modelId !== undefined) apiUpdates.modelId = updates.modelId;
  if (updates.modelType !== undefined) apiUpdates.modelType = updates.modelType;
  if (updates.contextLength !== undefined) apiUpdates.contextLength = updates.contextLength;
  if (updates.maxTokens !== undefined) apiUpdates.maxTokens = updates.maxTokens;
  if (updates.temperature !== undefined) apiUpdates.temperature = updates.temperature;
  
  return apiClient.updateModel(id, apiUpdates);
}

/**
 * Delete a model
 */
export async function deleteModel(id: string): Promise<boolean> {
  return apiClient.deleteModel(id);
}

/**
 * Set a model as default for its provider
 */
export async function setDefaultModel(id: string): Promise<void> {
  return apiClient.setDefaultModel(id);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get provider type options
 */
export function getProviderTypeOptions(): Array<{ value: string; label: string; defaultBaseUrl?: string }> {
  return [
    { value: 'openai', label: 'OpenAI', defaultBaseUrl: 'https://api.openai.com/v1' },
    { value: 'anthropic', label: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com' },
    { value: 'google', label: 'Google (Gemini)', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1' },
    { value: 'deepseek', label: 'DeepSeek', defaultBaseUrl: 'https://api.deepseek.com/v1' },
    { value: 'moonshot', label: 'Moonshot (Kimi)', defaultBaseUrl: 'https://api.moonshot.cn/v1' },
    { value: 'minimax', label: 'MiniMax', defaultBaseUrl: 'https://api.minimax.chat/v1' },
    { value: 'custom', label: 'Custom (OpenAI Compatible)', defaultBaseUrl: '' },
  ];
}

/**
 * Get model type options
 */
export function getModelTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'chat', label: 'Chat' },
    { value: 'embedding', label: 'Embedding' },
    { value: 'rerank', label: 'Rerank' },
    { value: 'multimodal', label: 'Multimodal' },
    { value: 'nlp', label: 'NLP' },
  ];
}

/**
 * Validate provider form data
 */
export function validateProviderForm(data: ProviderFormData): string[] {
  const errors: string[] = [];
  
  if (!data.name.trim()) {
    errors.push('Provider name is required');
  }
  
  if (!data.providerType) {
    errors.push('Provider type is required');
  }
  
  if (!data.baseUrl.trim()) {
    errors.push('Base URL is required');
  } else {
    try {
      new URL(data.baseUrl);
    } catch {
      errors.push('Base URL must be a valid URL');
    }
  }
  
  if (!data.apiKey.trim()) {
    errors.push('API key is required');
  }
  
  return errors;
}

/**
 * Validate model form data
 */
export function validateModelForm(data: ModelFormData): string[] {
  const errors: string[] = [];
  
  if (!data.providerId) {
    errors.push('Provider is required');
  }
  
  if (!data.name.trim()) {
    errors.push('Model name is required');
  }
  
  if (!data.modelId.trim()) {
    errors.push('Model ID is required');
  }
  
  if (!data.modelType) {
    errors.push('Model type is required');
  }
  
  if (data.contextLength !== undefined && data.contextLength < 1) {
    errors.push('Context length must be at least 1');
  }
  
  if (data.maxTokens !== undefined && data.maxTokens < 1) {
    errors.push('Max tokens must be at least 1');
  }
  
  if (data.temperature !== undefined && (data.temperature < 0 || data.temperature > 2)) {
    errors.push('Temperature must be between 0 and 2');
  }
  
  return errors;
}

/**
 * Get a model display string
 */
export function formatModelDisplay(model: LLMModel, provider?: LLMProvider): string {
  const providerName = provider?.name || 'Unknown';
  return `${model.name} (${providerName})`;
}

/**
 * Find the best matching model for a provider
 */
export function findBestModel(
  models: LLMModel[],
  providerId: string,
  type: string = 'chat'
): LLMModel | null {
  const providerModels = models.filter(
    m => m.providerId === providerId && (m.type || 'chat') === type
  );
  
  // Return default model first, then first available
  return providerModels.find(m => m.isDefault) || providerModels[0] || null;
}
