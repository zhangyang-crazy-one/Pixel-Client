
import { LLMProvider, LLMModel, Theme } from './types';

export const INITIAL_PROVIDERS: LLMProvider[] = [
  {
    id: 'prov_1',
    name: 'OpenAI (Mock)',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    icon: '🟢'
  },
  {
    id: 'prov_2',
    name: 'DeepSeek (Mock)',
    type: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    icon: '🔵'
  }
];

export const INITIAL_MODELS: LLMModel[] = [
  {
    id: 'mod_1',
    providerId: 'prov_1',
    name: 'GPT-4 Turbo',
    modelId: 'gpt-4-turbo',
    contextLength: 128000,
    maxTokens: 4096,
    temperature: 0.7
  },
  {
    id: 'mod_2',
    providerId: 'prov_2',
    name: 'DeepSeek Chat',
    modelId: 'deepseek-chat',
    contextLength: 32000,
    maxTokens: 2048,
    temperature: 0.5
  }
];

export const THEME_STYLES = {
  [Theme.DARK]: {
    bg: 'bg-[#0D0C1D]',
    text: 'text-[#FFEED1]',
    primary: 'bg-[#FF00FF]', // Neon Magenta
    secondary: 'bg-[#2D2B40]',
    border: 'border-[#FF00FF]',
    accent: 'text-[#00FFFF]',
    inputBg: 'bg-[#1a1929]'
  },
  [Theme.LIGHT]: {
    bg: 'bg-[#FFEED1]',
    text: 'text-[#2d1b2e]',
    primary: 'bg-[#FF7AA2]', // Sakura Pink
    secondary: 'bg-[#FFF8E7]',
    border: 'border-[#FF7AA2]',
    accent: 'text-[#FF9900]',
    inputBg: 'bg-[#ffffff]'
  },
  [Theme.FESTIVAL]: {
    bg: 'bg-[#2a0a0a]',
    text: 'text-[#ffd700]',
    primary: 'bg-[#ff0000]', // Red
    secondary: 'bg-[#4a0e0e]',
    border: 'border-[#ffd700]',
    accent: 'text-[#00ff00]',
    inputBg: 'bg-[#3d1010]'
  },
  [Theme.MOONLIGHT]: {
    bg: 'bg-[#050b14]',
    text: 'text-[#e0f7fa]',
    primary: 'bg-[#4fc3f7]', // Light Blue
    secondary: 'bg-[#0d1b2a]',
    border: 'border-[#81d4fa]',
    accent: 'text-[#b3e5fc]',
    inputBg: 'bg-[#1c2e4a]'
  },
  [Theme.CYBERPUNK]: {
    bg: 'bg-[#050510]', // Deep Space
    text: 'text-[#D1F7FF]', // Holo Blue
    primary: 'bg-[#FF2A6D]', // Radical Red/Pink
    secondary: 'bg-[#2D1B4E]', // Deep Indigo/Purple (More colorful than gray)
    border: 'border-[#05D9E8]', // Fluorescent Cyan
    accent: 'text-[#00FF9F]', // Matrix Green
    inputBg: 'bg-[#000000]'
  }
};
