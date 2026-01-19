
 

import { LLMProvider, LLMModel, Theme, Language } from './types';
import React from 'react';

// ApexBridge Configuration
export const API_BASE_URL = 'http://localhost:3000';

// Note: In production, ensure VITE_LLM_API_KEY is set in .env
// The API key is required for LLM functionality
export const API_KEY = import.meta.env.VITE_LLM_API_KEY || '';

// ============================================================================
// Backend Configuration (Persistent via localStorage)
// ============================================================================

const BACKEND_CONFIG_STORAGE_KEY = 'pixel_backend_config';

export interface BackendConfig {
  apiBaseUrl: string;
  apiKey: string;
}

const DEFAULT_BACKEND_CONFIG: BackendConfig = {
  apiBaseUrl: API_BASE_URL || 'http://localhost:3000',
  apiKey: API_KEY,
};

/**
 * Get backend configuration from localStorage
 * Falls back to environment variables and defaults
 */
export function getBackendConfig(): BackendConfig {
  try {
    const stored = localStorage.getItem(BACKEND_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        apiBaseUrl: parsed.apiBaseUrl || DEFAULT_BACKEND_CONFIG.apiBaseUrl,
        apiKey: parsed.apiKey || DEFAULT_BACKEND_CONFIG.apiKey,
      };
    }
  } catch (error) {
    console.warn('Failed to load backend config from localStorage:', error);
  }
  return DEFAULT_BACKEND_CONFIG;
}

/**
 * Save backend configuration to localStorage
 */
export function saveBackendConfig(config: BackendConfig): void {
  try {
    localStorage.setItem(BACKEND_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save backend config to localStorage:', error);
  }
}

/**
 * Clear backend configuration from localStorage
 */
export function clearBackendConfig(): void {
  try {
    localStorage.removeItem(BACKEND_CONFIG_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear backend config from localStorage:', error);
  }
}

export const INITIAL_PROVIDERS: LLMProvider[] = []; 
export const INITIAL_MODELS: LLMModel[] = [];

// Use React.createElement to avoid JSX syntax in .ts file
export const PROVIDER_LOGOS: Record<string, React.ReactNode> = {
  openai: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
    React.createElement("path", { d: "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1195 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4533l-.142.0805L8.704 5.4596a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l3.1028-1.7999 3.1028 1.7999v3.5916l-3.1028 1.8-3.1028-1.8z" })
  ),
  anthropic: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
    React.createElement("path", { d: "M17.802 18.917h3.042l-7.98-16.732h-3.03l-7.962 16.732h3.155l1.638-3.708h9.414l1.723 3.708Zm-10.457-6.095L11.34 4.303l4.032 8.52H7.345Z" })
  ),
  google: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
    React.createElement("path", { d: "M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" })
  ),
  deepseek: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
     React.createElement("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4zm5 4h-2v-2h2v2zm0-4h-2V8h2v4z" })
  ),
  qwen: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
      React.createElement("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" })
  ),
  zhipu: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
     React.createElement("path", { d: "M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" })
  ),
  custom: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
    React.createElement("path", { d: "M12 14c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" })
  )
};

export const getProviderIcon = (type: string): React.ReactNode => {
    const key = type.toLowerCase();
    if (key.includes('openai')) return PROVIDER_LOGOS.openai;
    if (key.includes('anthropic') || key.includes('claude')) return PROVIDER_LOGOS.anthropic;
    if (key.includes('google') || key.includes('gemini')) return PROVIDER_LOGOS.google;
    if (key.includes('deepseek')) return PROVIDER_LOGOS.deepseek;
    if (key.includes('qwen') || key.includes('aliyun') || key.includes('tongyi')) return PROVIDER_LOGOS.qwen;
    if (key.includes('zhipu') || key.includes('glm')) return PROVIDER_LOGOS.zhipu;
    return PROVIDER_LOGOS.custom;
};

