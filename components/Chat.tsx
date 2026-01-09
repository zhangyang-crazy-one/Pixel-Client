
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Theme, Message, LLMModel, LLMProvider, Language } from '../types';
import { PixelButton, PixelBadge } from './PixelUI';
import { THEME_STYLES, TRANSLATIONS } from '../constants';
import { Send, Copy, Check, Moon, Sun, Star, Cpu, Globe, Palette, Loader2, Brain, ChevronDown, ChevronRight, BrainCircuit, Play, Maximize, FileCode, Box, Terminal, Laptop, Coffee, Zap, Paperclip, X, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { MermaidBlock } from './MermaidBlock';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

interface ChatProps {
  theme: Theme;
  language: Language;
  messages: Message[];
  activeModel: LLMModel | null;
  provider: LLMProvider | null;
  onSendMessage: (msg: Message, options?: { deepThinkingEnabled: boolean }) => void;
  onUpdateMessage: (id: string, content: string) => void;
  setMascotState: (state: 'idle' | 'thinking' | 'happy' | 'shocked') => void;
  onTriggerRainbow: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  isMoonlightUnlocked: boolean;
  searchQuery?: string;
  onStop?: () => void;
  isStreaming?: boolean;
}

const CopyButton: React.FC<{ content: string }> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      className={cn(
        "transition-all duration-200 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800",
        copied ? 'text-green-500 scale-110 opacity-100' : 'opacity-40 hover:opacity-100'
      )} 
      onClick={handleCopy} 
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? <Check size={14}/> : <Copy size={14}/>}
    </button>
  );
};

const MediaFrame: React.FC<{ theme: Theme; children: React.ReactNode; label: string; icon: React.ReactNode }> = ({ theme, children, label, icon }) => {
    const styles = THEME_STYLES[theme];
    const isPixel = styles.type === 'pixel';
    
    return (
        <div className={cn(
            "my-4 overflow-hidden border bg-background shadow-sm",
            isPixel ? styles.borderWidth + " " + styles.borderColor + " " + styles.radius : "rounded-lg border-slate-200 dark:border-slate-800"
        )}>
            <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold border-b",
                isPixel ? styles.borderColor + " " + styles.secondary : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            )}>
                {icon}
                <span className="uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <div className="relative">
                {children}
            </div>
        </div>
    );
};

interface HtmlPreviewBlockProps {
    code: string;
    theme: Theme;
    defaultPreview?: boolean;
}

const HtmlPreviewBlock: React.FC<HtmlPreviewBlockProps> = ({ code, theme, defaultPreview = false }) => {
    const [showPreview, setShowPreview] = useState(defaultPreview);
    const styles = THEME_STYLES[theme];
    const isPixel = styles.type === 'pixel';
    
    return (
        <div className={cn(
            "my-4 overflow-hidden border shadow-sm",
            isPixel ? styles.borderWidth + " " + styles.borderColor + " " + styles.radius : "rounded-lg border-slate-200 dark:border-slate-800"
        )}>
             <div className="flex justify-between items-center bg-[#1e1e1e] text-slate-400 px-3 py-1.5 text-[10px] border-b border-white/5 font-bold font-mono">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                    </div>
                    <span className="ml-2 uppercase tracking-tight">Preview</span>
                </div>
                <button 
                    onClick={() => setShowPreview(!showPreview)} 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                    {showPreview ? <FileCode size={12} /> : <Maximize size={12} />}
                    {showPreview ? "CODE" : "RUN"}
                </button>
            </div>
            
            {showPreview ? (
                 <div className="bg-white w-full h-[500px] relative overflow-auto">
                     <iframe 
                        srcDoc={code}
                        className="w-full h-full border-none"
                        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-same-origin"
                        title="HTML Preview"
                     />
                 </div>
            ) : (
                <div className="max-h-[500px] overflow-auto">
                    <SyntaxHighlighter
                        style={vscDarkPlus}
                        language="html"
                        PreTag="div"
                        customStyle={{ 
                            margin: 0, 
                            borderRadius: 0, 
                            fontSize: '13px', 
                            lineHeight: '1.6',
                            background: '#1e1e1e' 
                        }}
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            )}
        </div>
    );
};

