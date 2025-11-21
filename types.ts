
export enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
  FESTIVAL = 'festival',
  MOONLIGHT = 'moonlight',
  CYBERPUNK = 'cyberpunk'
}

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

export interface AppState {
  theme: Theme;
  sidebarOpen: boolean;
  currentSessionId: string | null;
  sessions: ChatSession[];
  providers: LLMProvider[];
  models: LLMModel[];
  activeModelId: string | null;
  mascotState: 'idle' | 'thinking' | 'happy' | 'shocked';
}