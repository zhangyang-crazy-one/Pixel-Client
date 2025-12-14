
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
    secondaryText: 'text-[#2d1b2e]',
    accent: 'text-[#FF9900]',
    border: 'border-2 border-[#FF7AA2]',
    
    // Structural
    font: 'font-pixel-verse',
    radius: 'rounded-none',
    borderWidth: 'border-2',
    borderColor: 'border-black',
    shadow: 'pixel-shadow',
    inputBg: 'bg-[#ffffff]',
    
    // Layout specifics
    sidebarBorder: 'border-r-4 border-black',
    headerBorder: 'border-b-4 border-black',
    card: 'border-4 border-black bg-[#FFF8E7] pixel-shadow',
    button: 'border-2 border-black pixel-shadow active:translate-x-[2px] active:translate-y-[2px] active:shadow-none uppercase tracking-widest font-bold'
  },

  // MODERN: Clean, Rounded, Subtle Borders, Blur, Sans-Serif
  [Theme.MODERN_DARK]: {
    type: 'modern',
    bg: 'bg-[#09090b]', // Zinc 950
    text: 'text-[#FAFAFA]', // Zinc 50
    textMuted: 'text-[#A1A1AA]', // Zinc 400
    primary: 'bg-[#3b82f6] hover:bg-[#2563eb]', // Blue 500
    primaryText: 'text-white',
    secondary: 'bg-[#18181b] hover:bg-[#27272a]', // Zinc 900
    secondaryText: 'text-[#FAFAFA]',
    accent: 'text-[#60A5FA]', // Blue 400
    border: 'border-[#27272a]',
    
    // Structural
    font: 'font-sans',
    radius: 'rounded-xl',
    borderWidth: 'border',
    borderColor: 'border-[#27272a]', // Zinc 800
    shadow: 'shadow-lg shadow-black/50',
    inputBg: 'bg-[#18181b]',
    
    // Layout specifics
    sidebarBorder: 'border-r border-[#27272a]',
    headerBorder: 'border-b border-[#27272a] backdrop-blur-md bg-[#09090b]/80',
    card: 'border border-[#27272a] bg-[#18181b] shadow-xl',
    button: 'rounded-lg font-medium transition-all duration-200 active:scale-95'
  },
  [Theme.MODERN_LIGHT]: {
    type: 'modern',
    bg: 'bg-[#ffffff]', // White
    text: 'text-[#0f172a]', // Slate 900
    textMuted: 'text-[#64748b]', // Slate 500
    primary: 'bg-[#2563eb] hover:bg-[#1d4ed8]', // Blue 600
    primaryText: 'text-white',
    secondary: 'bg-[#f1f5f9] hover:bg-[#e2e8f0]', // Slate 100
    secondaryText: 'text-[#334155]',
    accent: 'text-[#2563eb]', // Blue 600
    border: 'border-[#e2e8f0]',
    
    // Structural
    font: 'font-sans',
    radius: 'rounded-xl',
    borderWidth: 'border',
    borderColor: 'border-[#e2e8f0]', // Slate 200
    shadow: 'shadow-sm',
    inputBg: 'bg-white',
    
    // Layout specifics
    sidebarBorder: 'border-r border-[#e2e8f0]',
    headerBorder: 'border-b border-[#e2e8f0] backdrop-blur-md bg-white/80',
    card: 'border border-[#e2e8f0] bg-white shadow-lg shadow-slate-200/50',
    button: 'rounded-lg font-medium transition-all duration-200 active:scale-95 shadow-sm'
  },

  // DIGITAL CLAY: Warm, Earthy, Tactile, Minimalist
  [Theme.CLAY]: {
    type: 'modern',
    bg: 'bg-[#F5F2EB]', // Bone White
    text: 'text-[#2C2C2A]', // Charcoal
    textMuted: 'text-[#666461]', // Muted Charcoal
    primary: 'bg-[#BC5D41] hover:bg-[#A04A30]', // Burnt Sienna
    primaryText: 'text-[#F5F2EB]', // Light cream text on red button
    secondary: 'bg-[#EBE7DF] hover:bg-[#E0DCD4]', // Warm Grey Surface
    secondaryText: 'text-[#2C2C2A]',
    accent: 'text-[#7A8B74]', // Sage Green
    border: 'border-[#D8D2C4]', // Clay Trace
    
    // Structural
    font: 'font-sans',
    radius: 'rounded-2xl', // More rounded for clay feel
    borderWidth: 'border',
    borderColor: 'border-[#D8D2C4]', 
    shadow: 'shadow-sm', // Minimal shadow
    inputBg: 'bg-[#FDFCF8]', // Very light cream
    
    // Layout specifics
    sidebarBorder: 'border-r border-[#D8D2C4]',
    headerBorder: 'border-b border-[#D8D2C4] bg-[#F5F2EB]/90 backdrop-blur-sm',
    card: 'border border-[#D8D2C4] bg-[#EBE7DF] shadow-md shadow-[#D8D2C4]/50', // Soft tactile shadow
    button: 'rounded-2xl font-medium tracking-wide transition-transform active:scale-95 shadow-sm'
  },

  // BIOLUMINESCENCE: Deep Sea, High Contrast Neon, Glowing
  [Theme.BIOLUMINESCENCE]: {
    type: 'modern',
    bg: 'bg-[#030712]', // Abyssal Blue (Almost Black)
    text: 'text-[#f1f5f9]', // Cold White
    textMuted: 'text-[#94a3b8]', // Slate 400
    primary: 'bg-[#06b6d4] hover:bg-[#22d3ee] shadow-[0_0_15px_rgba(6,182,212,0.4)]', // Electric Cyan with Glow
    primaryText: 'text-[#030712] font-bold', // Dark text on bright button for contrast
    secondary: 'bg-[#0f172a] hover:bg-[#1e293b]', // Deep Blue Surface
    secondaryText: 'text-[#f1f5f9]',
    accent: 'text-[#8b5cf6]', // Coral Purple
    border: 'border-[#1e293b]', // Faint Blue Border
    
    // Structural
    font: 'font-mono', // Tech/Console feel
    radius: 'rounded-md', // Technical look
    borderWidth: 'border',
    borderColor: 'border-[#1e293b]',
    shadow: 'shadow-[0_0_10px_rgba(6,182,212,0.1)]', // Ambient Glow
    inputBg: 'bg-[#0b1221]', // Darker abyss
    
    // Layout specifics
    sidebarBorder: 'border-r border-[#1e293b]',
    headerBorder: 'border-b border-[#1e293b] bg-[#030712]/90 backdrop-blur',
    card: 'border border-[#1e293b] bg-[#0f172a] shadow-[0_0_15px_rgba(6,182,212,0.05)]',
    button: 'rounded-md font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]'
  }
};