// Expanded Theme System
export const THEME_STYLES = {
  // PIXEL: High Contrast, Thick Borders, Sharp Edges
  [Theme.DARK]: {
    type: 'pixel',
    bg: 'bg-[#0D0C1D]',
    text: 'text-[#FFEED1]',
    textMuted: 'text-[#FFEED1]/60',
    primary: 'bg-[#FF00FF] hover:brightness-110',
    primaryText: 'text-white',
    secondary: 'bg-[#2D2B40]',
    secondaryText: 'text-[#FFEED1]',
    accent: 'text-[#00FFFF]',
    border: 'border-2 border-[#FF00FF]',
    
    // Structural
    font: 'font-pixel-verse',
    radius: 'rounded-none',
    borderWidth: 'border-2',
    borderColor: 'border-black',
    shadow: 'pixel-shadow',
    inputBg: 'bg-[#1a1929]',
    
    // Layout specifics
    sidebarBorder: 'border-r-4 border-black',
    headerBorder: 'border-b-4 border-black',
    card: 'border-4 border-black bg-[#2D2B40] pixel-shadow',
    button: 'border-2 border-black pixel-shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none uppercase tracking-widest font-bold'
  },
  [Theme.LIGHT]: {
    type: 'pixel',
    bg: 'bg-[#FFEED1]',
    text: 'text-[#2d1b2e]',
    textMuted: 'text-[#2d1b2e]/60',
    primary: 'bg-[#FF7AA2] hover:brightness-110',
    primaryText: 'text-white',
    secondary: 'bg-[#FFF8E7]',
    secondaryText: 'text-[#2d1b2e]',
    accent: 'text-[#ff00ff]',
    border: 'border-2 border-black',
    
    // Structural
    font: 'font-pixel-verse',
    radius: 'rounded-none',
    borderWidth: 'border-2',
    borderColor: 'border-black',
    shadow: 'pixel-shadow',
    inputBg: 'bg-white',
    
    // Layout specifics
    sidebarBorder: 'border-r-4 border-black',
    headerBorder: 'border-b-4 border-black',
    card: 'border-4 border-black bg-[#FFF8E7] pixel-shadow',
    button: 'border-2 border-black pixel-shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none uppercase tracking-widest font-bold'
  },
  // MODERN: Soft shadows, rounded corners, clean fonts
  [Theme.MODERN_DARK]: {
    type: 'modern',
    bg: 'bg-[#0f172a]',
    text: 'text-slate-200',
    textMuted: 'text-slate-400',
    primary: 'bg-blue-600 hover:bg-blue-700',
    primaryText: 'text-white',
    secondary: 'bg-[#1e293b]',
    secondaryText: 'text-slate-200',
    accent: 'text-blue-400',
    border: 'border border-slate-700',
    
    // Structural
    font: 'font-sans',
    radius: 'rounded-lg',
    borderWidth: 'border',
    borderColor: 'border-slate-700',
    shadow: 'shadow-lg',
    inputBg: 'bg-[#1e293b]',
    
    // Layout specifics
    sidebarBorder: 'border-r border-slate-800',
    headerBorder: 'border-b border-slate-800',
    card: 'border border-slate-700 bg-[#1e293b] shadow-xl',
    button: 'rounded-md shadow-sm font-medium transition-colors'
  },
  [Theme.MODERN_LIGHT]: {
    type: 'modern',
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    primary: 'bg-indigo-600 hover:bg-indigo-700',
    primaryText: 'text-white',
    secondary: 'bg-white',
    secondaryText: 'text-gray-900',
    accent: 'text-indigo-600',
    border: 'border border-gray-200',
    
    // Structural
    font: 'font-sans',
    radius: 'rounded-lg',
    borderWidth: 'border',
    borderColor: 'border-gray-200',
    shadow: 'shadow-sm',
    inputBg: 'bg-white',
    
    // Layout specifics
    sidebarBorder: 'border-r border-gray-200',
    headerBorder: 'border-b border-gray-200',
    card: 'border border-gray-200 bg-white shadow-lg',
    button: 'rounded-md shadow-sm font-medium transition-colors'
  },
  // CLAY: Neumorphism/Claymorphism hybrid
  [Theme.CLAY]: {
      type: 'modern',
      bg: 'bg-[#e0e5ec]',
      text: 'text-[#4a5568]',
      textMuted: 'text-[#a0aec0]',
      primary: 'bg-[#e0e5ec] hover:bg-[#d1d9e6] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] text-[#4a5568]',
      primaryText: 'text-[#4a5568]',
      secondary: 'bg-[#e0e5ec]',
      secondaryText: 'text-[#4a5568]',
      accent: 'text-[#718096]',
      border: 'border-none',
      
      font: 'font-sans',
      radius: 'rounded-2xl',
      borderWidth: 'border-0',
      borderColor: 'border-transparent',
      shadow: 'shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]',
      inputBg: 'bg-[#e0e5ec] shadow-[inset_6px_6px_12px_#b8b9be,inset_-6px_-6px_12px_#ffffff]',
      
      sidebarBorder: 'border-r border-white/50',
      headerBorder: 'border-b border-white/50',
      card: 'bg-[#e0e5ec] shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]',
      button: 'rounded-xl font-bold text-[#4a5568] shadow-[6px_6px_12px_#b8b9be,-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#b8b9be,inset_-4px_-4px_8px_#ffffff] transition-all'
  },
  // BIOLUMINESCENCE: Deep ocean, glowing
  [Theme.BIOLUMINESCENCE]: {
      type: 'modern',
      bg: 'bg-[#000814]',
      text: 'text-[#90e0ef]',
      textMuted: 'text-[#0077b6]',
      primary: 'bg-[#00b4d8] hover:bg-[#0096c7] shadow-[0_0_15px_rgba(0,180,216,0.6)]',
      primaryText: 'text-[#000814]',
      secondary: 'bg-[#001d3d]',
      secondaryText: 'text-[#90e0ef]',
      accent: 'text-[#00b4d8]',
      border: 'border border-[#0077b6]',

      font: 'font-sans',
      radius: 'rounded-xl',
      borderWidth: 'border',
      borderColor: 'border-[#003566]',
      shadow: 'shadow-[0_0_10px_rgba(0,119,182,0.3)]',
      inputBg: 'bg-[#001d3d]',

      sidebarBorder: 'border-r border-[#003566]',
      headerBorder: 'border-b border-[#003566]',
      card: 'bg-[#001d3d] border border-[#00b4d8]/30 shadow-[0_0_20px_rgba(0,180,216,0.1)]',
      button: 'rounded-lg shadow-[0_0_10px_rgba(0,180,216,0.4)] font-bold transition-all hover:shadow-[0_0_20px_rgba(0,180,216,0.8)]'
  },
  // SHADCN DARK: Clean shadcn/ui inspired dark theme
  [Theme.SHADCN_DARK]: {
      type: 'modern',
      bg: 'bg-zinc-950',
      text: 'text-zinc-50',
      textMuted: 'text-zinc-400',
      primary: 'bg-zinc-50 hover:bg-zinc-200 text-zinc-900',
      primaryText: 'text-zinc-900',
      secondary: 'bg-zinc-900',
      secondaryText: 'text-zinc-50',
      accent: 'text-zinc-300',
      border: 'border border-zinc-800',

      font: 'font-sans',
      radius: 'rounded-md',
      borderWidth: 'border',
      borderColor: 'border-zinc-800',
      shadow: 'shadow-sm',
      inputBg: 'bg-zinc-900',

      sidebarBorder: 'border-r border-zinc-800',
      headerBorder: 'border-b border-zinc-800',
      card: 'bg-zinc-900 border border-zinc-800 shadow-sm',
      button: 'rounded-md font-medium transition-colors'
  },
  // SHADCN LIGHT: Clean shadcn/ui inspired light theme
  [Theme.SHADCN_LIGHT]: {
      type: 'modern',
      bg: 'bg-white',
      text: 'text-zinc-950',
      textMuted: 'text-zinc-500',
      primary: 'bg-zinc-900 hover:bg-zinc-800 text-zinc-50',
      primaryText: 'text-zinc-50',
      secondary: 'bg-zinc-100',
      secondaryText: 'text-zinc-950',
      accent: 'text-zinc-600',
      border: 'border border-zinc-200',

      font: 'font-sans',
      radius: 'rounded-md',
      borderWidth: 'border',
      borderColor: 'border-zinc-200',
      shadow: 'shadow-sm',
      inputBg: 'bg-white',

      sidebarBorder: 'border-r border-zinc-200',
      headerBorder: 'border-b border-zinc-200',
      card: 'bg-white border border-zinc-200 shadow-sm',
      button: 'rounded-md font-medium transition-colors'
  },
  // CYBER: Neon cyberpunk aesthetic
  [Theme.CYBER]: {
      type: 'modern',
      bg: 'bg-[#0a0a0f]',
      text: 'text-cyan-400',
      textMuted: 'text-cyan-600',
      primary: 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.5)]',
      primaryText: 'text-black',
      secondary: 'bg-[#12121a]',
      secondaryText: 'text-cyan-400',
      accent: 'text-pink-500',
      border: 'border border-cyan-500/30',

      font: 'font-sans',
      radius: 'rounded-lg',
      borderWidth: 'border',
      borderColor: 'border-cyan-500/30',
      shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
      inputBg: 'bg-[#12121a]',

      sidebarBorder: 'border-r border-cyan-500/20',
      headerBorder: 'border-b border-cyan-500/20',
      card: 'bg-[#12121a] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]',
      button: 'rounded-lg font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all'
  },
  // SUNSET: Warm orange/red gradient theme
  [Theme.SUNSET]: {
      type: 'modern',
      bg: 'bg-[#1a1a2e]',
      text: 'text-orange-100',
      textMuted: 'text-orange-300/60',
      primary: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400',
      primaryText: 'text-white',
      secondary: 'bg-[#16213e]',
      secondaryText: 'text-orange-100',
      accent: 'text-orange-400',
      border: 'border border-orange-500/30',

      font: 'font-sans',
      radius: 'rounded-lg',
      borderWidth: 'border',
      borderColor: 'border-orange-500/30',
      shadow: 'shadow-lg',
      inputBg: 'bg-[#16213e]',

      sidebarBorder: 'border-r border-orange-500/20',
      headerBorder: 'border-b border-orange-500/20',
      card: 'bg-[#16213e] border border-orange-500/20 shadow-lg',
      button: 'rounded-lg font-medium transition-all'
  }
};