const MarkdownRenderer: React.FC<{ text: string; theme: Theme }> = React.memo(({ text, theme }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
                style: () => null,
                script: () => null,
                link: () => null,
                meta: () => null,
                head: () => null,
                iframe: () => null, 
                p: ({children}: any) => <p className="mb-3 leading-7 break-words whitespace-pre-wrap">{children}</p>,
                a: ({node, href, children, ...props}: any) => <a href={href as string} className="text-blue-500 hover:text-blue-600 underline underline-offset-4 break-all" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>,
                code: ({node, inline, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match ? match[1] : '';
                    if (!inline && lang === 'mermaid') return <MermaidBlock code={String(children).replace(/\n$/, '')} theme={theme} />;
                    if (!inline && lang === 'html') return <HtmlPreviewBlock code={String(children).replace(/\n$/, '')} theme={theme} />;
                    if (!inline && match) {
                        return (
                            <div className={cn(
                                "my-4 overflow-hidden border shadow-sm",
                                THEME_STYLES[theme].type === 'pixel' ? "border-black" : "rounded-lg border-slate-200 dark:border-slate-800"
                            )}>
                                <div className="flex justify-between items-center bg-[#1e1e1e] text-slate-400 px-3 py-1.5 text-[10px] border-b border-white/5 font-bold font-mono">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                                    </div>
                                    <span className="uppercase ml-2 tracking-widest">{lang}</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={lang}
                                        PreTag="div"
                                        customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px', lineHeight: '1.6', background: '#1e1e1e' }}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                        );
                    }
                    return <code className={cn("rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-sm", className)} {...props}>{children}</code>;
                }
            } as any}
        >
            {text}
        </ReactMarkdown>
    );
});

const ToolDetails: React.FC<{ content: string; theme: Theme; language: Language; index: number }> = React.memo(({ content, theme, language, index }) => {
     const { params, error } = useMemo(() => {
        try {
            let safeContent = content;
            if (!content.includes('</tool_action>') && content.startsWith('<tool_action')) safeContent += '</tool_action>';
            if (!content.includes('</action>') && content.startsWith('<action')) safeContent += '</action>';
            const parser = new DOMParser();
            const doc = parser.parseFromString(safeContent, "text/xml");
            if (doc.querySelector("parsererror")) return { params: [], error: 'Parsing Error' };
            const root = doc.querySelector("tool_action") || doc.querySelector("action");
            if (!root) return { params: [], error: 'Invalid XML' };
            const extractedParams: { key: string, attrs: Record<string,string>, value: string }[] = [];
            Array.from(root.children).forEach(child => {
                const attrs: Record<string, string> = {};
                Array.from(child.attributes).forEach(attr => attrs[attr.name] = attr.value);
                extractedParams.push({ key: child.tagName, attrs, value: child.textContent || '' });
            });
            return { params: extractedParams, error: null };
        } catch (e) { return { params: [], error: String(e) }; }
    }, [content]);

    return (
        <div className="p-3 bg-slate-50/80 dark:bg-slate-900/80 rounded-md border border-slate-100 dark:border-slate-800 shadow-inner">
            <div className="text-[9px] uppercase font-bold opacity-30 mb-2 tracking-[0.2em]">Sequence No.{index + 1}</div>
            <div className="space-y-3">
                {error ? <div className="text-red-500 text-xs flex items-center gap-2 font-mono"><AlertCircle size={12}/> {error}</div> : 
                params.length === 0 ? <span className="opacity-40 italic text-xs">Void Request</span> : 
                params.map((p, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5 text-xs font-mono">
                         <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                             <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800/30">{p.key}</span>
                             {Object.entries(p.attrs).map(([k, v]) => (
                                 <span key={k} className="flex items-center">
                                     <span className="text-violet-600 dark:text-violet-400">{k}</span>
                                     <span className="mx-0.5 opacity-30">=</span>
                                     <span className="text-emerald-600 dark:text-emerald-400">"{v}"</span>
                                 </span>
                             ))}
                         </div>
                         {p.value && (
                             <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 py-1 text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                 {p.value}
                             </div>
                         )}
                    </div>
                ))}
            </div>
        </div>
    );
});

