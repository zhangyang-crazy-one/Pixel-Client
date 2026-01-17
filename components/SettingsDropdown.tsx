import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Theme, Language } from '../types';
import { THEME_STYLES, TRANSLATIONS } from '../constants';
import { Settings, ChevronDown, Globe, Check, Palette } from 'lucide-react';

interface SettingsDropdownProps {
  theme: Theme;
  language: Language;
  onThemeChange: (theme: Theme) => void;
  onLanguageChange: (language: Language) => void;
  isBackendOffline?: boolean;
}

const THEME_OPTIONS = [
  { value: Theme.DARK, labelKey: 'themeNight', colors: 'from-purple-500 to-pink-500' },
  { value: Theme.LIGHT, labelKey: 'themeDay', colors: 'from-orange-400 to-yellow-500' },
  { value: Theme.SHADCN_DARK, labelKey: 'themeShadcnNight', colors: 'from-zinc-700 to-zinc-900' },
  { value: Theme.SHADCN_LIGHT, labelKey: 'themeShadcnDay', colors: 'from-zinc-200 to-zinc-400' },
  { value: Theme.CYBER, labelKey: 'themeCyber', colors: 'from-cyan-400 to-blue-500' },
  { value: Theme.SUNSET, labelKey: 'themeSunset', colors: 'from-orange-500 to-red-500' },
] as const;

const LANGUAGE_OPTIONS = [
  { value: 'zh', label: 'Chinese', flag: '🇨🇳', nativeName: '中文' },
  { value: 'en', label: 'English', flag: '🇺🇸', nativeName: 'English' },
  { value: 'ja', label: 'Japanese', flag: '🇯🇵', nativeName: '日本語' },
] as const;

export const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'theme' | 'language'>('theme');
  const containerRef = useRef<HTMLDivElement>(null);
  const styles = THEME_STYLES[theme];
  const t = TRANSLATIONS[language];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const getThemeLabel = useCallback((themeValue: Theme) => {
    const option = THEME_OPTIONS.find(o => o.value === themeValue);
    if (!option) return themeValue;
    const labelKey = option.labelKey;
    return t[labelKey as keyof typeof t] || themeValue;
  }, [t]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 ${styles.radius}
          transition-all duration-200
          ${styles.textMuted} hover:bg-black/5
          ${styles.type === 'pixel' ? `${styles.borderWidth} ${styles.borderColor} ${styles.shadow} active:translate-x-[2px] active:translate-y-[2px] active:shadow-none` : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
        `}
        aria-label="Settings"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Settings size={18} />
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute top-full right-0 mt-2 w-72 z-[100]
            ${styles.radius} ${styles.borderWidth} ${styles.borderColor}
            ${styles.secondary} ${styles.shadow}
            overflow-hidden animate-float
          `}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Tab Navigation */}
          <div className={`
            flex border-b ${styles.borderColor}
            ${styles.secondaryText}
          `}>
            <button
              onClick={() => setActiveTab('theme')}
              className={`
                flex-1 px-4 py-3 text-sm font-medium
                flex items-center justify-center gap-2
                transition-colors duration-150
                ${activeTab === 'theme'
                  ? `${styles.primary} ${styles.primaryText}`
                  : `${styles.textMuted} hover:${styles.text}`
                }
              `}
              role="menuitem"
              aria-selected={activeTab === 'theme'}
            >
              <Palette size={16} />
              <span>{t.theme}</span>
            </button>
            <button
              onClick={() => setActiveTab('language')}
              className={`
                flex-1 px-4 py-3 text-sm font-medium
                flex items-center justify-center gap-2
                transition-colors duration-150
                ${activeTab === 'language'
                  ? `${styles.primary} ${styles.primaryText}`
                  : `${styles.textMuted} hover:${styles.text}`
                }
              `}
              role="menuitem"
              aria-selected={activeTab === 'language'}
            >
              <Globe size={16} />
              <span>{t.language}</span>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto p-2">
            {activeTab === 'theme' ? (
              <div className="grid grid-cols-2 gap-2 p-2">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onThemeChange(option.value)}
                    className={`
                      relative flex flex-col items-center p-2 ${styles.radius} border-2 transition-all
                      ${styles.type === 'pixel' ? `${styles.shadow} active:translate-x-[2px] active:translate-y-[2px] active:shadow-none` : ''}
                      ${theme === option.value
                        ? `${styles.borderColor} bg-black/5 scale-[0.98]`
                        : 'border-transparent hover:bg-black/5'}
                    `}
                    role="menuitem"
                    aria-selected={theme === option.value}
                  >
                    {/* Mini preview */}
                    <div className={`
                      w-full h-12 rounded overflow-hidden relative border ${styles.borderColor} opacity-80 mb-2
                    `}>
                      {/* Simulate sidebar */}
                      <div className={`
                        absolute left-0 top-0 bottom-0 w-1/4
                        ${option.value.includes('dark') || option.value === 'cyber'
                          ? 'bg-[#1A1938]'
                          : option.value === 'sunset'
                            ? 'bg-[#2D2D32]'
                            : 'bg-[#F4E4BC]'}
                      `}></div>
                      {/* Simulate primary color button */}
                      <div className={`
                        absolute right-2 top-2 w-8 h-2 rounded-sm bg-gradient-to-r ${option.colors}
                      `}></div>
                    </div>

                    <span className="text-xs font-bold uppercase text-center">{getThemeLabel(option.value)}</span>

                    {/* Selected mark */}
                    {theme === option.value && (
                      <div className="absolute top-1 right-1 text-green-500">
                        <Check size={12} fill="currentColor" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onLanguageChange(option.value as Language)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 ${styles.radius}
                      transition-all duration-150
                      ${styles.type === 'pixel' ? `${styles.borderWidth} ${styles.borderColor} ${styles.shadow} active:translate-x-[2px] active:translate-y-[2px] active:shadow-none` : ''}
                      ${language === option.value
                        ? `${styles.primary} ${styles.primaryText}`
                        : `${styles.text} hover:bg-black/10`
                      }
                    `}
                    role="menuitem"
                    aria-selected={language === option.value}
                  >
                    <span className="text-lg">{option.flag}</span>
                    <div className="flex-1 text-left">
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="block text-xs opacity-60">{option.nativeName}</span>
                    </div>
                    {language === option.value && (
                      <Check size={16} className={language === option.value ? styles.primaryText : 'opacity-70'} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with shortcuts */}
          <div className={`
            px-4 py-2 text-xs ${styles.textMuted}
            border-t ${styles.borderColor} border-opacity-30
            flex justify-between items-center
          `}>
            <span>Shortcuts</span>
            <div className="flex gap-1">
              <kbd className={`
                px-1.5 py-0.5 rounded text-[10px]
                ${styles.borderWidth} ${styles.borderColor} ${styles.secondary}
              `}>Ctrl+M</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDropdown;
