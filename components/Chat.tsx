
import React, { useState, useEffect, useRef } from 'react';
import { Theme, Message, LLMModel, LLMProvider, Language } from '../types';
import { PixelButton, PixelBadge } from './PixelUI';
import { streamChatResponse } from '../services/llmService';
import { THEME_STYLES, TRANSLATIONS } from '../constants';
import { Send, Copy, Check, Moon, Sun, Star, Cpu, Globe, Palette, Loader2, Brain, ChevronDown, ChevronRight } from 'lucide-react';

interface ChatProps {
  theme: Theme;
  language: Language;
  messages: Message[];
  activeModel: LLMModel | null;
  provider: LLMProvider | null;
  onSendMessage: (msg: Message) => void;
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

const ThinkingBlock: React.FC<{ content: string; theme: Theme; language: Language }> = ({ content, theme, language }) => {
    const [isOpen, setIsOpen] = useState(false);
    const styles = THEME_STYLES[theme];
    const t = TRANSLATIONS[language];

    return (
        <div className={`
            my-3 border-2 border-dashed border-opacity-50
            ${theme === Theme.LIGHT ? 'border-gray-400 bg-gray-50' : 'border-gray-600 bg-black/20'}
        `}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide
                    opacity-70 hover:opacity-100 transition-opacity
                `}
            >
                <Brain size={14} />
                <span className="flex-1 text-left">{t.thinkingProcess}</span>
                <span className="flex items-center gap-1 opacity-50">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {isOpen ? t.collapse : t.expand}
                </span>
            </button>
            
            {isOpen && (
                <div className={`
                    p-3 text-xs font-mono whitespace-pre-wrap leading-relaxed border-t-2 border-dashed border-opacity-30
                    ${theme === Theme.LIGHT ? 'border-gray-400 text-gray-700' : 'border-gray-600 text-gray-400'}
                `}>
                    {content}
                </div>
            )}
        </div>
    );
};

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
  
  const isStreaming = externalIsStreaming || localIsStreaming;

  const scrollRef = useRef<HTMLDivElement>(null);
  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];

  // Close menus on click outside (simple implementation via backdrop)
  const closeMenus = () => {
      setShowThemeMenu(false);
      setShowLangMenu(false);
  };

  // Filter messages based on search query
  const displayMessages = searchQuery.trim()
    ? messages.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
        msg.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  useEffect(() => {
    // Only auto-scroll if not searching (to allow reading search results)
    if (scrollRef.current && !searchQuery) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, searchQuery]);

  const handleSend = async () => {
    // EASTER EGG: Hidden Command
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

    onSendMessage(userMsg);
    setInput('');
    setMascotState('thinking');
    setLocalIsStreaming(true);
  };

  // Reset local streaming state if messages change or parent signals stop
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
  // Allow clicking the button if it's streaming (to stop)
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

  // Parse message for <thinking> tags
  const parseMessageContent = (content: string) => {
      // Split by <thinking> tag.
      // Format: [pre-text, thought_started...]
      const parts = content.split('<thinking>');
      
      return parts.map((part, index) => {
          if (index === 0) {
              // This is the text before any thinking tag (or the whole text if no tag)
              return <span key={`text-${index}`}>{part}</span>;
          }

          // This part started with <thinking>, so check if it has a closing tag
          const closingIndex = part.indexOf('</thinking>');
          
          if (closingIndex !== -1) {
              // It's a closed thought
              const thought = part.substring(0, closingIndex);
              const rest = part.substring(closingIndex + 11); // 11 is length of </thinking>
              
              return (
                  <React.Fragment key={`group-${index}`}>
                      <ThinkingBlock content={thought} theme={theme} language={language} />
                      {/* Recursively parse the rest just in case multiple thinking blocks exist (rare but possible) */}
                      {parseMessageContent(rest)}
                  </React.Fragment>
              );
          } else {
              // It's an open thought (Streaming case or malformed)
              // We render it as a thinking block that contains the rest of the text
              return (
                  <ThinkingBlock key={`thinking-${index}`} content={part} theme={theme} language={language} />
              );
          }
      });
  };

  return (
    <div className="flex flex-col h-full relative z-10">
      {/* Backdrop for menus */}
      {(showThemeMenu || showLangMenu) && (
          <div className="fixed inset-0 z-[60] cursor-default" onClick={closeMenus}></div>
      )}

      {/* Chat Area */}
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
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`
                  max-w-[80%] p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
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
                <div className="whitespace-pre-wrap leading-relaxed font-chat text-sm">
                  {msg.content ? (
                      parseMessageContent(msg.content)
                  ) : (
                      // Loading state for empty content (typically last message during generation)
                      <div className="flex items-center gap-2 py-2 opacity-70">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="font-pixel-verse animate-pulse">Thinking...</span>
                      </div>
                  )}
                  {/* Cursor effect if it's the last message and streaming and has content */}
                  {isStreaming && index === messages.length - 1 && msg.content && (
                      <span className="inline-block w-2 h-4 bg-current ml-1 animate-cursor align-middle"></span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
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
                {/* Theme Switcher */}
                <div className="relative">
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
                        title="Change Theme"
                        onClick={() => {
                            if (!showThemeMenu) setShowLangMenu(false);
                            setShowThemeMenu(!showThemeMenu);
                        }}
                    >
                        <Palette size={20} />
                    </PixelButton>
                </div>

                {/* Language Switcher */}
                <div className="relative">
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
                        title="Change Language"
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
