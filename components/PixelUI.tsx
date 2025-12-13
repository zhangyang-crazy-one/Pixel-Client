
import React from 'react';
import { Theme } from '../types';
import { THEME_STYLES } from '../constants';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  theme: Theme;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: React.ReactNode;
}

export const PixelButton: React.FC<PixelButtonProps> = ({ 
  children, 
  theme, 
  variant = 'primary', 
  className = '', 
  icon,
  ...props 
}) => {
  const styles = THEME_STYLES[theme];
  
  let bgClass = styles.primary;
  let textClass = styles.primaryText;
  
  if (variant === 'secondary') {
    bgClass = styles.secondary;
    textClass = styles.secondaryText;
  } else if (variant === 'danger') {
    bgClass = 'bg-red-500 hover:bg-red-600';
    textClass = 'text-white';
  }

  return (
    <button
      className={`
        relative px-4 py-2 flex items-center justify-center gap-2
        ${styles.button}
        ${bgClass} ${textClass}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      {...props}
    >
      {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  );
};

interface PixelCardProps {
  theme: Theme;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const PixelCard: React.FC<PixelCardProps> = ({ theme, children, title, className = '' }) => {
  const styles = THEME_STYLES[theme];
  
  return (
    <div className={`
      relative p-4 ${styles.card} ${styles.radius} ${className}
    `}>
      {title && (
        <div className={`
          absolute -top-3 left-4 px-2 py-0.5
          ${styles.borderWidth} ${styles.borderColor} ${styles.primary} text-white
          text-xs font-bold uppercase tracking-wider ${styles.radius}
          ${styles.shadow === 'pixel-shadow' ? 'shadow-[2px_2px_0px_black]' : 'shadow-sm'}
        `}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
};

interface PixelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  theme: Theme;
  label?: string;
}

export const PixelInput: React.FC<PixelInputProps> = ({ theme, label, className = '', ...props }) => {
  const styles = THEME_STYLES[theme];
  
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className={`text-xs font-bold uppercase ${styles.textMuted}`}>{label}</label>}
      <input
        className={`
          w-full p-2 outline-none 
          ${styles.borderWidth} ${styles.borderColor} ${styles.radius}
          ${styles.inputBg} ${styles.text}
          focus:border-blue-400
          transition-all duration-200
          placeholder-gray-500/50
          ${className}
        `}
        {...props}
      />
    </div>
  );
};

interface PixelSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  theme: Theme;
  label?: string;
}

export const PixelSelect: React.FC<PixelSelectProps> = ({ theme, label, children, className = '', ...props }) => {
    const styles = THEME_STYLES[theme];
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && <label className={`text-xs font-bold uppercase ${styles.textMuted}`}>{label}</label>}
            <select
                className={`
                    w-full p-2 outline-none
                    ${styles.borderWidth} ${styles.borderColor} ${styles.radius}
                    ${styles.inputBg} ${styles.text}
                    cursor-pointer
                    focus:border-blue-400
                    ${className}
                `}
                {...props}
            >
                {children}
            </select>
        </div>
    );
};

export const PixelBadge: React.FC<{ theme: Theme; children: React.ReactNode; color?: string }> = ({ theme, children, color }) => {
    const styles = THEME_STYLES[theme];
    const isPixel = styles.type === 'pixel';
    
    return (
        <span className={`
            inline-block px-2 py-0.5 text-[10px] font-bold 
            ${isPixel ? 'border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'rounded-full border border-transparent shadow-sm'}
            ${color ? color : (isPixel ? 'bg-gray-300 text-black' : 'bg-gray-100 text-gray-700')}
        `}>
            {children}
        </span>
    )
}
