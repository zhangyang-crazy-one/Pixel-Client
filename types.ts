
export enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
  FESTIVAL = 'festival',
  MOONLIGHT = 'moonlight',
  CYBERPUNK = 'cyberpunk'
}

export type Language = 'en' | 'zh' | 'ja';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  modelId?: string;
  attachments?: string[]; // URLs to simulated attachments
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
  type: 'openai' | 'anthropic' | 'deepseek' | 'custom';
  baseUrl: string;
  apiKey: string;
  icon?: string; // emoji or css color
}

export type ModelType = 'chat' | 'embedding' | 'rerank';

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
