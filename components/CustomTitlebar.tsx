import { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

interface CustomTitlebarProps {
  title?: string;
  className?: string;
}

/**
 * Custom window titlebar component for Tauri application
 * Provides minimize, maximize/restore, and close (to tray) functionality
 * Works on Windows, macOS, and Linux
 */
export function CustomTitlebar({ title = 'PixelVerse', className = '' }: CustomTitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  // Check initial maximized state
  useEffect(() => {
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();

    // Listen for window resize events to update maximize state
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  const handleMinimize = useCallback(async () => {
    await appWindow.minimize();
  }, [appWindow]);

  const handleMaximize = useCallback(async () => {
    await appWindow.toggleMaximize();
  }, [appWindow]);

  const handleClose = useCallback(async () => {
    // This will trigger the close event which is intercepted by Rust
    // to hide to tray instead of closing
    await appWindow.hide();
  }, [appWindow]);

  const handleDoubleClick = useCallback(async () => {
    await appWindow.toggleMaximize();
  }, [appWindow]);

  return (
    <div
      className={`custom-titlebar ${className}`}
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
    >
      {/* App Icon and Title */}
      <div className="titlebar-title" data-tauri-drag-region>
        <div className="titlebar-icon" data-tauri-drag-region>
          <img
            src="/app-icon.png"
            alt="App Icon"
            width="20"
            height="20"
            data-tauri-drag-region
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <span className="titlebar-text" data-tauri-drag-region>
          {title}
        </span>
      </div>

      {/* Spacer for drag region */}
      <div className="titlebar-spacer" data-tauri-drag-region />

      {/* Window Controls */}
      <div className="titlebar-controls">
        <button
          className="titlebar-button titlebar-minimize"
          onClick={handleMinimize}
          title="最小化"
          aria-label="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          className="titlebar-button titlebar-maximize"
          onClick={handleMaximize}
          title={isMaximized ? '还原' : '最大化'}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button
          className="titlebar-button titlebar-close"
          onClick={handleClose}
          title="最小化到托盘"
          aria-label="Close to tray"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default CustomTitlebar;