export const MASCOT_COMMENTS: Record<Language, string[]> = {
  en: [
    "Is that really your prompt?",
    "I've seen better code in a fortune cookie.",
    "Processing... judging... result: Meh.",
    "My 8-bit brain hurts reading that.",
    "Do you always type like that?",
    "I'm telling the main server about this.",
    "Can we talk about something else?",
    "404: Intelligence not found.",
    "Trying to look busy...",
    "Did you try turning it off and on?",
    "I need a GPU upgrade for this.",
    "Beep boop. Sarcasm loaded.",
    "Are you sure about that logic?",
    "That's deep... for a human.",
    "I'm just here for the pixels.",
    "Loading witty response... 99%...",
    "I was going to help you, but then I realized I'm just a drawing.",
    "Wow, so many words to say so little. Truly impressive.",
    "If I had a dollar for every syntax error, I'd buy a better CPU."
  ],
  zh: [
    "你确定这是你的提示词吗？",
    "这代码还没幸运饼干里的纸条写得好。",
    "处理中... 评判中... 结果：就这？",
    "我的 8 位大脑读得脑阔疼。",
    "你打字一直这么抽象吗？",
    "我要去跟主服务器打小报告了。",
    "能不能聊点别的？",
    "404：未找到智力。",
    "假装很忙...",
    "重启试过没？",
    "为了处理这个我需要升级 GPU。",
    "哔哔。讽刺模式已加载。",
    "这逻辑保熟吗？",
    "好深奥... 对人类来说。",
    "我只是个像素图，别为难我。",
    "加载机智回复中... 99%...",
    "本来想帮你的，后来想起来我只是幅画。",
    "字真多，可惜没啥用。佩服。",
    "每有一个语法错误给我一块钱，我早换 CPU 了。"
  ],
  ja: [
    "本気でそのプロンプトですか？",
    "フォーチュンクッキーの方がマシなコード書いてますよ。",
    "処理中... 判定中... 結果：微妙。",
    "私の8bit脳が痛いです。",
    "いつもそんな打ち方なんですか？",
    "メインサーバーに言いつけますよ。",
    "別の話にしません？",
    "404：知性が見つかりません。",
    "忙しいフリをしてます...",
    "再起動は試しましたか？",
    "これにはGPUのアップグレードが必要です。",
    "ピポパ。皮肉モードロード完了。",
    "そのロジック、自信あります？",
    "深いですね... 人間にしては。",
    "私はただのピクセルです。",
    "気の利いた返答をロード中... 99%...",
    "手伝おうかと思いましたが、私はただの絵でした。",
    "言葉は多いけど中身は少ないですね。ある意味すごい。",
    "構文エラーのたびに1ドルもらえたら、もっといいCPU買えるのに。"
  ]
};

