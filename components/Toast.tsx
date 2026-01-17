import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Theme } from '../types';
import { THEME_STYLES } from '../constants';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

interface ThemeContextValue {
  isDark: boolean;
  theme: Theme;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
const ThemeContext = createContext<ThemeContextValue>({ isDark: true, theme: Theme.DARK });

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Light themes in the app
const LIGHT_THEMES: Theme[] = [
  Theme.LIGHT,
  Theme.MODERN_LIGHT,
  Theme.SHADCN_LIGHT,
  Theme.SUNSET
];

// Determine if a theme is dark
const isThemeDark = (theme: Theme): boolean => {
  return !LIGHT_THEMES.includes(theme);
};

// Get theme-aware color classes
const getToastColors = (type: ToastType, isDark: boolean) => {
  if (isDark) {
    return {
      bg: type === 'error' ? 'bg-red-950/90' : 
          type === 'success' ? 'bg-emerald-950/90' :
          type === 'warning' ? 'bg-yellow-950/90' : 'bg-zinc-800/90',
      border: type === 'error' ? 'border-red-500' : 
              type === 'success' ? 'border-emerald-500' :
              type === 'warning' ? 'border-yellow-500' : 'border-blue-500',
      text: type === 'error' ? 'text-red-100' : 
            type === 'success' ? 'text-emerald-100' :
            type === 'warning' ? 'text-yellow-100' : 'text-zinc-100',
      icon: type === 'error' ? 'text-red-500' : 
            type === 'success' ? 'text-emerald-500' :
            type === 'warning' ? 'text-yellow-500' : 'text-blue-500',
    };
  } else {
    return {
      bg: type === 'error' ? 'bg-red-50/90' : 
          type === 'success' ? 'bg-emerald-50/90' :
          type === 'warning' ? 'bg-yellow-50/90' : 'bg-white/90',
      border: type === 'error' ? 'border-red-500' : 
              type === 'success' ? 'border-emerald-500' :
              type === 'warning' ? 'border-yellow-500' : 'border-blue-500',
      text: type === 'error' ? 'text-red-800' : 
            type === 'success' ? 'text-emerald-800' :
            type === 'warning' ? 'text-yellow-800' : 'text-zinc-800',
      icon: type === 'error' ? 'text-red-500' : 
            type === 'success' ? 'text-emerald-500' :
            type === 'warning' ? 'text-yellow-500' : 'text-blue-500',
    };
  }
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const { isDark, theme } = useContext(ThemeContext);
  const styles = THEME_STYLES[theme];

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={18} className={getToastColors(toast.type, isDark).icon} />,
    error: <AlertCircle size={18} className={getToastColors(toast.type, isDark).icon} />,
    warning: <AlertCircle size={18} className={getToastColors(toast.type, isDark).icon} />,
    info: <Info size={18} className={getToastColors(toast.type, isDark).icon} />
  };

  const ProgressBar = ({ duration, color }: { duration: number; color: string }) => (
    <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 w-full">
      <div 
        className="h-full opacity-100" 
        style={{ 
          width: '100%', 
          animation: `shrink ${duration}ms linear forwards`,
          backgroundColor: color
        }} 
      />
      <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );

  const colors = getToastColors(toast.type, isDark);

  return (
    <div className={`
      relative overflow-hidden pointer-events-auto
      flex items-center gap-3 px-4 py-3 min-w-[320px] max-w-[400px]
      backdrop-blur-md border-l-4
      transition-all duration-300 ease-out transform translate-y-0 opacity-100
      ${styles.radius}
      ${styles.type === 'pixel' ? `${styles.shadow} ${styles.borderWidth} ${styles.borderColor}` : 'shadow-xl'}
      ${colors.bg} ${colors.border} ${colors.text}
    `}>
      <div className="shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 text-sm font-medium">{toast.message}</div>
      <ProgressBar 
        duration={4000} 
        color={toast.type === 'error' ? '#ef4444' : 
               toast.type === 'success' ? '#10b981' : 
               toast.type === 'warning' ? '#eab308' : '#3b82f6'} 
      />
      <button
        onClick={() => onRemove(toast.id)}
        className={`ml-2 opacity-50 hover:opacity-100 transition-opacity ${colors.text}`}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode; theme?: Theme }> = ({ children, theme = Theme.DARK }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const isDark = isThemeDark(theme);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${++idRef.current}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ThemeContext.Provider value={{ isDark, theme }}>
        {children}
        {toasts.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
              <div key={toast.id} className="pointer-events-auto animate-toast-in">
                <ToastItem toast={toast} onRemove={removeToast} />
              </div>
            ))}
          </div>
        )}
      </ThemeContext.Provider>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