const ToolActionBlock: React.FC<{ 
    name: string; 
    count: number; 
    rawContents: string[]; 
    theme: Theme; 
    language?: Language;
    state: 'running' | 'success' | 'failed';
    toolType?: 'skill' | 'mcp' | 'builtin';
}> = React.memo(({ name, count, rawContents, theme, language = 'en', state, toolType = 'mcp' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const styles = THEME_STYLES[theme];
    const isPixel = styles.type === 'pixel';

    const visualConfig = useMemo(() => {
        const isRunning = state === 'running';
        const isFailed = state === 'failed';
        
        let config = {
            baseColor: 'blue',
            glow: 'shadow-blue-500/10',
            icon: <Box size={14} />,
            label: language === 'zh' ? 'MCP 工具' : 'MCP EXTENSION'
        };

        if (toolType === 'skill') {
            config = {
                baseColor: 'violet',
                glow: 'shadow-violet-500/20',
                icon: <Star size={14} />,
                label: language === 'zh' ? '技能执行' : 'ADVANCED SKILL'
            };
        } else if (toolType === 'builtin') {
            config = {
                baseColor: 'emerald',
                glow: 'shadow-emerald-500/10',
                icon: <Cpu size={14} />,
                label: language === 'zh' ? '系统内置' : 'SYSTEM BUILTIN'
            };
        }

        // 状态覆盖逻辑
        // 修正：使用显式的 border-l 颜色类，确保左侧边框颜色与文字配色一致
        let accentBorderClass = '';
        if (config.baseColor === 'violet') accentBorderClass = 'border-l-violet-500';
        else if (config.baseColor === 'emerald') accentBorderClass = 'border-l-emerald-500';
        else accentBorderClass = 'border-l-blue-500';

        let borderClass = isPixel ? 'border-black' : 'border-slate-200 dark:border-slate-800';
        let bgClass = `bg-${config.baseColor}-500/5`;
        let iconColor = `text-${config.baseColor}-500`;

        if (isRunning) {
            accentBorderClass = "border-l-blue-500";
            borderClass = "border-blue-500/30 bg-blue-500/10 animate-pulse";
            iconColor = "text-blue-500";
        } else if (isFailed) {
            accentBorderClass = "border-l-red-500";
            borderClass = "border-red-500/40 bg-red-500/5";
            iconColor = "text-red-500";
            config.icon = <AlertCircle size={14} />;
        }

        return { ...config, borderClass, accentBorderClass, bgClass, iconColor, isRunning, isFailed };
    }, [state, language, toolType, isPixel]);

    const stateBadge = useMemo(() => {
        const t_map = {
            zh: { running: '执行中', success: '完成', failed: '异常' },
            en: { running: 'Active', success: 'Done', failed: 'Error' }
        };
        const lang_t = t_map[language as 'zh'|'en'] || t_map.en;
        const colors = {
            running: 'bg-blue-500/10 text-blue-600 border-blue-200',
            success: 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent',
            failed: 'bg-red-500 text-white border-transparent'
        };
        return <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border", colors[state])}>{lang_t[state]}</span>;
    }, [state, language]);

    return (
        <div className={cn(
            "my-3 border transition-all duration-300 overflow-hidden",
            isPixel ? styles.radius + " border-l-4" : "rounded-xl border-l-4 shadow-sm",
            visualConfig.borderClass,
            visualConfig.accentBorderClass,
            visualConfig.glow,
            isExpanded ? "shadow-md" : ""
        )}>
           <div 
             onClick={() => setIsExpanded(!isExpanded)}
             className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
           >
              <div className="flex items-center gap-4">
                 <div className={cn("p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-sm transition-transform duration-300", isExpanded && "scale-110", visualConfig.iconColor)}>
                    {visualConfig.icon}
                 </div>
                 <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-sm tracking-tight", visualConfig.isRunning ? 'text-blue-500' : visualConfig.isFailed ? 'text-red-500' : visualConfig.iconColor)}>
                            {name}
                        </span>
                        {count > 1 && <span className="text-[10px] bg-slate-900 dark:bg-slate-50 text-slate-50 dark:text-slate-900 px-1.5 rounded-full font-mono">x{count}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.15em] opacity-40 font-black">
                        {visualConfig.label}
                    </div>
                 </div>
              </div>
              <div className="flex items-center gap-4">
                 {stateBadge}
                 <div className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "opacity-30")}>
                    <ChevronDown size={16}/>
                 </div>
              </div>
           </div>
           {isExpanded && (
               <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 bg-white/20 dark:bg-slate-950/20 animate-in slide-in-from-top-1 duration-300">
                   <div className="h-2"></div>
                   {rawContents.map((content, idx) => (
                       <ToolDetails key={idx} content={content} index={idx} theme={theme} language={language} />
                   ))}
               </div>
           )}
        </div>
    );
});

