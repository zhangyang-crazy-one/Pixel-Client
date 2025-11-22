
import React, { useState, useEffect } from 'react';
import { Theme, LLMProvider, LLMModel, Message, AceConfig, Language } from './types';
import { INITIAL_ACE_CONFIG, THEME_STYLES, MASCOT_COMMENTS, TRANSLATIONS } from './constants';
import { PixelButton, PixelSelect } from './components/PixelUI';
import { ModelManager } from './components/ModelManager';
import { Chat } from './components/Chat';
import { Mascot } from './components/Mascot';
import { Settings, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ApiClient } from './services/apiClient';

const App: React.FC = () => {
  // --- State ---
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);
  const [language, setLanguage] = useState<Language>('zh');
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [models, setModels] = useState<LLMModel[]>([]);
  const [aceConfig, setAceConfig] = useState<AceConfig>(INITIAL_ACE_CONFIG);
  const [activeModelId, setActiveModelId] = useState<string>('');
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mascotState, setMascotState] = useState<'idle' | 'thinking' | 'happy' | 'shocked'>('idle');
  const [mascotComment, setMascotComment] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Easter Egg States
  const [rainbowMode, setRainbowMode] = useState(false);
  const [isMoonlightUnlocked, setIsMoonlightUnlocked] = useState(false);

  // --- Effects ---
  // Initial Data Fetch
  useEffect(() => {
    const initData = async () => {
        const fetchedProviders = await ApiClient.getProviders();
        setProviders(fetchedProviders);
        const fetchedModels = await ApiClient.getAllModels();
        setModels(fetchedModels);
        
        if (fetchedModels.length > 0) {
            setActiveModelId(fetchedModels[0].id);
        }
    };
    initData();
  }, []);

  // --- Derived State ---
  // Filter models for the chat dropdown (only chat/nlp models)
  const chatModels = models.filter(m => m.type === 'chat' || m.type === 'nlp' as any || !m.type);

  const activeModel = models.find(m => m.id === activeModelId) || null;
  const activeProvider = activeModel ? providers.find(p => p.id === activeModel.providerId) || null : null;
  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];

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

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${styles.bg} ${styles.text} transition-colors duration-500 scanline-effect ${rainbowMode ? 'rainbow-mode' : ''}`}>
      
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

        {/* History List (Mock) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="text-xs opacity-50 text-center py-2">- {t.history} -</div>
            {[1, 2, 3].map(i => (
                <div key={i} className={`p-2 border-2 border-black hover:bg-black/10 cursor-pointer ${styles.text} text-sm truncate`}>
                    {t.session} 00{i}: Project Kirby
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
                onSendMessage={(msg) => setMessages(prev => [...prev, msg])}
                onUpdateMessage={handleUpdateMessage}
                setMascotState={setMascotState}
                onTriggerRainbow={handleRainbowTrigger}
                setTheme={setTheme}
                setLanguage={setLanguage}
                isMoonlightUnlocked={isMoonlightUnlocked}
                searchQuery={searchQuery}
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
