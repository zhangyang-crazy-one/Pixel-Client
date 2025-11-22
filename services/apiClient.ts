
import { API_BASE_URL, API_KEY } from '../constants';
import { LLMModel, LLMProvider, ModelType, ApiSession, SessionHistory } from '../types';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
});

// --- Types matching API responses ---

interface ApiProvider {
  id: number;
  provider: string;
  name: string;
  description?: string;
  baseConfig: {
    baseURL: string;
    apiKey?: string;
    timeout?: number;
    maxRetries?: number;
  };
}

interface ApiModel {
  id: number;
  providerId: number;
  modelKey: string;
  modelName: string;
  modelType: string;
  enabled: boolean;
  modelConfig?: {
    contextLength?: number;
    maxTokens?: number;
    temperature?: number;
    dimensions?: number;
  };
}

// --- Adapters ---

const adaptProvider = (apiProvider: ApiProvider): LLMProvider => ({
  id: apiProvider.id.toString(),
  name: apiProvider.name,
  type: apiProvider.provider as any,
  baseUrl: apiProvider.baseConfig.baseURL,
  apiKey: '', // Key is masked by API
  icon: '🔧'
});

const adaptModel = (apiModel: ApiModel): LLMModel => ({
  id: apiModel.id.toString(),
  providerId: apiModel.providerId.toString(),
  name: apiModel.modelName,
  modelId: apiModel.modelKey,
  type: apiModel.modelType as ModelType,
  contextLength: apiModel.modelConfig?.contextLength,
  maxTokens: apiModel.modelConfig?.maxTokens,
  temperature: apiModel.modelConfig?.temperature,
  dimensions: apiModel.modelConfig?.dimensions
});

// --- API Calls ---

export const ApiClient = {
  // Providers
  getProviders: async (): Promise<LLMProvider[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/llm/providers`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch providers');
        const data = await res.json();
        return data.providers.map(adaptProvider);
    } catch (e) {
        console.error(e);
        return []; // Fallback/Mock for UI safety
    }
  },

  createProvider: async (provider: Partial<LLMProvider>): Promise<LLMProvider> => {
    const payload = {
        provider: provider.type,
        name: provider.name,
        baseConfig: {
            baseURL: provider.baseUrl,
            apiKey: provider.apiKey
        }
    };
    const res = await fetch(`${API_BASE_URL}/api/llm/providers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create provider');
    const data = await res.json();
    return adaptProvider(data.provider);
  },

  deleteProvider: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/api/llm/providers/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
  },

  // Models
  getModels: async (providerId: string): Promise<LLMModel[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/llm/providers/${providerId}/models`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch models');
        const data = await res.json();
        return data.models.map(adaptModel);
    } catch (e) {
        console.error(e);
        return [];
    }
  },
  
  getAllModels: async (): Promise<LLMModel[]> => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/llm/models`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch all models');
        const data = await res.json();
        
        // The list endpoint returns a slightly different structure or simplified list, 
        // assuming standard mapping:
        return data.models.map((m: any) => ({
            id: m.id.toString(),
            providerId: m.providerId.toString(),
            name: m.modelName,
            modelId: m.modelKey,
            type: m.modelType as ModelType,
            // Basic endpoint might not return config details, but we map what we can
            contextLength: 4096 
        }));
      } catch (e) {
          console.error(e);
          return [];
      }
  },

  createModel: async (model: Partial<LLMModel>): Promise<LLMModel> => {
     const payload = {
         modelKey: model.modelId,
         modelName: model.name,
         modelType: model.type || 'nlp',
         modelConfig: {
             contextLength: model.contextLength,
             maxTokens: model.maxTokens,
             temperature: model.temperature,
             dimensions: model.dimensions
         },
         enabled: true
     };
     
     const res = await fetch(`${API_BASE_URL}/api/llm/providers/${model.providerId}/models`, {
         method: 'POST',
         headers: getHeaders(),
         body: JSON.stringify(payload)
     });
     if (!res.ok) throw new Error('Failed to create model');
     const data = await res.json();
     return adaptModel(data.model);
  },

  deleteModel: async (providerId: string, modelId: string): Promise<void> => {
      await fetch(`${API_BASE_URL}/api/llm/providers/${providerId}/models/${modelId}`, {
          method: 'DELETE',
          headers: getHeaders()
      });
  },

  // Sessions
  getActiveSessions: async (cutoffTime?: number): Promise<ApiSession[]> => {
    try {
      const params = cutoffTime ? `?cutoffTime=${cutoffTime}` : '';
      const res = await fetch(`${API_BASE_URL}/v1/chat/sessions/active${params}`, { headers: getHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data.sessions || [];
    } catch (e) {
      console.error("Failed to get sessions", e);
      return [];
    }
  },

  deleteSession: async (conversationId: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/v1/chat/sessions/${conversationId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  getSessionHistory: async (conversationId: string): Promise<SessionHistory | null> => {
      try {
        const res = await fetch(`${API_BASE_URL}/v1/chat/sessions/${conversationId}/history`, { headers: getHeaders() });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data;
      } catch {
          return null;
      }
  },

  // System
  interruptRequest: async (requestId: string): Promise<void> => {
      await fetch(`${API_BASE_URL}/v1/interrupt`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ requestId })
      });
  }
};
