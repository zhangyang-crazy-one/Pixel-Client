
import { LLMProvider, LLMModel, Theme, AceConfig, Language } from './types';
import React from 'react';

// ApexBridge Configuration
export const API_BASE_URL = 'http://localhost:3000';
export const API_KEY = 'sk-apex-bridge-key'; // Replace with your actual bridge key

export const INITIAL_PROVIDERS: LLMProvider[] = []; 
export const INITIAL_MODELS: LLMModel[] = []; 

export const INITIAL_ACE_CONFIG: AceConfig = {
  fastModelId: '',
  reflectorModelId: '',
  curatorModelId: ''
};

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
     React.createElement("path", { d: "M12 2L2 8l10 6 10-6-10-6zm0 2.8l6 3.6-6 3.6-6-3.6 6-3.6zM2 10v6l10 6 10-6v-6L12 16 2 10z" })
  ),
  qwen: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
      React.createElement("circle", { cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "2", fill: "none" }),
      React.createElement("path", { d: "M8 12h8M12 8v8", stroke: "currentColor", strokeWidth: "2" })
  ),
  zhipu: React.createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", className: "w-full h-full" },
     React.createElement("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" })
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
    secondaryText: 'text-[#2d1