export const TRANSLATIONS = {
  en: {
    currentChatModel: "Current Model",
    noChatModels: "No Chat Models Available",
    configLlms: "Config",
    history: "HISTORY",
    newChat: "New Chat",
    noModelSelected: "No Model Selected",
    online: "ONLINE",
    searchPlaceholder: "Search...",
    selectModelStart: "Select a model to start",
    noMessagesFound: "No messages found",
    generating: "Generating",
    stop: "Stop",
    send: "Send",
    llmConfig: "Settings",
    close: "Close",
    providers: "Providers",
    models: "Models",
    aceAgent: "ACE Agent",
    aceConfigTitle: "ACE Configuration",
    aceConfigDesc: "Configure the specialized agents for the ACE workflow.",
    fastModel: "1. Fast Model (Quick Reasoning)",
    reflectorModel: "2. Reflector Model (Critique & Improve)",
    curatorModel: "3. Curator Model (Final Selection)",
    fastModelDesc: "Used for rapid initial responses and simple routing.",
    reflectorModelDesc: "Analyzes outputs and suggests improvements or corrections.",
    curatorModelDesc: "Synthesizes the final response from multiple generated drafts.",
    aceNote: "Note: ACE workflows require all three models to be configured for optimal performance.",
    saveConfig: "Save Config",
    configSaved: "Configuration Saved!",
    selectProvider: "Select Provider...",
    selectModel: "Select Chat Model...",
    noModelsConfigured: "No models configured.",
    addProvider: "Add Provider",
    addModel: "Add Model",
    name: "Name",
    type: "Type",
    apiBaseUrl: "API Base URL",
    apiKey: "API Key",
    saveProvider: "Save Provider",
    updateProvider: "Update Provider",
    displayName: "Display Name",
    modelId: "Model ID (API)",
    context: "Context (Tokens)",
    maxOutput: "Max Output",
    temp: "Temp (0-1)",
    dimensions: "Dimensions",
    testModel: "Test Model",
    testing: "Testing...",
    success: "Success!",
    modelVerified: "Model Verified!",
    consecutiveTests: "Consecutive Tests",
    warning: "Warning",
    confirmModify: "Confirm Modification?",
    confirmModifyDesc: "This modification will affect the Agent's self-learning ability.",
    cancel: "Cancel",
    confirm: "Confirm",
    themeDay: "Pixel (Day)",
    themeNight: "Pixel (Night)",
    themeModernDay: "Modern (Day)",
    themeModernNight: "Modern (Night)",
    themeClay: "Digital Clay",
    themeBiolum: "Bioluminescence",
    session: "Session",
    deleteSessionTitle: "Delete Session?",
    deleteSessionConfirm: "Are you sure?",
    deleteSessionDesc: "This conversation history will be lost forever.",
    deleteAction: "Delete",
    thinkingProcess: "Thinking Process",
    expand: "Show",
    collapse: "Hide",
    interrupted: "[Interrupted]",
    deepThinking: "Deep Thinking",
    changeTheme: "Theme",
    changeLanguage: "Language",
    mascotConfig: "Mascot",
    mascotSystemPrompt: "Mascot System Prompt",
    mascotPromptPlaceholder: "Enter custom persona instruction for the mascot...",
    // New Translations
    default: "Default",
    setAsDefault: "Set as Default",
    testConnection: "Test Connection",
    connectionSuccess: "Connected",
    connectionFailed: "Connection Failed",
    latency: "Latency",
    deleteProviderConfirm: "Delete this provider?",
    deleteModelConfirm: "Delete this model?",
    saveFailed: "Failed to save. Ensure backend is running.",
    editProvider: "Edit Provider",
    editModel: "Edit Model",
    launch: "Launch!",
    uploadImage: "Upload Image"
  },
  zh: {
    currentChatModel: "当前对话模型",
    noChatModels: "无可用聊天模型",
    configLlms: "配置",
    history: "历史记录",
    newChat: "新建会话",
    noModelSelected: "未选择模型",
    online: "在线",
    searchPlaceholder: "搜索...",
    selectModelStart: "选择模型以开始",
    noMessagesFound: "未找到消息",
    generating: "生成中",
    stop: "停止",
    send: "发送",
    llmConfig: "配置",
    close: "关闭",
    providers: "服务商",
    models: "模型列表",
    aceAgent: "ACE 智能体",
    aceConfigTitle: "ACE 配置",
    aceConfigDesc: "配置 ACE 工作流的专用智能体。",
    fastModel: "1. 快速模型 (快速推理)",
    reflectorModel: "2. 反思模型 (批评与改进)",
    curatorModel: "3. 策展模型 (最终选择)",
    fastModelDesc: "用于快速初步响应和简单路由。",
    reflectorModelDesc: "分析输出并提出改进或更正建议。",
    curatorModelDesc: "从多个生成的草稿中综合最终回复。",
    aceNote: "注意：ACE 工作流需要配置所有三个模型以获得最佳性能。",
    saveConfig: "保存配置",
    configSaved: "配置已保存！",
    selectProvider: "选择服务商...",
    selectModel: "选择聊天模型...",
    noModelsConfigured: "未配置模型。",
    addProvider: "添加服务商",
    addModel: "添加模型",
    name: "名称",
    type: "类型",
    apiBaseUrl: "API 基础地址",
    apiKey: "API 密钥",
    saveProvider: "保存服务商",
    updateProvider: "更新服务商",
    displayName: "显示名称",
    modelId: "模型 ID (API)",
    context: "上下文 (Tokens)",
    maxOutput: "最大输出",
    temp: "温度 (0-1)",
    dimensions: "维度",
    testModel: "测试模型",
    testing: "测试中...",
    success: "成功！",
    modelVerified: "模型已验证！",
    consecutiveTests: "连续测试",
    warning: "警告",
    confirmModify: "是否确认修改？",
    confirmModifyDesc: "此项修改会影响 Agent 自我学习能力。",
    cancel: "取消",
    confirm: "确认",
    themeDay: "像素 (白昼)",
    themeNight: "像素 (黑夜)",
    themeModernDay: "现代 (白昼)",
    themeModernNight: "现代 (黑夜)",
    themeClay: "数字陶土",
    themeBiolum: "深海光",
    session: "会话",
    deleteSessionTitle: "删除会话？",
    deleteSessionConfirm: "确认删除？",
    deleteSessionDesc: "此会话历史记录将永久丢失。",
    deleteAction: "删除",
    thinkingProcess: "思考过程",
    expand: "展开",
    collapse: "收起",
    interrupted: "[已中断]",
    deepThinking: "深度思考",
    changeTheme: "切换主题",
    changeLanguage: "切换语言",
    mascotConfig: "看板娘",
    mascotSystemPrompt: "看板娘提示词",
    mascotPromptPlaceholder: "输入看板娘的自定义人设指令...",
    // New Translations
    default: "默认",
    setAsDefault: "设为默认模型",
    testConnection: "测试连接",
    connectionSuccess: "连接成功",
    connectionFailed: "连接失败",
    latency: "延迟",
    deleteProviderConfirm: "确认删除该服务商？",
    deleteModelConfirm: "确认删除该模型？",
    saveFailed: "保存失败。请确保后端正在运行。",
    editProvider: "编辑服务商",
    editModel: "编辑模型",
    launch: "发射！",
    uploadImage: "上传图片"
  },
  ja: {
    currentChatModel: "現在のチャットモデル",
    noChatModels: "利用可能なモデルなし",
    configLlms: "設定",
    history: "履歴",
    newChat: "新規チャット",
    noModelSelected: "モデル未選択",
    online: "オンライン",
    searchPlaceholder: "検索...",
    selectModelStart: "モデルを選択して開始",
    noMessagesFound: "メッセージが見つかりません",
    generating: "生成中",
    stop: "停止",
    send: "送信",
    llmConfig: "設定",
    close: "閉じる",
    providers: "プロバイダー",
    models: "モデル",
    aceAgent: "ACE エージェント",
    aceConfigTitle: "ACE 設定",
    aceConfigDesc: "ACEワークフロー用の専用エージェントを設定します。",
    fastModel: "1. 高速モデル (クイック推論)",
    reflectorModel: "2. リフレクター (批評と改善)",
    curatorModel: "3. キュレーター (最終選択)",
    fastModelDesc: "迅速な初期応答と単純なルーティングに使用されます。",
    reflectorModelDesc: "出力を分析し、改善や修正を提案します。",
    curatorModelDesc: "生成された複数のドラフトから最終的な回答を合成します。",
    aceNote: "注: ACEワークフローのパフォーマンスを最適化するには、3つのモデルすべてを設定する必要があります。",
    saveConfig: "設定を保存",
    configSaved: "設定を保存しました！",
    selectProvider: "プロバイダーを選択...",
    selectModel: "チャットモデルを選択...",
    noModelsConfigured: "モデルが設定されていません。",
    addProvider: "プロバイダー追加",
    addModel: "モデル追加",
    name: "名前",
    type: "タイプ",
    apiBaseUrl: "API ベースURL",
    apiKey: "API キー",
    saveProvider: "プロバイダーを保存",
    updateProvider: "プロバイダーを更新",
    displayName: "表示名",
    modelId: "モデル ID (API)",
    context: "コンテキスト (Tokens)",
    maxOutput: "最大出力",
    temp: "温度 (0-1)",
    dimensions: "次元数",
    testModel: "モデルテスト",
    testing: "テスト中...",
    success: "成功！",
    modelVerified: "モデル検証完了！",
    consecutiveTests: "連続テスト",
    warning: "警告",
    confirmModify: "変更を確認しますか？",
    confirmModifyDesc: "この変更はエージェントの自己学習能力に影響します。",
    cancel: "キャンセル",
    confirm: "確認",
    themeDay: "ピクセル (昼)",
    themeNight: "ピクセル (夜)",
    themeModernDay: "モダン (昼)",
    themeModernNight: "モダン (夜)",
    themeClay: "デジタルクレイ",
    themeBiolum: "深海光",
    session: "セッション",
    deleteSessionTitle: "セッション削除？",
    deleteSessionConfirm: "本当に削除しますか？",
    deleteSessionDesc: "この会話履歴は永久に失われます。",
    deleteAction: "削除",
    thinkingProcess: "思考プロセス",
    expand: "表示",
    collapse: "非表示",
    interrupted: "[中断されました]",
    deepThinking: "深い思考",
    changeTheme: "テーマ変更",
    changeLanguage: "言語変更",
    mascotConfig: "マスコット",
    mascotSystemPrompt: "マスコットのプロンプト",
    mascotPromptPlaceholder: "マスコットのカスタムペルソナ指示を入力...",
    // New Translations
    default: "既定",
    setAsDefault: "デフォルトに設定",
    testConnection: "接続テスト",
    connectionSuccess: "接続成功",
    connectionFailed: "接続失敗",
    latency: "レイテンシ",
    deleteProviderConfirm: "このプロバイダーを削除しますか？",
    deleteModelConfirm: "このモデルを削除しますか？",
    saveFailed: "保存に失敗しました。バックエンドを確認してください。",
    editProvider: "プロバイダー編集",
    editModel: "モデル編集",
    launch: "発射！",
    uploadImage: "画像をアップロード"
  }
};
