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
  let textClass = 'text-white';
  
  if (variant === 'secondary') {
    bgClass = 'bg-gray-500';
  } else if (variant === 'danger') {
    bgClass = 'bg-red-500';
  }

  return (
    <button
      className={`
        relative px-4 py-2 font-bold uppercase tracking-widest
        border-2 border-black
        ${bgClass} ${textClass}
        pixel-shadow transition-transform
        active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
        hover:brightness-110
        flex items-center justify-center gap-2
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
      relative border-4 border-black ${styles.secondary}
      pixel-shadow p-4 ${className}
    `}>
      {title && (
        <div className={`
          absolute -top-5 left-2 px-2 py-1
          border-2 border-black ${styles.primary} text-white
          text-sm font-bold
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
      {label && <label className={`text-sm font-bold uppercase ${styles.text}`}>{label}</label>}
      <input
        className={`
          w-full p-2 outline-none border-2 border-black
          ${styles.inputBg} ${styles.text}
          focus:-translate-y-1 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]
          transition-all duration-200
          placeholder-gray-500
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
            {label && <label className={`text-sm font-bold uppercase ${styles.text}`}>{label}</label>}
            <select
                className={`
                    w-full p-2 outline-none border-2 border-black
                    ${styles.inputBg} ${styles.text}
                    cursor-pointer
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
    return (
        <span className={`
            inline-block px-2 py-0.5 text-xs font-bold border border-black
            ${color ? color : 'bg-gray-300 text-black'}
            shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
        `}>
            {children}
        </span>
    )
}
