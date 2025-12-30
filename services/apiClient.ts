
import { API_BASE_URL, API_KEY } from '../constants';
import { LLMModel, LLMProvider, ModelType, ApiSession, SessionHistory, Message, ProviderAdapter, ProviderTestResponse, McpServer, McpRegistrationConfig, McpStats } from '../types';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

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
  isDefault?: boolean;
  modelConfig?: {
    contextLength?: number;
    maxTokens?: number;
    temperature?: number;
    dimensions?: number;
  };
}

interface ApiMessage {
    id: number;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: number;
    metadata: string | null;
}

// --- Adapters ---

const adaptProvider = (apiProvider: ApiProvider): LLMProvider => ({
  id: apiProvider.id.toString(),
  name: apiProvider.name,
  type: apiProvider.provider,
  baseUrl: apiProvider.baseConfig?.baseURL || '',
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
  dimensions: apiModel.modelConfig?.dimensions,
  isDefault: apiModel.isDefault
});

const adaptMessage = (apiMsg: ApiMessage): Message => ({
    id: apiMsg.id.toString(),
    role: apiMsg.role,
    content: apiMsg.content,
    timestamp: apiMsg.created_at,
    modelId: undefined // Not provided by this endpoint currently
});

// --- API Calls ---

export const ApiClient = {
  // Providers
  getProviders: async (): Promise<LLMProvider[]> => {
    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch providers');
        const data = await res.json();
        if (!data || !data.providers) return [];
        return data.providers.map(adaptProvider);
    } catch (e) {
        console.warn("API Error (Providers):", e);
        return []; // Fallback/Mock for UI safety
    }
  },

  getProviderAdapters: async (): Promise<ProviderAdapter[]> => {
      try {
          const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/adapters`, { headers: getHeaders() });
          if (!res.ok) throw new Error('Failed to fetch adapters');
          const data = await res.json();
          return data.adapters || [];
      } catch (e) {
          console.warn("API Error (Adapters):", e);
          return [];
      }
  },

  testProviderConnection: async (id: string): Promise<ProviderTestResponse> => {
      try {
          const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/${id}/test`, { 
              method: 'POST',
              headers: getHeaders() 
          });
          const data = await res.json();
          return data;
      } catch (e) {
          console.error("Test connection error:", e);
          return {
              success: false,
              message: e instanceof Error ? e.message : 'Unknown network error'
          };
      }
  },

  testProviderConfiguration: async (payload: { provider: string, baseConfig: { apiKey: string, baseURL: string } }): Promise<{ success: boolean, message: string, hint?: string }> => {
      try {
          const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/test-connect`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(payload)
          });
          const data = await res.json();
          return data;
      } catch (e) {
           return {
               success: false,
               message: e instanceof Error ? e.message : 'Network Error'
           };
      }
  },

  validateModel: async (payload: { provider: string, baseConfig: { apiKey: string, baseURL: string }, model: string }): Promise<{ success: boolean, latency: number, message: string }> => {
      try {
          const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/validate-model`, {
              method: 'POST',
              headers: getHeaders(),
              body: JSON.stringify(payload)
          });
          const data = await res.json();
          return data;
      } catch (e) {
          return {
              success: false,
              latency: 0,
              message: e instanceof Error ? e.message : 'Network Error'
          };
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
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to create provider');
    const data = await res.json();
    return adaptProvider(data.provider);
  },

  updateProvider: async (id: string, provider: Partial<LLMProvider>): Promise<LLMProvider> => {
    const payload = {
        name: provider.name,
        baseConfig: {
            baseURL: provider.baseUrl,
            ...(provider.apiKey ? { apiKey: provider.apiKey } : {})
        }
    };
    const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update provider');
    const data = await res.json();
    return adaptProvider(data.provider);
  },

  deleteProvider: async (id: string): Promise<void> => {
    await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
  },

  // Models
  getModels: async (providerId: string): Promise<LLMModel[]> => {
    try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/${providerId}/models`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch models');
        const data = await res.json();
        if (!data || !data.models) return [];
        return data.models.map(adaptModel);
    } catch (e) {
        console.error(e);
        return [];
    }
  },
  
  getAllModels: async (): Promise<LLMModel[]> => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/models`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch all models');
        const data = await res.json();
        
        return (data.models || []).map((m: any) => adaptModel(m));
      } catch (e) {
          console.warn("API Error (Models):", e);
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
         enabled: true,
         isDefault: model.isDefault
     };
     
     const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/${model.providerId}/models`, {
         method: 'POST',
         headers: getHeaders(),
         body: JSON.stringify(payload)
     });
     if (!res.ok) throw new Error('Failed to create model');
     const data = await res.json();
     return adaptModel(data.model);
  },

  updateModel: async (model: Partial<LLMModel> & { id: string, providerId: string }): Promise<LLMModel> => {
     const payload = {
         modelName: model.name,
         enabled: true,
         isDefault: model.isDefault,
         modelConfig: {
             contextLength: model.contextLength,
             maxTokens: model.maxTokens,
             temperature: model.temperature,
             dimensions: model.dimensions
         }
     };
     
     const res = await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/${model.providerId}/models/${model.id}`, {
         method: 'PUT',
         headers: getHeaders(),
         body: JSON.stringify(payload)
     });
     if (!res.ok) throw new Error('Failed to update model');
     const data = await res.json();
     return adaptModel(data.model);
  },

  deleteModel: async (providerId: string, modelId: string): Promise<void> => {
      await fetchWithTimeout(`${API_BASE_URL}/api/llm/providers/${providerId}/models/${modelId}`, {
          method: 'DELETE',
          headers: getHeaders()
      });
  },

  // Sessions
  getActiveSessions: async (cutoffTime?: number): Promise<ApiSession[]> => {
    try {
      const params = cutoffTime !== undefined ? `?cutoffTime=${cutoffTime}` : '';
      const res = await fetchWithTimeout(`${API_BASE_URL}/v1/chat/sessions/active${params}`, { headers: getHeaders() });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data.sessions)) return data.sessions;
      if (data.data && Array.isArray(data.data.sessions)) return data.data.sessions;
      return [];
    } catch (e) {
      console.warn("API Error (Sessions):", e);
      return [];
    }
  },

  deleteSession: async (conversationId: string): Promise<void> => {
    const res = await fetchWithTimeout(`${API_BASE_URL}/v1/chat/sessions/${conversationId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  getSessionHistory: async (conversationId: string): Promise<SessionHistory | null> => {
      try {
        const res = await fetchWithTimeout(`${API_BASE_URL}/v1/chat/sessions/${conversationId}/history`, { headers: getHeaders() });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.data || null;
      } catch {
          return null;
      }
  },

  getSessionMessages: async (conversationId: string, limit = 100, offset = 0): Promise<Message[]> => {
      try {
          const res = await fetchWithTimeout(`${API_BASE_URL}/v1/chat/sessions/${conversationId}/messages?limit=${limit}&offset=${offset}`, { headers: getHeaders() });
          if (!res.ok) return [];
          const data = await res.json();
          const apiMessages: ApiMessage[] = data?.data?.messages || data?.messages || [];
          return apiMessages.map(adaptMessage);
      } catch (e) {
          console.warn("API Error (Messages):", e);
          return [];
      }
  },

  // System
  interruptRequest: async (requestId: string): Promise<void> => {
      await fetchWithTimeout(`${API_BASE_URL}/v1/interrupt`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ requestId })
      });
  },

  // MCP
  Mcp: {
    getServers: async (): Promise<McpServer[]> => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/api/mcp/servers`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch MCP servers');
            const json = await res.json();
            // Handle common data wrappers in response
            if (json.success && Array.isArray(json.data)) return json.data;
            if (Array.isArray(json)) return json;
            return [];
        } catch (e) {
            console.warn("API Error (MCP Servers):", e);
            return [];
        }
    },

    registerServer: async (config: McpRegistrationConfig): Promise<void> => {
        const res = await fetchWithTimeout(`${API_BASE_URL}/api/mcp/servers`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(config)
        });
        if (!res.ok) throw new Error('Failed to register MCP server');
    },

    deleteServer: async (serverId: string): Promise<void> => {
        await fetchWithTimeout(`${API_BASE_URL}/api/mcp/servers/${serverId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
    },

    restartServer: async (serverId: string): Promise<void> => {
         await fetchWithTimeout(`${API_BASE_URL}/api/mcp/servers/${serverId}/restart`, {
            method: 'POST',
            headers: getHeaders()
        });
    },

    getStats: async (): Promise<McpStats | null> => {
        try {
            const res = await fetchWithTimeout(`${API_BASE_URL}/api/mcp/statistics`, { headers: getHeaders() });
            if (!res.ok) return null;
            const json = await res.json();
            return json.success ? json.data : null;
        } catch (e) {
            return null;
        }
    }
  }
};
