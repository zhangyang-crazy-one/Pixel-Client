
import React, { useRef, useEffect, useState } from 'react';
import { Theme } from '../types';

interface MascotProps {
  theme: Theme;
  state: 'idle' | 'thinking' | 'happy' | 'shocked';
  className?: string;
}

type ActionState = 'none' | 'smoking' | 'glasses' | 'gaming' | 'phone' | 'wink';

export const Mascot: React.FC<MascotProps> = ({ theme, state: appState, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blink, setBlink] = useState(false);
  const [actionState, setActionState] = useState<ActionState>('none');
  const [smokeFrame, setSmokeFrame] = useState(0); // For animating smoke
  
  const isCyberpunk = theme === Theme.CYBERPUNK;

  // Palette - Dynamic based on theme
  const colors = isCyberpunk ? {
      black: '#050510', // Deep Space
      skin: '#D1F7FF',  // Holo Blue Skin
      blush: '#FF2A6D', // Neon Pink
      red: '#FF2A6D',   // Neon Pink
      white: '#00FF9F', // Matrix Green (Glows)
      gray: '#2D1B4E',  // Indigo (Clothes/Armor)
      smoke: '#05D9E8', // Cyan Smoke
      blue: '#05D9E8',  // Cyan
      glass: '#FFC800', // Bright Yellow Visor
      device: '#2D1B4E',// Indigo Device
      hair: '#120828',  // Darker Indigo Hair
      highlight: '#FF2A6D' // Pink Highlights
  } : {
      black: '#1a1a1a',
      skin: '#ffdfc4',
      blush: '#ffb6c1',
      red: '#e74c3c',
      white: '#ffffff',
      gray: '#95a5a6',
      smoke: '#ecf0f1',
      blue: '#3498db',
      glass: '#2c3e50',
      device: '#7f8c8d',
      hair: '#1a1a1a',
      highlight: '#1a1a1a'
  };

  // Handle Click - Trigger Random Cool Action
  const handleClick = () => {
    if (actionState !== 'none') return; // Prevent spamming
    
    const actions: ActionState[] = ['smoking', 'glasses', 'gaming', 'phone', 'wink'];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    
    setActionState(randomAction);

    // Reset after animation duration
    setTimeout(() => {
        setActionState('none');
    }, 3000);
  };

  // Animation Loops
  useEffect(() => {
    // Blink Loop
    const blinkInterval = setInterval(() => {
       setBlink(true);
       setTimeout(() => setBlink(false), 150);
    }, 4000); 

    // Smoke/Animation Frame Loop (Targeting 8 FPS approx 125ms)
    const animInterval = setInterval(() => {
        setSmokeFrame(prev => (prev + 1) % 4);
    }, 125);

    return () => {
        clearInterval(blinkInterval);
        clearInterval(animInterval);
    };
  }, []);

  const getFrame = () => {
    const grid = Array(24).fill(null).map(() => Array(24).fill(0));
    // 1=Black, 2=Skin, 3=Blush, 4=Red, 5=White, 6=Gray, 7=Smoke, 8=Blue, 9=Glass, 10=Device, 11=Hair, 12=Highlight

    const rect = (x: number, y: number, w: number, h: number, c: number) => {
        for(let i=x; i<x+w; i++) for(let j=y; j<y+h; j++) if(i>=0 && i<24 && j>=0 && j<24) grid[j][i] = c;
    };

    // --- BASE BODY ---
    // Shirt
    rect(5, 19, 14, 5, 1); 
    rect(4, 20, 1, 4, 1); rect(19, 20, 1, 4, 1);
    // Cyberpunk Shirt Detail
    if (isCyberpunk) {
        rect(10, 20, 4, 4, 6); // Armor plate
        rect(11, 21, 2, 1, 8); // Core light
    }
    
    // Neck
    rect(10, 17, 4, 2, 2);
    if (isCyberpunk) rect(10, 18, 4, 1, 6); // Metallic neck collar

    // Face Shape
    rect(6, 9, 12, 9, 2); 
    rect(5, 10, 1, 7, 2); rect(17, 10, 1, 7, 2);
    rect(7, 18, 10, 1, 2);

    // Hair (Dynamic Color)
    rect(6, 2, 12, 7, 11); 
    rect(4, 4, 2, 6, 11); rect(18, 4, 2, 6, 11);
    rect(3, 6, 2, 8, 11); rect(19, 6, 2, 7, 11);
    // Bangs
    rect(6, 6, 2, 4, 11); rect(10, 6, 4, 4, 11); rect(16, 5, 2, 4, 11);
    
    if (isCyberpunk) {
        // Cyber Hair Highlight
        rect(16, 5, 2, 2, 12);
        // Tech lines on face
        rect(6, 13, 1, 4, 6);
        rect(17, 13, 1, 4, 6);
    } else {
        // Loose strand (Normal)
        rect(11, 1, 2, 2, 11);
    }

    // --- EYES & EXPRESSION BASE ---
    const currentState = actionState !== 'none' ? actionState : appState;
    const isBlinking = blink && actionState === 'none';

    // CYBER VISOR (Overrides normal eyes if Cyberpunk)
    if (isCyberpunk && currentState !== 'glasses' && currentState !== 'wink' && currentState !== 'phone' && currentState !== 'thinking') {
        rect(7, 12, 10, 3, 9); // Visor band
        rect(8, 13, 8, 1, 4); // Red sensor line
    } else {
        // Default Eyes
        if (!isBlinking && currentState !== 'glasses' && currentState !== 'wink' && currentState !== 'phone') {
            rect(8, 12, 2, 3, 1); // L
            rect(15, 12, 2, 3, 1); // R
        } else if (isBlinking) {
            rect(8, 13, 2, 1, 1);
            rect(15, 13, 2, 1, 1);
        }
    }

    // Mouth
    if (currentState === 'happy' || currentState === 'wink') {
        rect(10, 16, 4, 1, 1); rect(9, 15, 1, 1, 1); rect(14, 15, 1, 1, 1); // Smile
    } else if (currentState === 'shocked') {
        rect(11, 16, 2, 2, 1); // O
    } else if (currentState !== 'smoking') {
        rect(11, 16, 2, 1, 1); // Neutral
    }

    // --- ACTION SPECIFIC OVERLAYS ---

    if (currentState === 'thinking') {
        // Hand on chin
        rect(14, 17, 4, 3, 2);
        rect(12, 16, 1, 1, 4); // Small mouth
    }

    if (currentState === 'phone') {
        // Eyes looking down (Cyberpunk overrides visor for this action to look at screen?)
        // Let's keep visor but shift the line
        if (isCyberpunk) {
             rect(7, 12, 10, 3, 9);
             rect(8, 14, 8, 1, 4); // Look down
        } else {
            rect(8, 13, 2, 2, 1);
            rect(15, 13, 2, 2, 1);
        }
        
        // Hand holding phone
        rect(7, 18, 4, 4, 2); // Hand L
        rect(14, 18, 4, 4, 2); // Hand R
        rect(9, 19, 6, 4, 10); // Phone back
        rect(10, 20, 4, 2, 8); // Screen glow
        
        // Light reflection on face
        rect(10, 14, 1, 1, 8);
    }

    if (currentState === 'gaming') {
        // Holding controller
        rect(6, 19, 12, 4, 6); // Controller body
        rect(5, 20, 2, 3, 2); // Hand L
        rect(17, 20, 2, 3, 2); // Hand R
        rect(8, 20, 1, 1, 1); // Dpad
        rect(15, 20, 1, 1, 4); // Button
        
        if (!isCyberpunk) {
            // Intense eyes
            rect(8, 12, 2, 2, 1);
            rect(15, 12, 2, 2, 1);
        } else {
             // Visor flashes
             rect(7, 12, 10, 3, 9);
             rect(8, 13, 8, 1, blink ? 5 : 4); 
        }
    }

    if (currentState === 'glasses') {
        // Pixel Shades
        rect(6, 12, 12, 3, 1); // Frames
        rect(7, 13, 4, 1, 9); // Lens L
        rect(13, 13, 4, 1, 9); // Lens R
        rect(7, 13, 1, 1, 5); // Glint
    }

    if (currentState === 'wink') {
        if (isCyberpunk) {
            rect(7, 12, 10, 3, 9);
            rect(8, 13, 3, 1, 4); // Left eye open
            rect(13, 13, 3, 1, 1); // Right eye closed (black line on visor?)
        } else {
            rect(8, 12, 2, 3, 1); // Left Open
            rect(15, 13, 2, 1, 1); // Right Wink
        }
        
        rect(17, 11, 1, 1, 5); // Sparkle center
        rect(17, 10, 1, 1, 8); // Sparkle Top
        rect(17, 12, 1, 1, 8); // Sparkle Bot
        rect(16, 11, 1, 1, 8); // Sparkle L
        rect(18, 11, 1, 1, 8); // Sparkle R
        
        // Finger Gun
        rect(4, 18, 4, 2, 2); 
        rect(4, 16, 1, 2, 2); // Thumb
        rect(7, 16, 1, 2, 2); // Index
    }

    if (currentState === 'smoking') {
        // Hand up
        rect(14, 17, 3, 3, 2);
        // Cigarette
        rect(13, 16, 2, 1, 5); // White part
        rect(12, 16, 1, 1, 4); // Ember
        
        // Smoke Physics (Looping)
        if (smokeFrame === 0) {
            rect(11, 14, 1, 1, 7);
        } else if (smokeFrame === 1) {
            rect(10, 13, 2, 1, 7);
        } else if (smokeFrame === 2) {
            rect(10, 12, 1, 1, 7);
            rect(12, 11, 1, 1, 7);
        } else {
            rect(9, 10, 2, 1, 7);
            rect(13, 9, 2, 1, 7);
        }
        
        if (!isCyberpunk) {
            // Chill eyes
            rect(8, 13, 2, 1, 1);
            rect(15, 13, 2, 1, 1);
        }
    }

    return grid;
  };

  // Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grid = getFrame();
    const pixelSize = canvas.width / 24;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for(let y=0; y<24; y++) {
        for(let x=0; x<24; x++) {
            const type = grid[y][x];
            if (type === 0) continue;
            
            switch(type) {
                case 1: ctx.fillStyle = colors.black; break;
                case 2: ctx.fillStyle = colors.skin; break;
                case 3: ctx.fillStyle = colors.blush; break;
                case 4: ctx.fillStyle = colors.red; break;
                case 5: ctx.fillStyle = colors.white; break;
                case 6: ctx.fillStyle = colors.gray; break;
                case 7: ctx.fillStyle = colors.smoke; break;
                case 8: ctx.fillStyle = colors.blue; break;
                case 9: ctx.fillStyle = colors.glass; break;
                case 10: ctx.fillStyle = colors.device; break;
                case 11: ctx.fillStyle = colors.hair; break;
                case 12: ctx.fillStyle = colors.highlight; break;
            }
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
    }
  }, [appState, actionState, blink, smokeFrame, theme]);

  return (
    <div 
      className={`relative group cursor-pointer transition-transform duration-300 ${className}`}
      onClick={handleClick}
    >
      {/* Speech Bubble for Interaction */}
      {actionState !== 'none' && (
         <div className="absolute -top-8 right-0 bg-white border-2 border-black p-1 z-20 animate-bounce">
            {actionState === 'smoking' && <span className="text-xs font-bold text-black">...</span>}
            {actionState === 'glasses' && <span className="text-xs font-bold text-black">B)</span>}
            {actionState === 'gaming' && <span className="text-xs font-bold text-black">GG</span>}
            {actionState === 'wink' && <span className="text-xs font-bold text-black">★</span>}
            {actionState === 'phone' && <span className="text-xs font-bold text-black">@_@</span>}
         </div>
      )}

      <canvas 
        ref={canvasRef} 
        width={192} 
        height={192} 
        className="w-full h-full image-pixelated drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)] group-hover:-translate-y-1 transition-transform"
      />
    </div>
  );
};