const ThinkingBlock: React.FC<{ content: string; theme: Theme; language: Language }> = React.memo(({ content, theme, language }) => {
    const [isOpen, setIsOpen] = useState(false);
    const t = TRANSLATIONS[language];
    const styles = THEME_STYLES[theme];
    const isPixel = styles.type === 'pixel';

    return (
        <div className={cn(
            "my-4 border border-dashed transition-all duration-500 group",
            isPixel ? styles.borderColor + " " + styles.radius : "rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30",
            isOpen ? "border-solid bg-slate-50/50 dark:bg-slate-900/50" : "hover:border-slate-400"
        )}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
                <div className={cn("p-1.5 rounded-md border border-transparent transition-all", isOpen ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500")}>
                    <Brain size={16} />
                </div>
                <span className="flex-1 text-left">{t.thinkingProcess}</span>
                <div className={cn("transition-transform duration-500", isOpen ? "rotate-180 opacity-100" : "opacity-30")}>
                    <ChevronDown size={14} />
                </div>
            </button>
            {isOpen && (
                <div className="px-5 pb-5 pt-0 text-sm border-t border-dashed border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-500">
                   <div className="h-4"></div>
                   <MarkdownRenderer text={content} theme={theme} />
                </div>
            )}
        </div>
    );
});

const parseMessageContent = (content: string, theme: Theme, language: Language, isStreamingMessage: boolean) => {
    const regex = /(<thinking>[\s\S]*?(?:<\/thinking>|$)|<tool_action[\s\S]*?(?:<\/tool_action>|$)|<action[\s\S]*?(?:<\/action>|$))/gi;
    const parts = content.split(regex);
    const renderedNodes: React.ReactNode[] = [];
    let pendingTools: string[] = [];
    let currentToolName = '';
    let currentToolType: 'skill' | 'mcp' | 'builtin' = 'mcp';

    const flushTools = (isFinal: boolean) => {
        if (pendingTools.length > 0) {
            const isFailed = pendingTools.some(t => t.toLowerCase().includes('error') || t.toLowerCase().includes('fail'));
            let state: 'running' | 'success' | 'failed' = 'success';
            if (isFinal && isStreamingMessage) state = 'running';
            else if (isFailed) state = 'failed';
            renderedNodes.push(<ToolActionBlock key={`tool-group-${renderedNodes.length}`} name={currentToolName} count={pendingTools.length} rawContents={[...pendingTools]} theme={theme} language={language} state={state} toolType={currentToolType} />);
            pendingTools = []; currentToolName = ''; currentToolType = 'mcp';
        }
    };

    parts.forEach((part, index) => {
        if (!part.trim()) return;
        if (part.startsWith('<tool_action') || part.startsWith('<action')) {
            const nameMatch = part.match(/name=['"]([^'"]+)['"]/);
            const typeMatch = part.match(/type=['"]([^'"]+)['"]/);
            const name = nameMatch ? nameMatch[1] : 'Unknown';
            const type = (typeMatch ? typeMatch[1] : 'mcp') as any;
            if (currentToolName && (name !== currentToolName || type !== currentToolType)) flushTools(false);
            currentToolName = name; currentToolType = ['skill', 'mcp', 'builtin'].includes(type) ? type : 'mcp';
            pendingTools.push(part);
        } else {
            flushTools(false);
            if (part.startsWith('<thinking')) {
                const inner = part.replace(/^<thinking>/i, '').replace(/<\/thinking>$/i, '');
                renderedNodes.push(<ThinkingBlock key={`think-${index}`} content={inner} theme={theme} language={language} />);
            } else {
                renderedNodes.push(<div key={`md-${index}`} className="markdown-body break-words w-full overflow-x-auto"><MarkdownRenderer text={part} theme={theme} /></div>);
            }
        }
    });
    flushTools(true);
    return renderedNodes;
};

interface MessageBubbleProps {
    msg: Message;
    theme: Theme;
    language: Language;
    isStreaming: boolean;
    isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ msg, theme, language, isStreaming, isLast }) => {
    const styles = THEME_STYLES[theme];
    const isModern = styles.type === 'modern';
    const isUser = msg.role === 'user';
    
    const bubbleClass = cn(
        "p-4 border transition-all duration-300 min-w-0 shadow-sm",
        isUser ? (isModern ? "rounded-2xl rounded-tr-sm bg-slate-900 text-white border-slate-800" : styles.primary + " " + styles.primaryText + " " + styles.radius + " " + styles.borderColor) 
               : (isModern ? "rounded-2xl rounded-tl-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" : styles.secondary + " " + styles.text + " " + styles.radius + " " + styles.borderColor),
    );

    const hasThinking = useMemo(() => msg.content?.includes('<thinking>'), [msg.content]);
    const hasTool = useMemo(() => msg.content?.includes('<tool_action') || msg.content?.includes('<action'), [msg.content]);
    const isHtml = useMemo(() => { const t = msg.content.trim(); return /^\s*<!DOCTYPE html>/i.test(t) || /^\s*<html/i.test(t); }, [msg.content]);
    const isWide = !isUser && (hasThinking || hasTool || isHtml);

    return (
        <div className={cn("flex w-full animate-in slide-in-from-bottom-3 duration-500", isUser ? 'justify-end' : 'justify-start')}>
          <div className={cn(isWide ? 'max-w-full md:max-w-[95%] w-full' : 'max-w-[90%] md:max-w-[80%]', bubbleClass)}>
            <div className="flex justify-between items-center mb-3 gap-2 border-b border-black/5 dark:border-white/5 pb-2">
              <span className="text-[9px] font-black uppercase tracking-[0.25em] opacity-30">
                {msg.role} {msg.modelId && `• ${msg.modelId}`}
              </span>
              {!isUser && msg.content && <CopyButton content={msg.content} />}
            </div>
            {isUser && msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {msg.images.map((img, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-white/20 shadow-lg">
                            <img src={img.startsWith('data:') ? img : `data:image/png;base64,${img}`} alt="User" className="max-w-full h-auto max-h-[400px] object-contain" />
                        </div>
                    ))}
                </div>
            )}
            <div className={cn("leading-relaxed text-sm break-words min-w-0", styles.font)}>
              {isUser ? <div className="whitespace-pre-wrap">{msg.content}</div> : 
               msg.content ? (isHtml ? <HtmlPreviewBlock code={msg.content} theme={theme} defaultPreview={true} /> : parseMessageContent(msg.content, theme, language, isStreaming && isLast)) : 
               <div className="flex items-center gap-2 py-2 opacity-50"><Loader2 size={16} className="animate-spin" /><span>Thinking...</span></div>}
              {isStreaming && isLast && msg.content && !isUser && <span className="inline-block w-1.5 h-4 bg-blue-500 ml-1 animate-pulse align-middle"></span>}
            </div>
          </div>
        </div>
    );
});

