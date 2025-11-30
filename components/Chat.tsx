
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Theme, Message, LLMModel, LLMProvider, Language } from '../types';
import { PixelButton, PixelBadge } from './PixelUI';
import { streamChatResponse } from '../services/llmService';
import { THEME_STYLES, TRANSLATIONS } from '../constants';
import { Send, Copy, Check, Moon, Sun, Star, Cpu, Globe, Palette, Loader2, Brain, ChevronDown, ChevronRight, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
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

// Memoized Markdown Renderer to prevent re-parsing on every render
const MarkdownRenderer: React.FC<{ text: string; theme: Theme }> = React.memo(({ text, theme }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />,
            code: ({node, inline, className, children, ...props}: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const lang = match ? match[1] : '';
                const isMermaid = lang === 'mermaid';
                
                if (!inline && isMermaid) {
                    return <MermaidBlock code={String(children).replace(/\n$/, '')} theme={theme} />;
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
));

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

const parseMessageContent = (content: string, theme: Theme, language: Language) => {
    // Regex to split by <thinking> tags, capturing the content in between
    const parts = content.split('<thinking>');
    
    if (parts.length === 1) {
        return (
            <div className="markdown-body">
                 <MarkdownRenderer text={content} theme={theme} />
            </div>
        );
    }

    return parts.map((part, index) => {
        if (index === 0) {
            // Text before the first <thinking> tag (usually empty, but handle just in case)
            if (!part.trim()) return null;
            return (
              <div key={`text-${index}`} className="markdown-body">
                  <MarkdownRenderer text={part} theme={theme} />
              </div>
            );
        }

        const closingIndex = part.indexOf('</thinking>');
        
        if (closingIndex !== -1) {
            const thought = part.substring(0, closingIndex);
            const rest = part.substring(closingIndex + 11); // 11 is length of </thinking>
            
            return (
                <React.Fragment key={`group-${index}`}>
                    <ThinkingBlock content={thought} theme={theme} language={language} />
                    {rest.trim() && (
                        <div className="markdown-body">
                           <MarkdownRenderer text={rest} theme={theme} />
                        </div>
                    )}
                </React.Fragment>
            );
        } else {
            // Unclosed thinking tag (streaming)
            return (
                <ThinkingBlock key={`thinking-${index}`} content={part} theme={theme} language={language} />
            );
        }
    });
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

    return (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div 
            className={`
              p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
              ${hasThinking ? 'md:max-w-[95%]' : 'md:max-w-[60%]'}
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
                  parseMessageContent(msg.content, theme, language)
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
