
import React, { useState, useEffect } from 'react';
import { Theme, AppState, LLMProvider, LLMModel, Message } from './types';
import { INITIAL_PROVIDERS, INITIAL_MODELS, THEME_STYLES } from './constants';
import { PixelButton, PixelCard, PixelSelect } from './components/PixelUI';
import { ModelManager } from './components/ModelManager';
import { Chat } from './components/Chat';
import { Mascot } from './components/Mascot';
import { Settings, Moon, Sun, Menu, Search, Star, Cpu } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [theme, setTheme] = useState<Theme>(Theme.DARK);
  const [providers, setProviders] = useState<LLMProvider[]>(INITIAL_PROVIDERS);
  const [models, setModels] = useState<LLMModel[]>(INITIAL_MODELS);
  const [activeModelId, setActiveModelId] = useState<string>(models[0]?.id || '');
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mascotState, setMascotState] = useState<'idle' | 'thinking' | 'happy' | 'shocked'>('idle');
  
  // Easter Egg States
  const [rainbowMode, setRainbowMode] = useState(false);
  const [isMoonlightUnlocked, setIsMoonlightUnlocked] = useState(false);

  // --- Derived State ---
  const activeModel = models.find(m => m.id === activeModelId) || null;
  const activeProvider = activeModel ? providers.find(p => p.id === activeModel.providerId) || null : null;
  const styles = THEME_STYLES[theme];

  // --- Effects ---
  // Ensure activeModelId points to a valid model if the current one is deleted
  useEffect(() => {
    if (models.length > 0) {
       const currentExists = models.some(m => m.id === activeModelId);
       if (!currentExists) {
           setActiveModelId(models[0].id);
       }
    } else {
        if (activeModelId !== '') setActiveModelId('');
    }
  }, [models, activeModelId]);

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

    // Unlock Logic (Set to 30 days, but let's say if streak >= 30)
    // NOTE: For testing, you can manually set localStorage 'pixel_streak' to 30
    if (streak >= 30) {
        setIsMoonlightUnlocked(true);
        if (localStorage.getItem('pixel_moonlight_notified') !== 'true') {
             alert("🏆 ACHIEVEMENT UNLOCKED: [PIXEL MOONLIGHT] THEME!\n\nYou have used PixelVerse for 30 days in a row.");
             localStorage.setItem('pixel_moonlight_notified', 'true');
        }
    }
  }, []);

  // --- Handlers ---
  const toggleTheme = () => {
    setTheme(prev => {
        if (prev === Theme.DARK) return Theme.LIGHT;
        if (prev === Theme.LIGHT) return Theme.FESTIVAL;
        if (prev === Theme.FESTIVAL) return Theme.CYBERPUNK;
        if (prev === Theme.CYBERPUNK) return isMoonlightUnlocked ? Theme.MOONLIGHT : Theme.DARK;
        if (prev === Theme.MOONLIGHT) return Theme.DARK;
        return Theme.DARK;
    });
  };

  // Easter Egg: Rainbow Trigger
  const handleRainbowTrigger = () => {
      setRainbowMode(prev => !prev);
      setMascotState('shocked');
  };

  // Konami Code Easter Egg (Original Plan)
  useEffect(() => {
    const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let cursor = 0;
    const handler = (e: KeyboardEvent) => {
      if (e.key === konami[cursor]) {
        cursor++;
        if (cursor === konami.length) {
          // Konami also triggers rainbow now
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
            <label className={`text-xs font-bold ${styles.text}`}>CURRENT MODEL</label>
            <PixelSelect 
                theme={theme} 
                value={activeModelId} 
                onChange={(e) => setActiveModelId(e.target.value)}
                className="text-sm"
            >
                {models.length === 0 && <option value="">No Models Available</option>}
                {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
            </PixelSelect>
            <PixelButton theme={theme} variant="secondary" className="w-full text-xs" onClick={() => setIsModelManagerOpen(true)}>
                <Settings size={12} /> CONFIG LLMs
            </PixelButton>
        </div>

        {/* History List (Mock) */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <div className="text-xs opacity-50 text-center py-2">- HISTORY -</div>
            {[1, 2, 3].map(i => (
                <div key={i} className={`p-2 border-2 border-black hover:bg-black/10 cursor-pointer ${styles.text} text-sm truncate`}>
                    Session 00{i}: Project Kirby
                </div>
            ))}
        </div>

        {/* Mascot Area (Bottom of Sidebar) */}
        <div className="p-2 flex justify-center items-end">
            <Mascot 
            theme={theme} 
            state={mascotState} 
            className="w-32 h-32"
            />
        </div>
        
        {/* Bottom Controls */}
        <div className={`p-4 border-t-4 border-black flex justify-around bg-black/5 min-h-[70px]`}>
            <button onClick={toggleTheme} className={`p-2 rounded hover:bg-black/20 ${styles.text} flex items-center gap-2 w-full justify-center font-bold`}>
                {theme === Theme.DARK ? <Moon size={16}/> : 
                 theme === Theme.LIGHT ? <Sun size={16}/> : 
                 theme === Theme.FESTIVAL ? <Star size={16} /> : 
                 theme === Theme.CYBERPUNK ? <Cpu size={16} /> :
                 <span className="text-cyan-300">☾</span>} 
                {theme === Theme.DARK ? 'NIGHT' : 
                 theme === Theme.LIGHT ? 'DAY' : 
                 theme === Theme.FESTIVAL ? 'FEST' : 
                 theme === Theme.CYBERPUNK ? 'CYBER' : 
                 'MOON'}
            </button>
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
                  className="p-1.5 h-8 w-8"
                  title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                >
                    <Menu size={18} />
                </PixelButton>

                <span className={`font-bold ${styles.text} uppercase flex items-center gap-2 truncate`}>
                   {activeProvider?.icon} {activeModel?.name || 'NO MODEL SELECTED'}
                   {activeModel && <span className={`text-xs px-2 py-0.5 border border-black bg-green-400 text-black`}>ONLINE</span>}
                </span>
             </div>
             <div className="flex gap-2">
                 <div className="relative hidden md:block">
                     <input type="text" placeholder="Search..." className="pl-8 pr-2 py-1 border-2 border-black text-sm w-48 font-mono" />
                     <Search className="absolute left-2 top-1.5 w-4 h-4 text-gray-500" />
                 </div>
             </div>
         </div>

         {/* Chat Container */}
         <div className="flex-1 overflow-hidden bg-white/5 relative">
             <Chat 
                theme={theme}
                messages={messages}
                activeModel={activeModel}
                provider={activeProvider}
                onSendMessage={(msg) => setMessages(prev => [...prev, msg])}
                onUpdateMessage={handleUpdateMessage}
                setMascotState={setMascotState}
                onTriggerRainbow={handleRainbowTrigger}
             />
         </div>
      </div>

      {/* Global Modals */}
      {isModelManagerOpen && (
        <ModelManager 
            theme={theme}
            providers={providers}
            models={models}
            onUpdateProviders={setProviders}
            onUpdateModels={setModels}
            onClose={() => setIsModelManagerOpen(false)}
        />
      )}

    </div>
  );
};

export default App;
