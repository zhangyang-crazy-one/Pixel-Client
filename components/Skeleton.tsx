import React from 'react';
import { Theme } from '../types';
import { THEME_STYLES } from '../constants';

interface ChatSkeletonProps {
  theme: Theme;
}

export const ChatSkeleton: React.FC<ChatSkeletonProps> = ({ theme }) => {
  const styles = THEME_STYLES[theme];
  const isPixel = styles.type === 'pixel';

  return (
    <div className="space-y-6 p-4 animate-pulse opacity-50">
      {/* Simulate opponent message */}
      <div className="flex gap-4">
        <div className={`
          w-8 h-8 rounded-full shrink-0
          ${isPixel ? 'bg-black/20' : 'bg-gray-400/30'}
        `} />
        <div className="space-y-3 w-[60%]">
          <div className={`
            h-4 rounded w-full
            ${isPixel ? 'bg-black/20' : 'bg-white/10'}
          `} />
          <div className={`
            h-4 rounded w-[90%]
            ${isPixel ? 'bg-black/20' : 'bg-white/10'}
          `} />
          <div className={`
            h-4 rounded w-[75%]
            ${isPixel ? 'bg-black/20' : 'bg-white/10'}
          `} />
        </div>
      </div>

      {/* Simulate own message */}
      <div className="flex gap-4 flex-row-reverse">
        <div className={`
          w-8 h-8 rounded-full shrink-0
          ${isPixel ? 'bg-black/20' : 'bg-blue-400/30'}
        `} />
        <div className="space-y-3 w-[40%]">
          <div className={`
            h-10 rounded-xl w-full
            ${isPixel ? 'bg-black/20' : 'bg-white/10'}
          `} />
        </div>
      </div>

      {/* Simulate opponent message */}
      <div className="flex gap-4">
        <div className={`
          w-8 h-8 rounded-full shrink-0
          ${isPixel ? 'bg-black/20' : 'bg-gray-400/30'}
        `} />
        <div className="space-y-3 w-[50%]">
          <div className={`
            h-4 rounded w-full
            ${isPixel ? 'bg-black/20' : 'bg-white/10'}
          `} />
        </div>
      </div>
    </div>
  );
};

// Full screen loading skeleton
export const LoadingSkeleton: React.FC<{ theme: Theme; message?: string }> = ({ theme, message }) => {
  const styles = THEME_STYLES[theme];

  return (
    <div className={`
      fixed inset-0 z-50 flex items-center justify-center
      ${styles.bg} ${styles.text} flex-col gap-4
    `}>
      <div className="text-2xl font-bold animate-pulse tracking-widest">
        {message || 'INITIALIZING PIXELVERSE...'}
      </div>
      {/* Extra loading indicator */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full animate-bounce bg-purple-500"
            style={{
              animationDelay: `${i * 0.15}s`,
              animationDuration: '0.6s',
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Session list skeleton
export const SessionListSkeleton: React.FC<{ theme: Theme }> = ({ theme }) => {
  const styles = THEME_STYLES[theme];
  const isPixel = styles.type === 'pixel';

  return (
    <div className="space-y-4 animate-pulse">
      {/* Group title skeleton */}
      <div className="px-2 mb-2">
        <div className={`h-3 rounded w-20 ${isPixel ? 'bg-black/20' : 'bg-white/10'}`} />
      </div>

      {/* Session item skeleton */}
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex items-center justify-between px-3 py-2.5 rounded-lg">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`
              w-8 h-8 rounded shrink-0
              ${isPixel ? 'bg-black/20' : 'bg-white/10'}
            `} />
            <div className="space-y-2 flex-1 min-w-0">
              <div className={`
                h-3 rounded w-3/4
                ${isPixel ? 'bg-black/20' : 'bg-white/10'}
              `} />
              <div className={`
                h-2 rounded w-1/2
                ${isPixel ? 'bg-black/20' : 'bg-white/10'}
              `} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatSkeleton;