export const Chat: React.FC<ChatProps> = ({ 
  theme, language, messages, activeModel, provider,
  onSendMessage, onUpdateMessage, setMascotState, onTriggerRainbow,
  setTheme, setLanguage, isMoonlightUnlocked, searchQuery = '', onStop,
  isStreaming: externalIsStreaming = false
}) => {
  const [input, setInput] = useState('');
  const [localIsStreaming, setLocalIsStreaming] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isDeepThinkingEnabled, setIsDeepThinkingEnabled] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isStreaming = externalIsStreaming || localIsStreaming;
  const scrollRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true); 

  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];
  const isMultimodal = activeModel?.type === 'multimodal';

  useEffect(() => {
      const h = (e: MouseEvent) => {
          if (showThemeMenu && themeRef.current && !themeRef.current.contains(e.target as Node)) setShowThemeMenu(false);
          if (showLangMenu && langRef.current && !langRef.current.contains(e.target as Node)) setShowLangMenu(false);
      };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
  }, [showThemeMenu, showLangMenu]);

  const displayMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()) || msg.role.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  const handleScroll = () => { if (scrollRef.current) { const { scrollTop, scrollHeight, clientHeight } = scrollRef.current; shouldAutoScrollRef.current = (scrollHeight - scrollTop - clientHeight) < 100; } };
  useLayoutEffect(() => { if (scrollRef.current && shouldAutoScrollRef.current && !searchQuery) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, searchQuery]);

  const processFiles = (files: File[]) => { if (!isMultimodal) return; files.forEach(f => { if (!f.type.startsWith('image/')) return; const r = new FileReader(); r.onload = (e) => { if (e.target?.result) setPendingImages(prev => [...prev, e.target!.result as string]); }; r.readAsDataURL(f); }); };
  const handlePaste = (e: React.ClipboardEvent) => { if (!isMultimodal) return; const items = e.clipboardData.items; const files: File[] = []; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { const f = items[i].getAsFile(); if (f) files.push(f); } } if (files.length > 0) { e.preventDefault(); processFiles(files); } };

  const handleSend = async () => {
    if (input.trim() === '/upup downdown left right') { onTriggerRainbow(); setInput(''); return; }
    if ((!input.trim() && pendingImages.length === 0) || !activeModel || !provider || isStreaming) return;
    shouldAutoScrollRef.current = true;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now(), images: pendingImages.length > 0 ? [...pendingImages] : undefined };
    onSendMessage(userMsg, { deepThinkingEnabled: isDeepThinkingEnabled });
    setInput(''); setPendingImages([]); setMascotState('thinking'); setLocalIsStreaming(true);
  };

  useEffect(() => { if (!externalIsStreaming && localIsStreaming) setLocalIsStreaming(false); }, [externalIsStreaming]);

  const ThemeOption = ({ targetTheme, icon, label }: { targetTheme: Theme, icon: React.ReactNode, label: string }) => (
      <button onClick={() => { setTheme(targetTheme); setShowThemeMenu(false); }} className={cn("flex items-center gap-3 w-full p-2.5 rounded-md text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800", theme === targetTheme && "bg-slate-100 dark:bg-slate-800")}>
         <div className="w-5 h-5 flex items-center justify-center opacity-70">{icon}</div> {label}
      </button>
  );

  return (
    <div className={cn("flex flex-col h-full relative z-10", styles.font)}>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-12" ref={scrollRef} onScroll={handleScroll}>
        {messages.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full opacity-30 select-none animate-in fade-in zoom-in duration-1000">
             <div className="text-8xl mb-8 filter grayscale opacity-50 drop-shadow-2xl">🤖</div>
             <div className="text-sm font-black tracking-[0.5em] uppercase text-center max-w-xs">{t.selectModelStart}</div>
           </div>
        ) : (
          displayMessages.map((msg, index) => <MessageBubble key={msg.id} msg={msg} theme={theme} language={language} isStreaming={isStreaming} isLast={index === messages.length - 1} />)
        )}
      </div>

      <div className={cn("p-4 md:p-8 border-t bg-background/95 backdrop-blur-2xl transition-all duration-500", styles.headerBorder)}>
        <div className="max-w-4xl mx-auto space-y-6">
          {pendingImages.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-2 animate-in slide-in-from-bottom-2">
                  {pendingImages.map((img, idx) => (
                      <div key={idx} className="relative shrink-0 w-24 h-24 rounded-xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden group shadow-lg ring-4 ring-white dark:ring-slate-900 transition-transform hover:scale-105">
                          <img src={img} className="w-full h-full object-cover" alt="Preview" />
                          <button onClick={() => setPendingImages(p => p.filter((_, i) => i !== idx))} className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1.5 rounded-full shadow-lg transition-transform hover:scale-110"><X size={12} /></button>
                      </div>
                  ))}
              </div>
          )}

          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              onPaste={handlePaste}
              placeholder={activeModel ? `${t.typeMessage}` : `${t.selectModelStart}`}
              disabled={!activeModel || isStreaming}
              className={cn(
                "w-full p-5 pr-16 min-h-[64px] max-h-[300px] resize-none outline-none border transition-all duration-500",
                THEME_STYLES[theme].type === 'pixel' ? styles.radius + " " + styles.borderColor + " " + styles.inputBg : "rounded-2xl border-slate-200 dark:border-slate-800 focus:border-slate-900 dark:focus:border-slate-100 bg-white dark:bg-slate-950 shadow-sm focus:shadow-xl focus:ring-8 focus:ring-slate-100 dark:focus:ring-slate-900/50",
                styles.text
              )}
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <PixelButton theme={theme} onClick={isStreaming ? onStop : handleSend} disabled={(!input.trim() && pendingImages.length === 0) || !activeModel} className="w-11 h-11 !p-0 rounded-xl" variant={isStreaming ? 'destructive' : 'default'}>
                    {isStreaming ? <X size={20} /> : <Send size={20} />}
                </PixelButton>
            </div>
          </div>
          
          <div className="flex items-center justify-between px-2">
             <div className="flex gap-2 items-center">
                {isMultimodal && (
                    <PixelButton theme={theme} variant="outline" className="w-10 h-10 !p-0" onClick={() => fileInputRef.current?.click()} title={t.uploadImage}>
                        <Paperclip size={20} />
                    </PixelButton>
                )}
                <div className="relative" ref={themeRef}>
                    {showThemeMenu && (
                        <div className="absolute bottom-full left-0 mb-4 w-60 p-2 rounded-2xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xl z-[100] animate-in slide-in-from-bottom-2 duration-300">
                             <div className="px-3 py-2 mb-1 text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-slate-50 dark:border-slate-900">System Visuals</div>
                             <ThemeOption targetTheme={Theme.LIGHT} icon={<Sun size={14}/>} label={t.themeDay} />
                             <ThemeOption targetTheme={Theme.DARK} icon={<Moon size={14}/>} label={t.themeNight} />
                             <ThemeOption targetTheme={Theme.MODERN_LIGHT} icon={<Laptop size={14}/>} label={t.themeModernDay} />
                             <ThemeOption targetTheme={Theme.MODERN_DARK} icon={<Laptop size={14}/>} label={t.themeModernNight} />
                             <ThemeOption targetTheme={Theme.CLAY} icon={<Coffee size={14}/>} label={t.themeClay} />
                             <ThemeOption targetTheme={Theme.BIOLUMINESCENCE} icon={<Zap size={14}/>} label={t.themeBiolum} />
                        </div>
                    )}
                    <PixelButton theme={theme} variant="outline" className="w-10 h-10 !p-0" onClick={() => { setShowLangMenu(false); setShowThemeMenu(!showThemeMenu); }} title={t.changeTheme}><Palette size={20} /></PixelButton>
                </div>
                <div className="relative" ref={langRef}>
                    {showLangMenu && (
                        <div className="absolute bottom-full left-0 mb-4 w-44 p-2 rounded-2xl border bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-2xl z-[100] animate-in slide-in-from-bottom-2 duration-300">
                             <div className="px-3 py-2 mb-1 text-[10px] font-black uppercase tracking-widest opacity-30 border-b border-slate-50 dark:border-slate-900">Locale Settings</div>
                             {['en', 'zh', 'ja'].map(l => (
                                 <button key={l} onClick={() => { setLanguage(l as any); setShowLangMenu(false); }} className={cn("flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800", language === l && "bg-slate-100 dark:bg-slate-800")}><span className="w-5 text-[10px] font-black opacity-30 text-center">{l.toUpperCase()}</span> {l === 'en' ? 'English' : l === 'zh' ? '中文' : '日本語'}</button>
                             ))}
                        </div>
                    )}
                    <PixelButton theme={theme} variant="outline" className="w-10 h-10 !p-0" onClick={() => { setShowThemeMenu(false); setShowLangMenu(!showLangMenu); }} title={t.changeLanguage}><Globe size={20} /></PixelButton>
                </div>
             </div>
             <div className="flex gap-3">
                <PixelButton theme={theme} variant="outline" className={cn("h-10 gap-2 px-4 transition-all rounded-xl", isDeepThinkingEnabled ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10" : "opacity-40")} onClick={() => setIsDeepThinkingEnabled(!isDeepThinkingEnabled)}>
                    <BrainCircuit size={18} className={cn(isDeepThinkingEnabled && "animate-pulse")} /> <span className="text-xs font-black uppercase tracking-widest">{t.deepThinking}</span>
                </PixelButton>
             </div>
          </div>
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={(e) => { if (e.target.files) { processFiles(Array.from(e.target.files)); e.target.value = ''; } }} accept="image/*" multiple className="hidden" />
    </div>
  );
};
