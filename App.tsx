
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Theme, LLMProvider, LLMModel, Message, AceConfig, Language, ChatSession } from './types';
import { INITIAL_ACE_CONFIG, THEME_STYLES, TRANSLATIONS, getProviderIcon } from './constants';
import { PixelButton, PixelSelect, PixelCard } from './components/PixelUI';
import { ModelManager } from './components/ModelManager';
import { Chat } from './components/Chat';
import { Mascot } from './components/Mascot';
import { Settings, Search, ChevronLeft, ChevronRight, Trash2, RefreshCcw, AlertCircle, MessageSquare, MessageSquareOff } from 'lucide-react';
import { ApiClient } from './services/apiClient';
import { streamChatResponse, fetchMascotComment } from './services/llmService';

const App: React.FC = () => {
  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendOffline, setIsBackendOffline] = useState(false);
  
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);
  const [language, setLanguage] = useState<Language>('zh');
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [aceConfig, setAceConfig] = useState<AceConfig>(INITIAL_ACE_CONFIG);
  const [activeModelId, setActiveModelId] = useState<string>('');
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  
  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  
  // Abort Controller
  const abortControllerRef = useRef<AbortController | null>(null);
  const initRef = useRef(false);

  // Delete Modal State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mascotState, setMascotState] = useState<'idle' | 'thinking' | 'happy' | 'shocked'>('idle');
  const [mascotComment, setMascotComment] = useState<string | null>(null);
  const [isMascotEnabled, setIsMascotEnabled] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [rainbowMode, setRainbowMode] = useState(false);

  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];
  const isModern = styles.type === 'modern';

  // --- Effects ---
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initData = async () => {
        try {
            const fetchedProviders = await ApiClient.getProviders();
            setProviders(fetchedProviders);
            const fetchedModels = await ApiClient.getAllModels();
            setModels(fetchedModels);
            
            if (fetchedProviders.length === 0 && fetchedModels.length === 0) {
                 console.warn("No providers found. Backend might be offline or unconfigured.");
            }

            if (fetchedModels.length > 0) {
                setActiveModelId(fetchedModels[0].id);
            }
            await refreshSessions();
        } catch (e) {
            console.error("Initialization failed:", e);
            setIsBackendOffline(true);
        } finally {
            setIsLoading(false);
        }
    };
    initData();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
        if (!activeSessionId) return;
        const fetchedMessages = await ApiClient.getSessionMessages(activeSessionId);
        setMessages(fetchedMessages || []);
    };
    loadHistory();
  }, [activeSessionId]);

  const refreshSessions = async () => {
      const apiSessions = await ApiClient.getActiveSessions(-1);
      const mappedSessions: ChatSession[] = apiSessions.map(s => ({
          id: s.sessionId,
          title: `Session ${s.sessionId.substring(0,6)}`,
          lastUpdated: s.lastActivityAt,
          messages: []
      }));
      setSessions(mappedSessions);
      if (mappedSessions.length > 0 && !activeSessionId) {
          setActiveSessionId(mappedSessions[0].id);
      } else if (mappedSessions.length === 0) {
          createNewSession();
      }
  };

  const createNewSession = () => {
      const newId = `session-${Date.now()}`;
      const newSession: ChatSession = {
          id: newId,
          title: 'New Conversation',
          lastUpdated: Date.now(),
          messages: []
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newId);
      setMessages([]);
  };

  const chatModels = models.filter(m => m.type === 'chat' || m.type === 'multimodal' || m.type === 'nlp' as any || !m.type);
  const activeModel = models.find(m => m.id === activeModelId) || null;
  const activeProvider = activeModel ? providers.find(p => p.id === activeModel.providerId) || null : null;

  useEffect(() => {
    if (chatModels.length > 0) {
       const currentExists = chatModels.some(m => m.id === activeModelId);
       if (!currentExists) setActiveModelId(chatModels[0].id);
    } else {
        if (activeModelId !== '') setActiveModelId('');
    }
  }, [models, activeModelId]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!isMascotEnabled) return;
    if (Math.random() < 0.3 && !mascotComment && activeModel) {
        const fetchComment = async () => {
            const systemPrompt = localStorage.getItem('pixel_mascot_system_prompt') || '';
            const comment = await fetchMascotComment(messages, activeModel.modelId, systemPrompt);
            if (comment) setMascotComment(comment);
        };
        fetchComment();
    }
  }, [messages.length, activeModel, isMascotEnabled]);

  const handleMascotSpeechEnd = useCallback(() => {
    setMascotComment(null);
  }, []);

  const handleRainbowTrigger = () => {
      setRainbowMode(prev => !prev);
      setMascotState('shocked');
  };

  useEffect(() => {
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let cursor = 0;
    const handler = (e: KeyboardEvent) => {
      if (e.key === konami[cursor]) {
        cursor++;
        if (cursor === konami.length) {
          handleRainbowTrigger();
          alert("★ KONAMI CODE ACTIVATED: RAINBOW MODE ★");
          cursor = 0;
        }
      } else {
        cursor = 0;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleUpdateMessage = (id: string, content: string) => {
    setMessages(prev => prev.map(msg => msg.id === id ? { ...msg, content } : msg));
  };

  const handleDeleteSessionRequest = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSessionToDelete(id);
      setShowDeleteDialog(true);
  };

  const confirmDeleteSession = async () => {
      if (!sessionToDelete) return;
      try {
          await ApiClient.deleteSession(sessionToDelete);
          const newSessions = sessions.filter(s => s.id !== sessionToDelete);
          setSessions(newSessions);
          if (activeSessionId === sessionToDelete) {
              if (newSessions.length > 0) setActiveSessionId(newSessions[0].id);
              else createNewSession();
          }
      } catch (e) {
          console.error("Delete failed", e);
      } finally {
          setShowDeleteDialog(false);
          setSessionToDelete(null);
      }
  };

  const handleStopGeneration = async () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      if (currentRequestId) {
          try { await ApiClient.interruptRequest(currentRequestId); } catch(e) { console.error("Failed to interrupt", e); }
      }
      setIsStreaming(false);
      setCurrentRequestId(null);
      setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
              return prev.map((msg, idx) => 
                  idx === prev.length - 1 
                  ? { ...msg, content: msg.content + `\n\n> ${t.interrupted}` } 
                  : msg
              );
          }
          return prev;
      });
  };

  const handleSendMessage = async (msg: Message, options?: { deepThinkingEnabled: boolean }) => {
     if (msg.role === 'assistant') {
         setMessages(prev => [...prev, msg]);
         return; 
     }
     setMessages(prev => [...prev, msg]);
     setIsStreaming(true);
     setMascotState('thinking');
     if (!activeModel || !activeProvider) {
         setIsStreaming(false);
         return;
     }
     const botMsgId = (Date.now() + 1).toString();
     const botMsg: Message = {
         id: botMsgId, role: 'assistant', content: '', timestamp: Date.now() + 1
     };
     setMessages(prev => [...prev, botMsg]);

     const ac = new AbortController();
     abortControllerRef.current = ac;
     let fullContent = '';

     await streamChatResponse(
         [...messages, msg], activeModel, activeProvider, 
         (chunk) => {
            fullContent += chunk;
            handleUpdateMessage(botMsgId, fullContent);
         },
         (requestId) => setCurrentRequestId(requestId),
         activeSessionId, ac.signal, options?.deepThinkingEnabled
     );

     if (abortControllerRef.current === ac) {
         setIsStreaming(false);
         setCurrentRequestId(null);
         setMascotState('happy');
         setTimeout(() => setMascotState('idle'), 2000);
         refreshSessions();
         abortControllerRef.current = null;
     }
  };

  if (isLoading) {
      return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center ${styles.bg} ${styles.text} flex-col gap-4`}>
               <Mascot theme={theme} state="thinking" className="w-32 h-32 animate-bounce" />
               <div className="text-2xl font-bold animate-pulse tracking-widest">INITIALIZING PIXELVERSE...</div>
          </div>
      );
  }

  // Determine root class for scrollbars and fonts
  const rootThemeClass = styles.type === 'pixel' ? 'theme-pixel' : 'theme-modern';

  return (
    <div className={`
      flex h-screen w-screen overflow-hidden ${styles.bg} ${styles.text} transition-colors duration-500 
      ${!isModern ? 'scanline-effect' : ''} 
      ${rainbowMode ? 'rainbow-mode' : ''}
      ${styles.font} ${rootThemeClass}
    `}>
      
      {showDeleteDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <PixelCard theme={theme} className={`w-[90%] max-w-[350px] flex flex-col gap-4 ${styles.borderColor} animate-float`}>
                <div className="flex items-center gap-2 text-red-500 font-bold text-xl border-b pb-2 border-current">
                    <Trash2 /> {t.deleteSessionTitle}
                </div>
                <div className="py-2">
                    <p className="font-bold text-lg leading-tight mb-2">{t.deleteSessionConfirm}</p>
                    <p className="text-sm opacity-80">{t.deleteSessionDesc}</p>
                </div>
                <div className="flex justify-end gap-4 mt-2">
                    <PixelButton theme={theme} variant="secondary" onClick={() => setShowDeleteDialog(false)}>{t.cancel}</PixelButton>
                    <PixelButton theme={theme} variant="danger" onClick={confirmDeleteSession}>{t.deleteAction}</PixelButton>
                </div>
            </PixelCard>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'w-64' : 'w-0'} 
        ${styles.sidebarBorder} flex flex-col
        ${styles.secondary} relative z-20 overflow-hidden whitespace-nowrap transition-all duration-300
      `}>
        <div className={`p-4 ${styles.headerBorder} flex justify-between items-center min-h-[60px]`}>
            <h1 className={`text-2xl font-bold ${styles.text} tracking-tighter`}>PixelVerse</h1>
        </div>

        <div className={`p-4 ${styles.headerBorder} space-y-2`}>
            <label className={`text-xs font-bold ${styles.textMuted}`}>{t.currentChatModel}</label>
            <PixelSelect 
                theme={theme} 
                value={activeModelId} 
                onChange={(e) => setActiveModelId(e.target.value)}
                className="text-sm"
            >
                {chatModels.length === 0 && <option value="">{t.noChatModels}</option>}
                {chatModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </PixelSelect>
            <PixelButton theme={theme} variant="primary" className="w-full text-xs" onClick={() => setIsModelManagerOpen(true)}>
                <Settings size={12} /> {t.configLlms}
            </PixelButton>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className={`flex justify-between items-center px-2 py-1 ${styles.textMuted}`}>
                <span className="text-xs font-bold uppercase tracking-wider">{t.history}</span>
                <button onClick={refreshSessions} title="Refresh"><RefreshCcw size={12}/></button>
            </div>
            <PixelButton theme={theme} variant="primary" className="w-full text-xs mb-2" onClick={createNewSession}>
                + {t.newChat}
            </PixelButton>
            
            {sessions.map(session => (
                <div 
                    key={session.id} 
                    onClick={() => setActiveSessionId(session.id)}
                    className={`
                        p-2 ${styles.borderWidth} ${styles.borderColor} cursor-pointer text-sm truncate flex justify-between items-center group
                        ${styles.radius}
                        ${activeSessionId === session.id ? 'bg-black/10 font-bold' : 'hover:bg-black/5'}
                        ${styles.text}
                    `}
                >
                    <span className="truncate w-32">{session.title}</span>
                    <button 
                        onClick={(e) => handleDeleteSessionRequest(e, session.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-100 rounded p-1"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            ))}
        </div>

        <div className="p-2 pb-8 flex items-end justify-center relative">
            <Mascot 
                theme={theme} 
                state={mascotState} 
                className={`w-32 h-32 ${isModern ? 'opacity-90 grayscale-[0.2]' : ''}`}
                speechText={mascotComment}
                onSpeechEnd={handleMascotSpeechEnd}
            />
            <button 
                onClick={() => setIsMascotEnabled(!isMascotEnabled)}
                className={`
                    absolute bottom-4 right-4 p-1.5 ${styles.radius} ${styles.borderWidth} ${styles.borderColor} ${styles.shadow}
                    transition-all active:translate-y-0.5 active:shadow-none
                    ${isMascotEnabled ? 'bg-green-400 text-black' : 'bg-gray-400 text-gray-700'}
                `}
                title={isMascotEnabled ? "Mascot Speech: ON" : "Mascot Speech: OFF"}
            >
                {isMascotEnabled ? <MessageSquare size={14} /> : <MessageSquareOff size={14} />}
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10 h-full">
         <div className={`h-14 min-h-[56px] ${styles.headerBorder} flex items-center px-4 justify-between ${styles.secondary}`}>
             <div className="flex items-center gap-4">
                <PixelButton 
                  theme={theme} 
                  variant="secondary" 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="!p-0 w-8 h-8 flex items-center justify-center shrink-0"
                  style={{ padding: 0 }}
                  title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                >
                    {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                </PixelButton>

                <span className={`font-bold ${styles.text} uppercase flex items-center gap-2 truncate`}>
                   <div className="w-5 h-5 flex items-center justify-center">
                     {activeProvider ? getProviderIcon(activeProvider.type) : <div className="w-4 h-4 bg-gray-500 rounded-full" />}
                   </div>
                   {activeModel?.name || t.noModelSelected}
                   {activeModel && <span className={`text-xs px-2 py-0.5 ${styles.borderWidth} ${styles.borderColor} ${styles.radius} bg-green-400 text-black`}>{t.online}</span>}
                </span>
             </div>
             <div className="flex gap-2">
                 {isBackendOffline && (
                    <div className="flex items-center gap-2 text-xs font-bold text-red-500 border-2 border-red-500 px-2 py-1 animate-pulse bg-red-100 rounded">
                        <AlertCircle size={14} /> API OFFLINE
                    </div>
                 )}
                 <div className="relative hidden md:block">
                     <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`
                            pl-8 pr-2 py-1 ${styles.borderWidth} ${styles.borderColor} text-sm w-48 
                            ${styles.inputBg} ${styles.text} ${styles.radius} placeholder-opacity-50 outline-none
                            focus:shadow-md transition-shadow
                        `} 
                     />
                     <Search className={`absolute left-2 top-1.5 w-4 h-4 opacity-50 ${styles.text}`} />
                 </div>
             </div>
         </div>

         <div className="flex-1 overflow-hidden bg-white/5 relative">
             <Chat 
                theme={theme}
                language={language}
                messages={messages}
                activeModel={activeModel}
                provider={activeProvider}
                onSendMessage={handleSendMessage}
                onUpdateMessage={handleUpdateMessage}
                setMascotState={setMascotState}
                onTriggerRainbow={handleRainbowTrigger}
                setTheme={setTheme}
                setLanguage={setLanguage}
                isMoonlightUnlocked={false}
                searchQuery={searchQuery}
                onStop={handleStopGeneration}
                isStreaming={isStreaming}
             />
         </div>
      </div>

      {isModelManagerOpen && (
        <ModelManager 
            theme={theme}
            language={language}
            providers={providers}
            models={models}
            aceConfig={aceConfig}
            onUpdateProviders={setProviders}
            onUpdateModels={setModels}
            onUpdateAceConfig={setAceConfig}
            onClose={() => setIsModelManagerOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
