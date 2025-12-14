
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { Theme, Message, LLMModel, LLMProvider, Language } from '../types';
import { PixelButton } from './PixelUI';
import { THEME_STYLES, TRANSLATIONS } from '../constants';
import { Send, Copy, Check, Moon, Sun, Star, Cpu, Globe, Palette, Loader2, Brain, ChevronDown, ChevronRight, BrainCircuit, Play, Maximize, FileCode, Box, Terminal, Laptop, Coffee, Zap } from 'lucide-react';
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
        transition-all duration-200 p-1 rounded
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
    const styles = THEME_STYLES[theme];
    return (
        <div className={`my-4 ${styles.borderWidth} ${styles.borderColor} ${styles.radius} overflow-hidden ${styles.inputBg} ${styles.shadow}`}>
            <div className={`flex items-center gap-2 px-3 py-1 text-xs font-bold border-b ${styles.borderColor} ${styles.secondary} ${styles.secondaryText}`}>
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
    const styles = THEME_STYLES[theme];
    
    return (
        <div className={`my-4 ${styles.borderWidth} ${styles.borderColor} ${styles.shadow} ${styles.radius} overflow-hidden`}>
             <div className={`flex justify-between items-center bg-[#1e1e1e] text-gray-400 px-2 py-1 text-xs border-b ${styles.borderColor} font-bold font-mono`}>
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

// ... (getMediaType function remains unchanged) ...
const getMediaType = (url: string) => {
    if (!url) return 'link';
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.match(/\.(mp4|webm|mov|mkv)$/)) return 'video';
    if (cleanUrl.match(/\.(mp3|wav|ogg|m4a)$/)) return 'audio';
    if (cleanUrl.match(/\.(glb|gltf)$/)) return 'model';
    if (cleanUrl.match(/\.html?$/)) return 'html';
    return 'link';
};


// Memoized Markdown Renderer
const MarkdownRenderer: React.FC<{ text: string; theme: Theme }> = React.memo(({ text, theme }) => {
    const styles = THEME_STYLES[theme];

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
                style: () => <></>,
                script: () => <></>,
                link: () => <></>,
                meta: () => <></>,
                head: () => <></>,
                iframe: () => <></>, 
                object: () => <></>,
                embed: () => <></>,
                form: () => <></>,
                html: ({children}: {children?: React.ReactNode}) => <>{children}</>, 
                body: ({children}: {children?: React.ReactNode}) => <>{children}</>,

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
                a: ({node, href, children, ...props}: any) => {
                    const url = (typeof href === 'string' ? href : undefined) || '';
                    const type = getMediaType(url);
                    
                    if (type === 'video') return <MediaFrame theme={theme} label="Video Feed" icon={<Play size={14} />}><video controls className="w-full max-h-[400px]" src={url} /></MediaFrame>;
                    if (type === 'audio') return <MediaFrame theme={theme} label="Audio Log" icon={<Play size={14} />}><audio controls className="w-full" src={url} /></MediaFrame>;
                    if (type === 'model') {
                        const ModelViewerComponent = 'model-viewer' as any;
                        return (
                            <MediaFrame theme={theme} label="3D Asset" icon={<Box size={14} />}>
                                <ModelViewerComponent src={url} camera-controls auto-rotate shadow-intensity="1" style={{ width: '100%', height: '300px' }} />
                            </MediaFrame>
                        );
                    }
                    if (type === 'html') return <MediaFrame theme={theme} label="WEB PREVIEW" icon={<Globe size={14} />}><iframe src={url} className="w-full h-[400px] border-none bg-white" sandbox="allow-scripts" title="Web Preview"/></MediaFrame>;
                    
                    return <a href={href as string} className="text-blue-500 hover:text-blue-400 underline break-all" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
                },
                img: ({node, src, alt, ...props}: any) => {
                    return (
                        <div className={`my-2 inline-block relative group rounded overflow-hidden`}>
                            <img src={src as string} alt={alt} className={`max-w-full h-auto ${styles.shadow}`} loading="lazy" {...props} />
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
                            <div className={`my-4 ${styles.borderWidth} ${styles.borderColor} ${styles.shadow} ${styles.radius} overflow-hidden`}>
                                <div className="flex justify-between items-center bg-[#1e1e1e] text-gray-400 px-2 py-1 text-xs border-b border-white/10 font-bold font-mono">
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
                                        fontFamily: styles.type === 'pixel' ? '"VT323", monospace' : '"Menlo", monospace', 
                                        fontSize: '14px', 
                                        lineHeight: '1.4',
                                        background: '#1e1e1e' 
                                    }}
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
    const styles = THEME_STYLES[theme];

    return (
        <div className={`
            my-3 ${styles.borderWidth} ${styles.borderColor} border-dashed border-opacity-30 ${styles.radius} overflow-hidden
            ${styles.secondary} bg-opacity-30
        `}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide
                    opacity-70 hover:opacity-100 transition-opacity select-none
                `}
            >
                <Brain size={14} className="opacity-70" />
                <span className="flex-1 text-left">{t.thinkingProcess}</span>
                <span className="flex items-center gap-1 opacity-50">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
            </button>
            
            {isOpen && (
                <div className={`
                    p-3 text-xs border-t border-dashed ${styles.borderColor} border-opacity-30
                    markdown-body
                `}>
                   <MarkdownRenderer text={content} theme={theme} />
                </div>
            )}
        </div>
    );
});

const ToolDetails: React.FC<{ content: string; theme: Theme; language: Language; index: number }> = React.memo(({ content, theme, language, index }) => {
    const styles = THEME_STYLES[theme];
    
    // ... (parsing logic same as before) ...
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
        <div className={`p-2 border-l-2 ${styles.borderColor} ml-1 border-opacity-30`}>
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
                             <div className={`pl-4 border-l ${styles.borderColor} border-opacity-20`}>
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
    state: 'running' | 'completed';
}> = React.memo(({ name, count, rawContents, theme, language = 'en', state }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const styles = THEME_STYLES[theme];

    const { label, isRunning } = useMemo(() => {
        const isRunning = state === 'running';
        let label = '';
        if (language === 'zh') label = isRunning ? '运行中...' : '已执行';
        else if (language === 'ja') label = isRunning ? '実行中...' : '完了';
        else label = isRunning ? 'Running...' : 'Executed';
        return { label, isRunning };
    }, [state, language]);

    return (
        <div className={`
            my-1 border-l-2 font-mono text-xs overflow-hidden transition-all duration-200 ${styles.radius}
            ${styles.secondary} bg-opacity-20 ${styles.borderColor} border-opacity-50
        `}>
           <div 
             onClick={() => setIsExpanded(!isExpanded)}
             className="flex items-center justify-between px-2 py-1.5 cursor-pointer select-none"
           >
              <div className="flex items-center gap-2 opacity-80">
                 <div className="relative w-3 h-3 flex items-center justify-center">
                    {isRunning ? (
                        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    ) : (
                        <Terminal size={12} className={styles.text} />
                    )}
                 </div>
                 
                 <div className="flex items-baseline gap-2">
                    <span className="font-bold opacity-70">
                        {name}
                    </span>
                    <span className={`text-[10px] ${isRunning ? 'text-blue-500' : 'opacity-40'}`}>
                       {isRunning ? '...' : ''}
                    </span>
                 </div>
              </div>

              <div className="flex items-center gap-2 opacity-50">
                 {count > 1 && (
                     <span className="text-[10px] font-bold">x{count}</span>
                 )}
                 {isExpanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
              </div>
           </div>

           {isExpanded && (
               <div className={`p-2 space-y-2 border-t border-dashed ${styles.borderColor} border-opacity-30`}>
                   {rawContents.map((content, idx) => (
                       <ToolDetails key={idx} content={content} index={idx} theme={theme} language={language} />
                   ))}
               </div>
           )}
        </div>
    );
});

// ... (parseMessageContent remains the same) ...
const parseMessageContent = (content: string, theme: Theme, language: Language, isStreamingMessage: boolean) => {
    const regex = /(<thinking>[\s\S]*?(?:<\/thinking>|$)|<tool_action[\s\S]*?(?:<\/tool_action>|$))/gi;
    const parts = content.split(regex);
    const renderedNodes: React.ReactNode[] = [];
    let pendingTools: string[] = [];
    let currentToolName = '';

    const flushTools = (isFinal: boolean) => {
        if (pendingTools.length > 0) {
            const state = (isFinal && isStreamingMessage) ? 'running' : 'completed';
            renderedNodes.push(
                <ToolActionBlock 
                    key={`tool-group-${renderedNodes.length}`} 
                    name={currentToolName} 
                    count={pendingTools.length} 
                    rawContents={[...pendingTools]} 
                    theme={theme} 
                    language={language}
                    state={state}
                />
            );
            pendingTools = [];
            currentToolName = '';
        }
    };

    parts.forEach((part, index) => {
        if (!part.trim()) return;
        if (part.startsWith('<tool_action')) {
            const match = part.match(/name=['"]([^'"]+)['"]/);
            const name = match ? match[1] : 'Unknown';
            if (currentToolName && name !== currentToolName) flushTools(false);
            currentToolName = name;
            pendingTools.push(part);
        } else {
            flushTools(false);
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
    
    // Bubble shape logic
    const bubbleShape = msg.role === 'user' 
        ? (isModern ? 'rounded-2xl rounded-tr-sm' : '') 
        : (isModern ? 'rounded-2xl rounded-tl-sm' : '');

    const bubbleColor = msg.role === 'user'
        ? `${styles.primary} ${styles.primaryText}`
        : `${styles.secondary} ${styles.text}`;

    const hasThinking = useMemo(() => msg.content?.includes('<thinking>'), [msg.content]);
    const hasTool = useMemo(() => msg.content?.includes('<tool_action'), [msg.content]);
    const isHtml = useMemo(() => {
        const trimmed = msg.content.trim();
        return /^\s*<!DOCTYPE html>/i.test(trimmed) || /^\s*<html/i.test(trimmed);
    }, [msg.content]);

    // Force standard width for user messages since they are plain text
    // Only expand width for assistant messages that contain complex UI elements
    const isWide = msg.role !== 'user' && (hasThinking || hasTool || isHtml);

    return (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div 
            className={`
              p-4 ${styles.borderWidth} ${styles.borderColor} ${styles.shadow} ${styles.radius} ${bubbleShape}
              ${isWide ? 'max-w-[98%] md:max-w-[95%]' : 'max-w-[90%] md:max-w-[75%]'}
              ${bubbleColor}
            `}
          >
            <div className="flex justify-between items-center mb-2 gap-2 opacity-80">
              <div className={`text-[10px] font-bold uppercase tracking-widest`}>
                {msg.role}
              </div>
              {msg.role === 'assistant' && msg.content && (
                 <CopyButton content={msg.content} />
              )}
            </div>
            <div className={`leading-relaxed text-sm ${styles.font}`}>
              {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              ) : (
                  msg.content ? (
                      isHtml ? (
                          <HtmlPreviewBlock code={msg.content} theme={theme} defaultPreview={true} />
                      ) : (
                          parseMessageContent(msg.content, theme, language, isStreaming && isLast)
                      )
                  ) : (
                      <div className="flex items-center gap-2 py-2 opacity-70">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="animate-pulse">Thinking...</span>
                      </div>
                  )
              )}
              {isStreaming && isLast && msg.content && msg.role !== 'user' && (
                  <span className="inline-block w-2 h-4 bg-current ml-1 animate-cursor align-middle"></span>
              )}
            </div>
          </div>
        </div>
    );
});

// ... (Chat component shell logic largely same, but using styles from THEME_STYLES) ...

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
  
  const isStreaming = externalIsStreaming || localIsStreaming;
  const scrollRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true); 

  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];

  // ... (Effect hooks same as before) ...
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

  const handleScroll = () => {
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isNearBottom = distanceFromBottom < 100;
      shouldAutoScrollRef.current = isNearBottom;
  };

  useLayoutEffect(() => {
      if (scrollRef.current && shouldAutoScrollRef.current && !searchQuery) {
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
    shouldAutoScrollRef.current = true;
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
            ${theme === targetTheme ? `bg-black/5 ${styles.sidebarBorder}` : ''}
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
            ${language === targetLang ? `bg-black/5 ${styles.sidebarBorder}` : ''}
        `}
      >
         <span className="w-4 text-center">{targetLang.toUpperCase()}</span> {label}
      </button>
  );

  return (
    <div className={`flex flex-col h-full relative z-10 ${styles.font}`}>
      
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
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
                isStreaming={isStreaming}
                isLast={index === messages.length - 1}
            />
          ))
        )}
      </div>

      <div className={`p-4 ${styles.headerBorder} ${styles.secondary} relative z-[70]`}>
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeModel ? `Message ${activeModel.name}...` : "Select a model from the sidebar to start..."}
            disabled={isDisabled && !input.startsWith('/')}
            className={`
              w-full p-3 pr-12 min-h-[60px] max-h-[200px] resize-none outline-none
              ${styles.borderWidth} ${styles.borderColor} ${styles.radius}
              ${isDisabled ? 'bg-gray-200 cursor-not-allowed text-gray-500' : `${styles.inputBg} ${styles.text} focus:shadow-lg`}
              placeholder-current placeholder-opacity-50
              transition-all
              relative z-50
            `}
          />
          
          <div className="flex justify-between mt-2 items-center relative z-50">
             <div className="flex gap-2 items-center">
                <div className="relative" ref={themeRef}>
                    {showThemeMenu && (
                        <div className={`
                            absolute bottom-full left-0 mb-2 w-48 
                            ${styles.borderWidth} ${styles.borderColor} ${styles.radius}
                            ${styles.secondary} ${styles.text} ${styles.shadow}
                            flex flex-col z-[70] overflow-hidden
                        `}>
                             <ThemeOption targetTheme={Theme.LIGHT} icon={<Sun size={14}/>} label={t.themeDay} />
                             <ThemeOption targetTheme={Theme.DARK} icon={<Moon size={14}/>} label={t.themeNight} />
                             <ThemeOption targetTheme={Theme.MODERN_LIGHT} icon={<Laptop size={14}/>} label={t.themeModernDay} />
                             <ThemeOption targetTheme={Theme.MODERN_DARK} icon={<Laptop size={14}/>} label={t.themeModernNight} />
                             <ThemeOption targetTheme={Theme.CLAY} icon={<Coffee size={14}/>} label={t.themeClay} />
                             <ThemeOption targetTheme={Theme.BIOLUMINESCENCE} icon={<Zap size={14}/>} label={t.themeBiolum} />
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
                            absolute bottom-full left-0 mb-2 w-32 
                            ${styles.borderWidth} ${styles.borderColor} ${styles.radius}
                            ${styles.secondary} ${styles.text} ${styles.shadow}
                            flex flex-col z-[70] overflow-hidden
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
                {!isStreaming && (
                    <div className="relative group">
                        <PixelButton
                            theme={theme}
                            variant="secondary" 
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
