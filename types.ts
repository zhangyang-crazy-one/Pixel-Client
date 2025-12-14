
export enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
  MODERN_DARK = 'modern_dark',
  MODERN_LIGHT = 'modern_light',
  CLAY = 'clay',
  BIOLUMINESCENCE = 'bioluminescence'
}

export type Language = 'en' | 'zh' | 'ja';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: string;
  attachments?: string[]; // Base64 data URLs
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
  theme?: Theme; // Optional theme override per session
}

export interface LLMProvider {
  id: string;
  name: string;
  type: string; // Changed from enum to string to support dynamic adapters
  baseUrl: string;
  apiKey: string;
  icon?: string; // emoji or css color
}

export interface ProviderAdapter {
  name: string;
  provider: string;
  defaultBaseURL?: string; // Added field for auto-filling URL
}

export interface ProviderTestResponse {
  success: boolean;
  message: string;
  latency?: number;
  details?: any;
}

export type ModelType = 'chat' | 'embedding' | 'rerank' | 'multimodal';

export interface LLMModel {
  id: string;
  providerId: string;
  name: string; // Display name
  modelId: string; // API model string (e.g. gpt-4)
  type?: ModelType; // Defaults to 'chat'
  contextLength?: number; // Optional: Chat only usually
  maxTokens?: number; // Chat only
  temperature?: number; // Chat only
  dimensions?: number; // Embedding only
  isDefault?: boolean; // New field for default model
}

export interface AceConfig {
  fastModelId: string;
  reflectorModelId: string;
  curatorModelId: string;
}

// API Types
export interface ApiSession {
  sessionId: string;
  status: string;
  createdAt: number;
  lastActivityAt: number;
  metadata?: any;
}

export interface SessionHistory {
  sessionState: ApiSession;
  messages?: Message[]; // Added to support history retrieval
  telemetry: any[];
  directives: any[];
}

export interface AppState {
  theme: Theme;
  language: Language;
  sidebarOpen: boolean;
  currentSessionId: string | null;
  sessions: ChatSession[];
  providers: LLMProvider[];
  models: LLMModel[];
  activeModelId: string | null;
  mascotState: 'idle' | 'thinking' | 'happy' | 'shocked';
  aceConfig: AceConfig;
}
