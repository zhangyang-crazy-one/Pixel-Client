
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Theme, Message, LLMModel, LLMProvider, Language } from '../types';
import { PixelButton, PixelBadge } from './PixelUI';
import { streamChatResponse } from '../services/llmService';
import { THEME_STYLES, TRANSLATIONS } from '../constants';
import { Send, Copy, Check, Moon, Sun, Star, Cpu, Globe, Palette, Loader2, Brain, ChevronDown, ChevronRight, BrainCircuit, Play, Pause, Maximize, FileCode, Box, Terminal, Settings2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import { MermaidBlock } from './MermaidBlock';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
      className={`
        transition-all duration-200 p-1
        ${copied ? 'text-green-500 scale-125 opacity-100' : 'opacity-70 hover:opacity-100 hover:scale-110'}
      `} 
      onClick={handleCopy} 
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? <Check size={14}/> : <Copy size={14}/>}
    </button>
  );
};

// --- MEDIA COMPONENTS ---

const MediaFrame: React.FC<{ theme: Theme; children: React.ReactNode; label: string; icon: React.ReactNode }> = ({ theme, children, label, icon }) => {
    const isLight = theme === Theme.LIGHT;
    return (
        <div className={`my-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden ${isLight ? 'bg-gray-100' : 'bg-gray-900'}`}>
            <div className={`flex items-center gap-2 px-3 py-1 text-xs font-bold border-b-2 border-black ${isLight ? 'bg-gray-200 text-gray-700' : 'bg-gray-800 text-gray-300'}`}>
                {icon}
                <span className="uppercase tracking-wider">{label}</span>
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
    
    return (
        <div className="my-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
             <div className="flex justify-between items-center bg-[#1e1e1e] text-gray-400 px-2 py-1 text-xs border-b-2 border-black font-bold font-mono">
                <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <span className="uppercase text-blue-400">HTML {defaultPreview ? 'DOCUMENT' : 'SNIPPET'}</span>
                </div>
                <button 
                    onClick={() => setShowPreview(!showPreview)} 
                    className={`
                        flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                        transition-colors
                        ${showPreview ? 'bg-green-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}
                    `}
                >
                    {showPreview ? <FileCode size={12} /> : <Maximize size={12} />}
                    {showPreview ? "VIEW CODE" : "RUN PREVIEW"}
                </button>
            </div>
            
            {showPreview ? (
                 <div className="bg-white w-full h-[500px] relative resize-y overflow-auto">
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
                            fontFamily: '"VT323", monospace', 
                            fontSize: '16px', 
                            lineHeight: '1.4',
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

// Helper to detect media types from URL
const getMediaType = (url: string) => {
    if (!url) return 'link';
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.match(/\.(mp4|webm|mov|mkv)$/)) return 'video';
    if (cleanUrl.match(/\.(mp3|wav|ogg|m4a)$/)) return 'audio';
    if (cleanUrl.match(/\.(glb|gltf)$/)) return 'model';
    if (cleanUrl.match(/\.html?$/)) return 'html';
    return 'link';
};

// Memoized Markdown Renderer to prevent re-parsing on every render
const MarkdownRenderer: React.FC<{ text: string; theme: Theme }> = React.memo(({ text, theme }) => {
    
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
                // Prevent dangerous or layout-breaking tags from rendering directly
                style: () => null,
                script: () => null,
                link: () => null,
                meta: () => null,
                head: () => null,
                iframe: () => null, // Block iframes in markdown stream
                object: () => null,
                embed: () => null,
                form: () => null,
                
                html: ({children}) => <>{children}</>, 
                body: ({children}) => <>{children}</>,

                // Raw HTML Media Handling
                video: ({node, src, ...props}: any) => (
                     <MediaFrame theme={theme} label="Video Feed" icon={<Play size={14} />}>
                        <video controls className="w-full max-h-[400px]" src={src as string} {...props} />
                     </MediaFrame>
                ),
                audio: ({node, src, ...props}: any) => (
                    <MediaFrame theme={theme} label="Audio Log" icon={<Play size={14} />}>
                        <audio controls className="w-full" src={src as string} {...props} />
                    </MediaFrame>
                ),

                // Markdown Link Handling
                a: ({node, href, children, ...props}) => {
                    const url = (typeof href === 'string' ? href : undefined) || '';
                    const type = getMediaType(url);
                    
                    if (type === 'video') {
                        return (
                            <MediaFrame theme={theme} label="Video Feed" icon={<Play size={14} />}>
                                <video controls className="w-full max-h-[400px]" src={url} />
                            </MediaFrame>
                        );
                    }
                    if (type === 'audio') {
                        return (
                            <MediaFrame theme={theme} label="Audio Log" icon={<Play size={14} />}>
                                <audio controls className="w-full" src={url} />
                            </MediaFrame>
                        );
                    }
                    if (type === 'model') {
                        // Cast to any to avoid IntrinsicElements error with model-viewer
                        const ModelViewerComponent = 'model-viewer' as any;
                        return (
                            <MediaFrame theme={theme} label="3D Asset" icon={<Box size={14} />}>
                                <ModelViewerComponent 
                                    src={url} 
                                    camera-controls 
                                    auto-rotate 
                                    shadow-intensity="1"
                                    style={{ width: '100%', height: '300px', backgroundColor: theme === Theme.LIGHT ? '#f0f0f0' : '#1a1a1a' }} 
                                />
                            </MediaFrame>
                        );
                    }
                    if (type === 'html') {
                        return (
                            <MediaFrame theme={theme} label="WEB PREVIEW" icon={<Globe size={14} />}>
                                <iframe 
                                    src={url} 
                                    className="w-full h-[400px] border-none bg-white" 
                                    sandbox="allow-scripts" 
                                    title="Web Preview"
                                />
                            </MediaFrame>
                        );
                    }
                    
                    return <a href={href as string} className="text-blue-500 hover:text-blue-400 underline break-all" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                },
                
                // Markdown Image Handling
                img: ({node, src, alt, ...props}) => {
                    const url = (typeof src === 'string' ? src : undefined) || '';
                    const type = getMediaType(url);

                    if (type === 'video') {
                        return (
                            <MediaFrame theme={theme} label="Video Feed" icon={<Play size={14} />}>
                                <video controls className="w-full max-h-[400px]" src={url} />
                            </MediaFrame>
                        );
                    }
                    if (type === 'audio') {
                        return (
                            <MediaFrame theme={theme} label="Audio Log" icon={<Play size={14} />}>
                                <audio controls className="w-full" src={url} />
                            </MediaFrame>
                        );
                    }
                    if (type === 'model') {
                        const ModelViewerComponent = 'model-viewer' as any;
                        return (
                            <MediaFrame theme={theme} label="3D Asset" icon={<Box size={14} />}>
                                <ModelViewerComponent 
                                    src={url} 
                                    camera-controls 
                                    auto-rotate 
                                    shadow-intensity="1"
                                    style={{ width: '100%', height: '300px', backgroundColor: theme === Theme.LIGHT ? '#f0f0f0' : '#1a1a1a' }} 
                                />
                            </MediaFrame>
                        );
                    }

                    return (
                        <div className="my-2 inline-block relative group">
                            <div className="absolute inset-0 border-2 border-black pointer-events-none z-10"></div>
                            <img 
                                src={src as string} 
                                alt={alt} 
                                className="max-w-full h-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] bg-gray-200 image-pixelated" 
                                loading="lazy"
                                {...props} 
                            />
                            {alt && <div className="absolute bottom-0 left-0 bg-black/70 text-white text-[10px] px-1 py-0.5 max-w-full truncate">{alt}</div>}
                        </div>
                    );
                },
                code: ({node, inline, className, children, ...props}: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const lang = match ? match[1] : '';
                    const isMermaid = lang === 'mermaid';
                    
                    if (!inline && isMermaid) {
                        return <MermaidBlock code={String(children).replace(/\n$/, '')} theme={theme} />;
                    }

                    if (!inline && lang === 'html') {
                        return <HtmlPreviewBlock code={String(children).replace(/\n$/, '')} theme={theme} />;
                    }

                    if (!inline && match) {
                        return (
                            <div className="my-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                                <div className="flex justify-between items-center bg-[#1e1e1e] text-gray-400 px-2 py-1 text-xs border-b-2 border-black font-bold font-mono">
                                    <div className="flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    </div>
                                    <span className="uppercase">{lang}</span>
                                </div>
                                <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={lang}
                                    PreTag="div"
                                    customStyle={{ 
                                        margin: 0, 
                                        borderRadius: 0, 
                                        fontFamily: '"VT323", monospace', 
                                        fontSize: '16px', 
                                        lineHeight: '1.4',
                                        background: '#1e1e1e' 
                                    }}
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            </div>
                        );
                    }
                    
                    return <code className={className} {...props}>{children}</code>;
                }
            }}
        >
            {text}
        </ReactMarkdown>
    );
});

const ThinkingBlock: React.FC<{ content: string; theme: Theme; language: Language }> = React.memo(({ content, theme, language }) => {
    const [isOpen, setIsOpen] = useState(false);
    const t = TRANSLATIONS[language];

    return (
        <div className={`
            my-3 border-2 border-dashed border-opacity-50 rounded-sm overflow-hidden
            ${theme === Theme.LIGHT ? 'border-gray-400 bg-gray-50' : 'border-gray-600 bg-black/20'}
        `}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide
                    opacity-70 hover:opacity-100 transition-opacity select-none
                    ${theme === Theme.LIGHT ? 'hover:bg-gray-200' : 'hover:bg-white/5'}
                `}
            >
                <Brain size={14} className="opacity-70" />
                <span className="flex-1 text-left">{t.thinkingProcess}</span>
                <span className="flex items-center gap-1 opacity-50">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isOpen ? t.collapse : t.expand}
                </span>
            </button>
            
            {isOpen && (
                <div className={`
                    p-3 text-xs border-t-2 border-dashed border-opacity-30
                    ${theme === Theme.LIGHT ? 'border-gray-400 text-gray-700 bg-white' : 'border-gray-600 text-gray-300 bg-black/40'}
                    markdown-body
                `}>
                   <MarkdownRenderer text={content} theme={theme} />
                </div>
            )}
        </div>
    );
});

const ToolDetails: React.FC<{ content: string; theme: Theme; language: Language; index: number }> = React.memo(({ content, theme, language, index }) => {
    const isLight = theme === Theme.LIGHT;
    
    const { params, error } = useMemo(() => {
        try {
            let safeContent = content;
            if (!content.includes('</tool_action>')) safeContent += '</tool_action>';
            const parser = new DOMParser();
            const doc = parser.parseFromString(safeContent, "text/xml");
            if (doc.querySelector("parsererror")) return { params: [], error: 'Parsing Error' };

            const root = doc.querySelector("tool_action");
            if (!root) return { params: [], error: 'Invalid XML' };

            const extractedParams: { key: string, attrs: Record<string,string>, value: string }[] = [];
            Array.from(root.children).forEach(child => {
                const attrs: Record<string, string> = {};
                Array.from(child.attributes).forEach(attr => attrs[attr.name] = attr.value);
                extractedParams.push({ key: child.tagName, attrs, value: child.textContent || '' });
            });

            return { params: extractedParams, error: null };
        } catch (e) {
            return { params: [], error: String(e) };
        }
    }, [content]);

    return (
        <div className={`p-2 border-l-2 ${isLight ? 'border-indigo-200' : 'border-indigo-800'}`}>
            <div className="text-[10px] uppercase font-bold opacity-50 mb-1">Call #{index + 1}</div>
            <div className="space-y-2 overflow-x-auto">
                {error ? <div className="text-red-500 text-xs">{error}</div> : 
                params.length === 0 ? <span className="opacity-50 italic text-xs">No parameters</span> : 
                params.map((p, idx) => (
                    <div key={idx} className="flex flex-col gap-1 text-xs">
                         <div className="flex items-center gap-2">
                             <span className="font-bold text-blue-500">{p.key}</span>
                             {Object.entries(p.attrs).map(([k, v]) => (
                                 <span key={k} className="opacity-70">
                                     <span className="text-purple-500">{k}</span>=
                                     <span className="text-green-600">"{v}"</span>
                                 </span>
                             ))}
                         </div>
                         {p.value && (
                             <div className={`pl-4 border-l-2 ${isLight ? 'border-gray-300' : 'border-gray-700'}`}>
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
    language?: Language 
}> = React.memo(({ name, count, rawContents, theme, language = 'en' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLight = theme === Theme.LIGHT;

    // Localization
    const titleText = useMemo(() => {
        if (language === 'zh') return `执行工具: ${name}`;
        if (language === 'ja') return `ツール実行: ${name}`;
        return `Executing Tool: ${name}`;
    }, [language, name]);

    return (
        <div className={`
            my-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] overflow-hidden font-mono text-sm
            transition-all duration-200
            ${isLight ? 'bg-indigo-50' : 'bg-[#1a1b26]'}
        `}>
           {/* Header Bar */}
           <div 
             onClick={() => setIsExpanded(!isExpanded)}
             className={`
                flex items-center justify-between px-3 py-2 cursor-pointer select-none
                ${isLight ? 'hover:bg-indigo-100' : 'hover:bg-white/5'}
             `}
           >
              <div className="flex items-center gap-3">
                 {/* Dynamic Spinner */}
                 <div className="relative w-5 h-5 flex items-center justify-center">
                    <div className={`absolute inset-0 border-2 border-dashed rounded-full animate-[spin_3s_linear_infinite] ${isLight ? 'border-indigo-600' : 'border-indigo-400'}`}></div>
                    <Terminal size={12} className={isLight ? 'text-indigo-600' : 'text-indigo-400'} />
                 </div>
                 
                 <div className="flex flex-col">
                    <span className="font-bold uppercase tracking-wide leading-none">{titleText}</span>
                    <span className="text-[10px] opacity-60 flex items-center gap-1 mt-0.5">
                       <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                       Running...
                    </span>
                 </div>
              </div>

              {/* Count Indicator */}
              <div className="flex items-center gap-3">
                 {count > 1 && (
                     <div key={count} className="animate-bounce">
                        <PixelBadge theme={theme} color="bg-yellow-400 text-black">
                           ×{count}
                        </PixelBadge>
                     </div>
                 )}
                 <div className="opacity-50">
                    {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                 </div>
              </div>
           </div>

           {/* Expanded Params (Hidden by default) */}
           {isExpanded && (
               <div className={`border-t-2 border-black/10 p-2 space-y-2 ${isLight ? 'bg-white' : 'bg-black/20'}`}>
                   {rawContents.map((content, idx) => (
                       <ToolDetails key={idx} content={content} index={idx} theme={theme} language={language} />
                   ))}
               </div>
           )}
        </div>
    );
});

const parseMessageContent = (content: string, theme: Theme, language: Language) => {
    // Regex captures <thinking>...</thinking> OR <tool_action>...</tool_action> (including unclosed tags for streaming)
    const regex = /(<thinking>[\s\S]*?(?:<\/thinking>|$)|<tool_action[\s\S]*?(?:<\/tool_action>|$))/gi;
    const parts = content.split(regex);
    
    const renderedNodes: React.ReactNode[] = [];
    let pendingTools: string[] = [];
    let currentToolName = '';

    const flushTools = () => {
        if (pendingTools.length > 0) {
            renderedNodes.push(
                <ToolActionBlock 
                    key={`tool-group-${renderedNodes.length}`} 
                    name={currentToolName} 
                    count={pendingTools.length} 
                    rawContents={[...pendingTools]} 
                    theme={theme} 
                    language={language} 
                />
            );
            pendingTools = [];
            currentToolName = '';
        }
    };

    parts.forEach((part, index) => {
        if (!part.trim()) return;

        if (part.startsWith('<tool_action')) {
            // Simple regex to extract name attribute
            const match = part.match(/name=['"]([^'"]+)['"]/);
            const name = match ? match[1] : 'Unknown';

            // If we have a pending tool group but this one is different, flush the previous one
            if (currentToolName && name !== currentToolName) {
                flushTools();
            }

            currentToolName = name;
            pendingTools.push(part);
        } else {
            // Non-tool content found, flush any pending tools first
            flushTools();

            if (part.startsWith('<thinking')) {
                const inner = part.replace(/^<thinking>/i, '').replace(/<\/thinking>$/i, '');
                renderedNodes.push(<ThinkingBlock key={`think-${index}`} content={inner} theme={theme} language={language} />);
            } else {
                renderedNodes.push(
                    <div key={`md-${index}`} className="markdown-body">
                        <MarkdownRenderer text={part} theme={theme} />
                    </div>
                );
            }
        }
    });

    flushTools(); // Final flush for trailing tools
    return renderedNodes;
};

interface MessageBubbleProps {
    msg: Message;
    theme: Theme;
    language: Language;
    styles: any;
    isStreaming: boolean;
    isLast: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ msg, theme, language, styles, isStreaming, isLast }) => {
    // Check if message has thinking content to allow wider bubble
    const hasThinking = useMemo(() => msg.content?.includes('<thinking>'), [msg.content]);
    const hasTool = useMemo(() => msg.content?.includes('<tool_action'), [msg.content]);

    // Detect if content is primarily an HTML document (for Safe Pure Rendering)
    const isHtml = useMemo(() => {
        const trimmed = msg.content.trim();
        // Check for doctype or html tag at the start (fuzzy match to allow some leading text or whitespace)
        return /^\s*<!DOCTYPE html>/i.test(trimmed) || /^\s*<html/i.test(trimmed);
    }, [msg.content]);

    return (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div 
            className={`
              p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              ${hasThinking || hasTool || isHtml ? 'max-w-[98%] md:max-w-[95%]' : 'max-w-[90%] md:max-w-[75%]'}
              ${msg.role === 'user' ? styles.primary + ' text-white' : styles.secondary + ' ' + styles.text}
            `}
          >
            <div className="flex justify-between items-center mb-2 gap-2">
              <div className={`
                text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border border-black
                ${msg.role === 'user' ? 'bg-white text-black' : 'bg-black text-white'}
                shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]
              `}>
                {msg.role}
              </div>
              {msg.role === 'assistant' && msg.content && (
                 <CopyButton content={msg.content} />
              )}
            </div>
            <div className="leading-relaxed font-chat text-sm">
              {msg.content ? (
                  isHtml ? (
                      <HtmlPreviewBlock code={msg.content} theme={theme} defaultPreview={true} />
                  ) : (
                      parseMessageContent(msg.content, theme, language)
                  )
              ) : (
                  <div className="flex items-center gap-2 py-2 opacity-70">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="font-pixel-verse animate-pulse">Thinking...</span>
                  </div>
              )}
              {isStreaming && isLast && msg.content && (
                  <span className="inline-block w-2 h-4 bg-current ml-1 animate-cursor align-middle"></span>
              )}
            </div>
          </div>
        </div>
    );
});

export const Chat: React.FC<ChatProps> = ({ 
  theme, 
  language,
  messages, 
  activeModel, 
  provider,
  onSendMessage, 
  onUpdateMessage,
  setMascotState,
  onTriggerRainbow,
  setTheme,
  setLanguage,
  isMoonlightUnlocked,
  searchQuery = '',
  onStop,
  isStreaming: externalIsStreaming = false
}) => {
  const [input, setInput] = useState('');
  const [localIsStreaming, setLocalIsStreaming] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isDeepThinkingEnabled, setIsDeepThinkingEnabled] = useState(false);
  
  const isStreaming = externalIsStreaming || localIsStreaming;

  const scrollRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  
  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];

  // Handle click outside to close menus
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (showThemeMenu && themeRef.current && !themeRef.current.contains(event.target as Node)) {
              setShowThemeMenu(false);
          }
          if (showLangMenu && langRef.current && !langRef.current.contains(event.target as Node)) {
              setShowLangMenu(false);
          }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [showThemeMenu, showLangMenu]);

  const displayMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
        msg.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  useEffect(() => {
    if (scrollRef.current && !searchQuery) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, searchQuery]);

  const handleSend = async () => {
    if (input.trim() === '/upup downdown left right') {
        onTriggerRainbow();
        setInput('');
        return;
    }

    if (!input.trim() || !activeModel || !provider || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    onSendMessage(userMsg, { deepThinkingEnabled: isDeepThinkingEnabled });
    setInput('');
    setMascotState('thinking');
    setLocalIsStreaming(true);
  };

  useEffect(() => {
    if (!externalIsStreaming && localIsStreaming) {
       setLocalIsStreaming(false);
    }
  }, [externalIsStreaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = (!activeModel) && input.trim() !== '/upup downdown left right';
  const isButtonDisabled = isDisabled && !isStreaming;

  const ThemeOption = ({ targetTheme, icon, label }: { targetTheme: Theme, icon: React.ReactNode, label: string }) => (
      <button 
        onClick={() => { setTheme(targetTheme); setShowThemeMenu(false); }}
        className={`
            flex items-center gap-2 w-full text-left p-2 hover:bg-black/10 text-sm font-bold
            ${theme === targetTheme ? 'bg-black/5 border-l-4 border-black' : ''}
        `}
      >
         {icon} {label}
      </button>
  );

  const LangOption = ({ targetLang, label }: { targetLang: Language, label: string }) => (
      <button 
        onClick={() => { setLanguage(targetLang); setShowLangMenu(false); }}
        className={`
            flex items-center gap-2 w-full text-left p-2 hover:bg-black/10 text-sm font-bold
            ${language === targetLang ? 'bg-black/5 border-l-4 border-black' : ''}
        `}
      >
         <span className="w-4 text-center">{targetLang.toUpperCase()}</span> {label}
      </button>
  );

  return (
    <div className="flex flex-col h-full relative z-10">
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10" ref={scrollRef}>
        {messages.length === 0 ? (
           <div className={`flex flex-col items-center justify-center h-full opacity-50 select-none ${styles.text}`}>
             <div className="text-6xl mb-4 animate-bounce">🎮</div>
             <div className="text-xl">{t.selectModelStart}</div>
           </div>
        ) : displayMessages.length === 0 ? (
           <div className={`flex flex-col items-center justify-center h-full opacity-50 select-none ${styles.text}`}>
             <div className="text-4xl mb-4">🔍</div>
             <div className="text-xl">{t.noMessagesFound}</div>
           </div>
        ) : (
          displayMessages.map((msg, index) => (
            <MessageBubble 
                key={msg.id}
                msg={msg}
                theme={theme}
                language={language}
                styles={styles}
                isStreaming={isStreaming}
                isLast={index === messages.length - 1}
            />
          ))
        )}
      </div>

      <div className={`p-4 border-t-4 border-black ${styles.secondary} relative z-[70]`}>
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeModel ? `Message ${activeModel.name}...` : "Select a model from the sidebar to start..."}
            disabled={isDisabled && !input.startsWith('/')}
            className={`
              w-full p-3 pr-12 min-h-[60px] max-h-[200px] resize-none outline-none
              border-2 border-black 
              ${isDisabled ? 'bg-gray-200 cursor-not-allowed text-gray-500' : `${styles.inputBg} ${styles.text} focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]`}
              placeholder-current placeholder-opacity-50
              transition-all
              font-chat relative z-50
            `}
          />
          
          <div className="flex justify-between mt-2 items-center relative z-50">
             <div className="flex gap-2 items-center">
                <div className="relative" ref={themeRef}>
                    {showThemeMenu && (
                        <div className={`
                            absolute bottom-full left-0 mb-2 w-40 border-2 border-black 
                            ${styles.secondary} ${styles.text} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                            flex flex-col z-[70]
                        `}>
                             <ThemeOption targetTheme={Theme.LIGHT} icon={<Sun size={14}/>} label={t.themeDay} />
                             <ThemeOption targetTheme={Theme.DARK} icon={<Moon size={14}/>} label={t.themeNight} />
                             <ThemeOption targetTheme={Theme.FESTIVAL} icon={<Star size={14}/>} label={t.themeFest} />
                             <ThemeOption targetTheme={Theme.CYBERPUNK} icon={<Cpu size={14}/>} label={t.themeCyber} />
                             {isMoonlightUnlocked && (
                                 <ThemeOption targetTheme={Theme.MOONLIGHT} icon={<span className="text-cyan-300">☾</span>} label={t.themeMoon} />
                             )}
                        </div>
                    )}
                    <PixelButton 
                        theme={theme} 
                        variant="secondary" 
                        className="w-9 h-9 !p-0 flex items-center justify-center" 
                        title={t.changeTheme}
                        onClick={() => {
                            if (!showThemeMenu) setShowLangMenu(false);
                            setShowThemeMenu(!showThemeMenu);
                        }}
                    >
                        <Palette size={20} />
                    </PixelButton>
                </div>

                <div className="relative" ref={langRef}>
                    {showLangMenu && (
                        <div className={`
                            absolute bottom-full left-0 mb-2 w-32 border-2 border-black 
                            ${styles.secondary} ${styles.text} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                            flex flex-col z-[70]
                        `}>
                             <LangOption targetLang="en" label="English" />
                             <LangOption targetLang="zh" label="中文" />
                             <LangOption targetLang="ja" label="日本語" />
                        </div>
                    )}
                    <PixelButton 
                        theme={theme} 
                        variant="secondary" 
                        className="w-9 h-9 !p-0 flex items-center justify-center" 
                        title={t.changeLanguage}
                        onClick={() => {
                             if (!showLangMenu) setShowThemeMenu(false);
                             setShowLangMenu(!showLangMenu);
                        }}
                    >
                        <Globe size={20} />
                    </PixelButton>
                </div>
             </div>
             
             <div className="flex gap-2">
                {/* Deep Thinking Toggle - HIDDEN when streaming */}
                {!isStreaming && (
                    <div className="relative group">
                        <PixelButton
                            theme={theme}
                            variant="secondary" // Base variant, overridden by className
                            className={`
                                w-9 h-9 !p-0 flex items-center justify-center transition-all duration-300
                                ${isDeepThinkingEnabled 
                                    ? 'bg-green-600 border-green-800 text-white shadow-[inset_0_0_10px_rgba(255,255,255,0.3)]' 
                                    : 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100'}
                            `}
                            title={t.deepThinking}
                            onClick={() => setIsDeepThinkingEnabled(!isDeepThinkingEnabled)}
                        >
                            <BrainCircuit size={20} className={isDeepThinkingEnabled ? 'animate-pulse' : ''} />
                        </PixelButton>
                    </div>
                )}

                {isStreaming && (
                   <div className={`flex items-center mr-4 ${styles.text}`}>
                     <span className="animate-spin mr-2">★</span> {t.generating}
                   </div>
                )}
                
                <PixelButton 
                    theme={theme} 
                    onClick={isStreaming ? onStop : handleSend} 
                    disabled={isButtonDisabled}
                    className="w-32 h-9"
                    variant={isStreaming ? 'danger' : 'primary'}
                >
                    {isStreaming ? t.stop : t.send} <Send size={16} />
                </PixelButton>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
