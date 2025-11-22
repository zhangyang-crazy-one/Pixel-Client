
import React, { useState, useEffect } from 'react';
import { Theme, LLMProvider, LLMModel, Message, AceConfig, Language, ChatSession } from './types';
import { INITIAL_ACE_CONFIG, THEME_STYLES, MASCOT_COMMENTS, TRANSLATIONS } from './constants';
import { PixelButton, PixelSelect, PixelCard } from './components/PixelUI';
import { ModelManager } from './components/ModelManager';
import { Chat } from './components/Chat';
import { Mascot } from './components/Mascot';
import { Settings, Search, ChevronLeft, ChevronRight, Trash2, RefreshCcw, AlertCircle, AlertTriangle } from 'lucide-react';
import { ApiClient } from './services/apiClient';
import { streamChatResponse } from './services/llmService';

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

  // Delete Modal State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mascotState, setMascotState] = useState<'idle' | 'thinking' | 'happy' | 'shocked'>('idle');
  const [mascotComment, setMascotComment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Easter Egg States
  const [rainbowMode, setRainbowMode] = useState(false);
  const [isMoonlightUnlocked, setIsMoonlightUnlocked] = useState(false);

  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];

  // --- Effects ---
  // Initial Data Fetch
  useEffect(() => {
    const initData = async () => {
        try {
            const fetchedProviders = await ApiClient.getProviders();
            setProviders(fetchedProviders);
            const fetchedModels = await ApiClient.getAllModels();
            setModels(fetchedModels);
            
            // Check if backend seems offline (empty arrays often indicate connection failure in this setup)
            if (fetchedProviders.length === 0 && fetchedModels.length === 0) {
                 // We don't set isBackendOffline=true strictly here as it might just be a fresh install
                 // But we can log a warning
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

  // Fetch history when session changes
  useEffect(() => {
    const loadHistory = async () => {
        if (!activeSessionId) return;
        
        // Use the new getSessionMessages endpoint
        const fetchedMessages = await ApiClient.getSessionMessages(activeSessionId);
        
        // If API returns messages, set them. Otherwise start fresh.
        setMessages(fetchedMessages || []);
    };
    loadHistory();
  }, [activeSessionId]);

  const refreshSessions = async () => {
      const apiSessions = await ApiClient.getActiveSessions();
      // Map API sessions to ChatSession type
      const mappedSessions: ChatSession[] = apiSessions.map(s => ({
          id: s.sessionId,
          title: `Session ${s.sessionId.substring(0,6)}`,
          lastUpdated: s.lastActivityAt,
          messages: [] // Messages are loaded on select
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

  // --- Derived State ---
  // Filter models for the chat dropdown (only chat/nlp models)
  const chatModels = models.filter(m => m.type === 'chat' || m.type === 'nlp' as any || !m.type);

  const activeModel = models.find(m => m.id === activeModelId) || null;
  const activeProvider = activeModel ? providers.find(p => p.id === activeModel.providerId) || null : null;

  // Ensure activeModelId points to a valid chat model if the current one is deleted
  useEffect(() => {
    if (chatModels.length > 0) {
       const currentExists = chatModels.some(m => m.id === activeModelId);
       if (!currentExists) {
           setActiveModelId(chatModels[0].id);
       }
    } else {
        if (activeModelId !== '') setActiveModelId('');
    }
  }, [models, activeModelId]);

  // Random Mascot Commentary Logic
  useEffect(() => {
    if (messages.length === 0) return;

    // 30% chance to trigger a comment when messages update
    if (Math.random() < 0.3 && !mascotComment) {
        const currentLangComments = MASCOT_COMMENTS[language];
        const randomComment = currentLangComments[Math.floor(Math.random() * currentLangComments.length)];
        setTimeout(() => {
            setMascotComment(randomComment);
        }, 1000);
    }
  }, [messages.length, language]);

  // Achievement: Daily Streak Checker
  useEffect(() => {
    const today = new Date().toDateString();
    const lastLogin = localStorage.getItem('pixel_last_login');
    const streakStr = localStorage.getItem('pixel_streak');
    let streak = streakStr ? parseInt(streakStr) : 0;

    if (lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin === yesterday.toDateString()) {
            streak++;
        } else {
            streak = 1; // Reset if missed a day
        }
        localStorage.setItem('pixel_last_login', today);
        localStorage.setItem('pixel_streak', streak.toString());
    }

    if (streak >= 30) {
        setIsMoonlightUnlocked(true);
        if (localStorage.getItem('pixel_moonlight_notified') !== 'true') {
             alert("🏆 ACHIEVEMENT UNLOCKED: [PIXEL MOONLIGHT] THEME!\n\nYou have used PixelVerse for 30 days in a row.");
             localStorage.setItem('pixel_moonlight_notified', 'true');
        }
    }
  }, []);

  // --- Handlers ---
  
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
      if (currentRequestId) {
          try {
            await ApiClient.interruptRequest(currentRequestId);
          } catch(e) {
              console.error("Failed to interrupt", e);
          }
      }
      setIsStreaming(false);
      setCurrentRequestId(null);
  };

  // Main Chat Handler
  const handleSendMessage = async (msg: Message) => {
     if (msg.role === 'assistant') {
         setMessages(prev => [...prev, msg]);
         return; 
     }

     // 1. Add User Message
     setMessages(prev => [...prev, msg]);
     setIsStreaming(true);
     setMascotState('thinking');
     
     if (!activeModel || !activeProvider) {
         setIsStreaming(false);
         return;
     }

     const botMsgId = (Date.now() + 1).toString();
     
     // 2. Add Empty Assistant Message Immediately (Loading State)
     const botMsg: Message = {
         id: botMsgId,
         role: 'assistant',
         content: '', // Empty content triggers "Thinking" UI in Chat.tsx
         timestamp: Date.now() + 1
     };
     setMessages(prev => [...prev, botMsg]);

     let fullContent = '';

     await streamChatResponse(
         [...messages, msg], // Pass history
         activeModel, 
         activeProvider, 
         (chunk) => {
            fullContent += chunk;
            handleUpdateMessage(botMsgId, fullContent);
         },
         (requestId) => {
             setCurrentRequestId(requestId);
         },
         activeSessionId
     );

     setIsStreaming(false);
     setCurrentRequestId(null);
     setMascotState('happy');
     setTimeout(() => setMascotState('idle'), 2000);
     refreshSessions(); // Update timestamps
  };

  // --- Loading Screen ---
  if (isLoading) {
      return (
          <div className={`fixed inset-0 z-50 flex items-center justify-center ${styles.bg} ${styles.text} flex-col gap-4`}>
               <Mascot theme={theme} state="thinking" className="w-32 h-32 animate-bounce" />
               <div className="text-2xl font-bold animate-pulse tracking-widest">INITIALIZING PIXELVERSE...</div>
               <div className="text-sm opacity-50 font-mono">Establishing Neural Link...</div>
          </div>
      );
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${styles.bg} ${styles.text} transition-colors duration-500 scanline-effect ${rainbowMode ? 'rainbow-mode' : ''}`}>
      
      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <PixelCard theme={theme} className={`w-[90%] max-w-[350px] ${styles.bg} ${styles.text} flex flex-col gap-4 border-4 border-red-500 animate-float`}>
                <div className="flex items-center gap-2 text-red-500 font-bold text-xl border-b-2 border-black pb-2">
                    <Trash2 /> {t.deleteSessionTitle}
                </div>
                <div className="py-2">
                    <p className="font-bold text-lg leading-tight mb-2">
                        {t.deleteSessionConfirm}
                    </p>
                    <p className="text-sm opacity-80">
                        {t.deleteSessionDesc}
                    </p>
                </div>
                <div className="flex justify-end gap-4 mt-2">
                    <PixelButton theme={theme} variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                        {t.cancel}
                    </PixelButton>
                    <PixelButton theme={theme} variant="danger" onClick={confirmDeleteSession}>
                        {t.deleteAction}
                    </PixelButton>
                </div>
            </PixelCard>
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'w-64 border-r-4' : 'w-0 border-r-0'} 
        transition-all duration-300 border-black flex flex-col
        ${styles.secondary} relative z-20 overflow-hidden whitespace-nowrap
      `}>
        <div className={`p-4 border-b-4 border-black flex justify-between items-center min-h-[60px]`}>
            <h1 className={`text-2xl font-bold ${styles.text} tracking-tighter`}>PixelVerse</h1>
        </div>

        {/* Model Selector */}
        <div className="p-4 border-b-2 border-black space-y-2">
            <label className={`text-xs font-bold ${styles.text}`}>{t.currentChatModel}</label>
            <PixelSelect 
                theme={theme} 
                value={activeModelId} 
                onChange={(e) => setActiveModelId(e.target.value)}
                className="text-sm"
            >
                {chatModels.length === 0 && <option value="">{t.noChatModels}</option>}
                {chatModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </PixelSelect>
            <PixelButton theme={theme} variant="secondary" className="w-full text-xs" onClick={() => setIsModelManagerOpen(true)}>
                <Settings size={12} /> {t.configLlms}
            </PixelButton>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="flex justify-between items-center px-2 py-1 opacity-50">
                <span className="text-xs">- {t.history} -</span>
                <button onClick={refreshSessions} title="Refresh"><RefreshCcw size={12}/></button>
            </div>
            <PixelButton theme={theme} variant="secondary" className="w-full text-xs mb-2" onClick={createNewSession}>
                + NEW CHAT
            </PixelButton>
            
            {sessions.map(session => (
                <div 
                    key={session.id} 
                    onClick={() => setActiveSessionId(session.id)}
                    className={`
                        p-2 border-2 border-black cursor-pointer text-sm truncate flex justify-between items-center group
                        ${activeSessionId === session.id ? 'bg-black/10' : 'hover:bg-black/5'}
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

        {/* Mascot Area (Bottom of Sidebar) */}
        <div className="p-2 flex justify-center items-end pb-8">
            <Mascot 
                theme={theme} 
                state={mascotState} 
                className="w-32 h-32"
                speechText={mascotComment}
                onSpeechEnd={() => setMascotComment(null)}
            />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 h-full">
         {/* Top Bar */}
         <div className={`h-14 min-h-[56px] border-b-4 border-black flex items-center px-4 justify-between ${styles.secondary}`}>
             <div className="flex items-center gap-4">
                {/* Integrated Toggle Button */}
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
                   {activeProvider?.icon} {activeModel?.name || t.noModelSelected}
                   {activeModel && <span className={`text-xs px-2 py-0.5 border border-black bg-green-400 text-black`}>{t.online}</span>}
                </span>
             </div>
             <div className="flex gap-2">
                 {isBackendOffline && (
                    <div className="flex items-center gap-2 text-xs font-bold text-red-500 border-2 border-red-500 px-2 py-1 animate-pulse bg-red-100">
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
                            pl-8 pr-2 py-1 border-2 border-black text-sm w-48 font-chat 
                            ${styles.inputBg} ${styles.text} placeholder-opacity-50 outline-none
                            focus:shadow-[2px_2px_0px_rgba(0,0,0,0.2)] transition-shadow
                        `} 
                     />
                     <Search className={`absolute left-2 top-1.5 w-4 h-4 opacity-50 ${styles.text}`} />
                 </div>
             </div>
         </div>

         {/* Chat Container */}
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
                isMoonlightUnlocked={isMoonlightUnlocked}
                searchQuery={searchQuery}
                onStop={handleStopGeneration}
                isStreaming={isStreaming}
             />
         </div>
      </div>

      {/* Global Modals */}
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