export const TRANSLATIONS = {
  en: {
    newChat: 'New Chat',
    history: 'History',
    configLlms: 'Config LLMs',
    send: 'SEND',
    stop: 'STOP',
    currentChatModel: 'CURRENT CHAT MODEL',
    noChatModels: 'No Chat Models Configured',
    typeMessage: 'Type a message...',
    theme: 'Theme',
    language: 'Language',
    generating: 'GENERATING...',
    deleteSessionTitle: 'DELETE SESSION?',
    deleteSessionConfirm: 'Are you sure you want to delete this session?',
    deleteSessionDesc: 'This action cannot be undone.',
    deleteAction: 'DELETE',
    cancel: 'CANCEL',
    confirm: 'CONFIRM',
    close: 'CLOSE',
    saveFailed: 'Operation Failed',
    saved: 'Saved',
    providers: 'PROVIDERS',
    models: 'MODELS',
    aceAgent: 'ACE AGENT',
    addProvider: 'ADD PROVIDER',
    editProvider: 'EDIT PROVIDER',
    saveProvider: 'SAVE PROVIDER',
    updateProvider: 'UPDATE PROVIDER',
    deleteProviderConfirm: 'Delete this provider and all its models?',
    addModel: 'ADD MODEL',
    editModel: 'EDIT MODEL',
    deleteModelConfirm: 'Delete this model?',
    testConnection: 'TEST CONNECT',
    testModel: 'TEST MODEL',
    testing: 'TESTING...',
    connectionSuccess: 'Connection Successful',
    connectionFailed: 'Connection Failed',
    latency: 'Latency',
    name: 'NAME',
    type: 'TYPE',
    apiBaseUrl: 'API BASE URL',
    apiKey: 'API KEY',
    displayName: 'DISPLAY NAME',
    modelId: 'MODEL ID',
    context: 'CTX LEN',
    maxOutput: 'MAX OUT',
    temp: 'TEMP',
    dimensions: 'DIMENSIONS',
    setAsDefault: 'SET AS DEFAULT',
    selectProvider: 'Select Provider',
    selectModel: 'Select Model',
    aceConfigTitle: 'ACE AGENT CONFIG',
    aceConfigDesc: 'Configure the Automated Cognitive Entity (ACE) agent workflow models.',
    fastModel: 'FAST MODEL (Chat/Router)',
    reflectorModel: 'REFLECTOR MODEL (Critique)',
    curatorModel: 'CURATOR MODEL (Summary)',
    fastModelDesc: 'High speed model for initial responses and routing (e.g., GPT-3.5, Haiku)',
    reflectorModelDesc: 'High reasoning model for self-correction and critique (e.g., GPT-4, Opus)',
    curatorModelDesc: 'Balanced model for summarization and final polish',
    aceNote: 'ACE Agent workflow requires multiple specialized models for optimal performance.',
    saveConfig: 'SAVE CONFIG',
    configSaved: 'SAVED!',
    warning: 'WARNING',
    confirmModify: 'Modify ACE Config?',
    confirmModifyDesc: 'Changing the core agent models may affect ongoing automated workflows.',
    llmConfig: 'LLM CONFIGURATION',
    themeDay: 'DAY MODE',
    themeNight: 'NIGHT MODE',
    themeModernDay: 'MODERN DAY',
    themeModernNight: 'MODERN NIGHT',
    themeClay: 'CLAY GLASS',
    themeBiolum: 'BIOLUMINESCENCE',
    changeTheme: 'Change Theme',
    changeLanguage: 'Change Language',
    searchPlaceholder: 'Search messages...',
    noMessagesFound: 'No messages found.',
    selectModelStart: 'Select a model to start.',
    online: 'ONLINE',
    deepThinking: 'Deep Thinking',
    thinkingProcess: 'Thinking Process',
    mascotConfig: 'MASCOT',
    mascotSystemPrompt: 'MASCOT SYSTEM PROMPT',
    mascotPromptPlaceholder: 'Define the personality of the pixel mascot...',
    interrupted: 'Interrupted by user.',
    default: 'DEFAULT',
    noModelsConfigured: 'No models configured. Please add a provider and model.',
    uploadImage: 'Upload Image',
    noModelSelected: 'No Model Selected',
    
    // MCP Translations
    mcp: 'MCP SERVERS',
    mcpDesc: 'Manage Model Context Protocol servers and tools.',
    mcpServers: 'SERVERS',
    addServer: 'ADD SERVER',
    serverStatus: 'STATUS',
    tools: 'TOOLS',
    command: 'COMMAND',
    args: 'ARGS (comma separated)',
    envVars: 'ENV VARIABLES (JSON)',
    restart: 'RESTART',
    running: 'RUNNING',
    stopped: 'STOPPED',
    error: 'ERROR',
    mcpStats: 'MCP SYSTEM STATS',
    uptime: 'UPTIME',
    totalTools: 'TOTAL TOOLS',

    // Backend Config Translations
    backend: 'BACKEND',
    backendDesc: 'Configure backend connection settings.',
    backendConfig: 'Backend Configuration',
    backendNote: 'These settings override environment variables. Changes take effect immediately.',
    resetToDefault: 'Reset to Default'
  },
  zh: {
    newChat: '新对话',
    history: '历史记录',
    configLlms: '配置模型',
    send: '发送',
    stop: '停止',
    currentChatModel: '当前对话模型',
    noChatModels: '未配置对话模型',
    typeMessage: '输入消息...',
    theme: '主题',
    language: '语言',
    generating: '生成中...',
    deleteSessionTitle: '删除会话?',
    deleteSessionConfirm: '确定要删除此会话吗？',
    deleteSessionDesc: '此操作无法撤销。',
    deleteAction: '删除',
    cancel: '取消',
    confirm: '确认',
    close: '关闭',
    saveFailed: '操作失败',
    saved: '已保存',
    providers: '服务商',
    models: '模型列表',
    aceAgent: 'ACE 代理',
    addProvider: '添加服务商',
    editProvider: '编辑服务商',
    saveProvider: '保存服务商',
    updateProvider: '更新服务商',
    deleteProviderConfirm: '删除此服务商及其所有模型？',
    addModel: '添加模型',
    editModel: '编辑模型',
    deleteModelConfirm: '删除此模型？',
    testConnection: '测试连接',
    testModel: '测试模型',
    testing: '测试中...',
    connectionSuccess: '连接成功',
    connectionFailed: '连接失败',
    latency: '延迟',
    name: '名称',
    type: '类型',
    apiBaseUrl: 'API 地址',
    apiKey: 'API 密钥',
    displayName: '显示名称',
    modelId: '模型 ID',
    context: '上下文长度',
    maxOutput: '最大输出',
    temp: '温度',
    dimensions: '维度',
    setAsDefault: '设为默认',
    selectProvider: '选择服务商',
    selectModel: '选择模型',
    aceConfigTitle: 'ACE 代理配置',
    aceConfigDesc: '配置自动认知实体 (ACE) 代理工作流模型。',
    fastModel: '快速模型 (对话/路由)',
    reflectorModel: '反思模型 (批评)',
    curatorModel: '策展模型 (总结)',
    fastModelDesc: '用于初始响应和路由的高速模型 (如 GPT-3.5, Haiku)',
    reflectorModelDesc: '用于自我修正和批评的高推理模型 (如 GPT-4, Opus)',
    curatorModelDesc: '用于总结和最终润色的平衡模型',
    aceNote: 'ACE 代理工作流需要多个专用模型以获得最佳性能。',
    saveConfig: '保存配置',
    configSaved: '已保存!',
    warning: '警告',
    confirmModify: '修改 ACE 配置?',
    confirmModifyDesc: '更改核心代理模型可能会影响正在进行的自动化工作流。',
    llmConfig: 'LLM 配置管理',
    themeDay: '日间模式',
    themeNight: '夜间模式',
    themeModernDay: '现代日间',
    themeModernNight: '现代夜间',
    themeClay: '粘土玻璃',
    themeBiolum: '生物发光',
    changeTheme: '切换主题',
    changeLanguage: '切换语言',
    searchPlaceholder: '搜索消息...',
    noMessagesFound: '未找到消息。',
    selectModelStart: '选择一个模型开始。',
    online: '在线',
    deepThinking: '深度思考',
    thinkingProcess: '思考过程',
    mascotConfig: '吉祥物',
    mascotSystemPrompt: '吉祥物系统提示词',
    mascotPromptPlaceholder: '定义像素吉祥物的性格...',
    interrupted: '用户已中断。',
    default: '默认',
    noModelsConfigured: '未配置模型。请添加服务商和模型。',
    uploadImage: '上传图片',
    noModelSelected: '未选择模型',
    
    // MCP Translations
    mcp: 'MCP 服务器',
    mcpDesc: '管理 Model Context Protocol 服务器与工具。',
    mcpServers: '服务器列表',
    addServer: '添加服务器',
    serverStatus: '状态',
    tools: '工具',
    command: '启动命令',
    args: '参数 (逗号分隔)',
    envVars: '环境变量 (JSON)',
    restart: '重启',
    running: '运行中',
    stopped: '已停止',
    error: '错误',
    mcpStats: 'MCP 系统统计',
    uptime: '运行时间',
    totalTools: '工具总数',

    // Backend Config Translations
    backend: '后端设置',
    backendDesc: '配置后端连接设置。',
    backendConfig: '后端配置',
    backendNote: '这些设置将覆盖环境变量。更改将立即生效。',
    resetToDefault: '重置为默认'
  },
  ja: {
    newChat: '新規チャット',
    history: '履歴',
    configLlms: 'LLM設定',
    send: '送信',
    stop: '停止',
    currentChatModel: '現在のモデル',
    noChatModels: 'モデル未設定',
    typeMessage: 'メッセージを入力...',
    theme: 'テーマ',
    language: '言語',
    generating: '生成中...',
    deleteSessionTitle: 'セッション削除?',
    deleteSessionConfirm: '本当に削除しますか？',
    deleteSessionDesc: 'この操作は取り消せません。',
    deleteAction: '削除',
    cancel: 'キャンセル',
    confirm: '確認',
    close: '閉じる',
    saveFailed: '操作失敗',
    saved: '保存しました',
    providers: 'プロバイダー',
    models: 'モデル',
    aceAgent: 'ACE エージェント',
    addProvider: 'プロバイダー追加',
    editProvider: 'プロバイダー編集',
    saveProvider: '保存',
    updateProvider: '更新',
    deleteProviderConfirm: 'このプロバイダーと全モデルを削除しますか？',
    addModel: 'モデル追加',
    editModel: 'モデル編集',
    deleteModelConfirm: 'このモデルを削除しますか？',
    testConnection: '接続テスト',
    testModel: 'モデルテスト',
    testing: 'テスト中...',
    connectionSuccess: '接続成功',
    connectionFailed: '接続失敗',
    latency: 'レイテンシ',
    name: '名前',
    type: 'タイプ',
    apiBaseUrl: 'API URL',
    apiKey: 'API キー',
    displayName: '表示名',
    modelId: 'モデル ID',
    context: 'コンテキスト長',
    maxOutput: '最大出力',
    temp: '温度',
    dimensions: '次元',
    setAsDefault: 'デフォルトに設定',
    selectProvider: 'プロバイダー選択',
    selectModel: 'モデル選択',
    aceConfigTitle: 'ACE エージェント設定',
    aceConfigDesc: '自動認知エンティティ (ACE) ワークフローモデルの設定。',
    fastModel: '高速モデル (チャット/ルーティング)',
    reflectorModel: 'リフレクターモデル (批評)',
    curatorModel: 'キュレーターモデル (要約)',
    fastModelDesc: '初期応答とルーティング用の高速モデル (例: GPT-3.5, Haiku)',
    reflectorModelDesc: '自己修正と批評用の高推論モデル (例: GPT-4, Opus)',
    curatorModelDesc: '要約と最終仕上げ用のバランスモデル',
    aceNote: 'ACE エージェントワークフローには、最適なパフォーマンスのために複数の特化モデルが必要です。',
    saveConfig: '設定保存',
    configSaved: '保存完了!',
    warning: '警告',
    confirmModify: 'ACE設定を変更?',
    confirmModifyDesc: 'コアエージェントモデルの変更は、進行中の自動化ワークフローに影響を与える可能性があります。',
    llmConfig: 'LLM 設定',
    themeDay: 'デイモード',
    themeNight: 'ナイトモード',
    themeModernDay: 'モダンデイ',
    themeModernNight: 'モダンナイト',
    themeClay: 'クレイグラス',
    themeBiolum: '生物発光',
    changeTheme: 'テーマ変更',
    changeLanguage: '言語変更',
    searchPlaceholder: 'メッセージ検索...',
    noMessagesFound: 'メッセージが見つかりません。',
    selectModelStart: 'モデルを選択して開始。',
    online: 'オンライン',
    deepThinking: '深い思考',
    thinkingProcess: '思考プロセス',
    mascotConfig: 'マスコット',
    mascotSystemPrompt: 'マスコットシステムプロンプト',
    mascotPromptPlaceholder: 'ピクセルマスコットの性格を定義...',
    interrupted: 'ユーザーによって中断されました。',
    default: 'デフォルト',
    noModelsConfigured: 'モデルが設定されていません。プロバイダーとモデルを追加してください。',
    uploadImage: '画像アップロード',
    noModelSelected: 'モデル未選択',
    
    // MCP Translations
    mcp: 'MCP サーバー',
    mcpDesc: 'Model Context Protocol サーバーとツールの管理。',
    mcpServers: 'サーバー一覧',
    addServer: 'サーバー追加',
    serverStatus: 'ステータス',
    tools: 'ツール',
    command: '起動コマンド',
    args: '引数 (カンマ区切り)',
    envVars: '環境変数 (JSON)',
    restart: '再起動',
    running: '実行中',
    stopped: '停止',
    error: 'エラー',
    mcpStats: 'MCP システム統計',
    uptime: '稼働時間',
    totalTools: 'ツール総数',

    // Backend Config Translations
    backend: 'バックエンド',
    backendDesc: 'バックエンド接続設定を設定します。',
    backendConfig: 'バックエンド設定',
    backendNote: 'これらの設定は環境変数を上回ります。変更は即座に有効になります。',
    resetToDefault: 'デフォルトにリセット'
  }
};
