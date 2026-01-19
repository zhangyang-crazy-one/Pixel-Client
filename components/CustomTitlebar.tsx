import { useCallback, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';
import { isMacOS, isWindows, isLinux, getPlatform } from '@/platform';

interface CustomTitlebarProps {
  title?: string;
  className?: string;
}

/**
 * Cross-platform custom window titlebar
 * Provides native-like experience on Windows, macOS, and Linux
 *
 * Platform behaviors:
 * - macOS: Traffic lights on left, true close behavior, transparent background
 * - Windows: Controls on right, hide to tray on close, pixel theme styling
 * - Linux: Controls on right, hide to tray on close, native-like styling
 */
export function CustomTitlebar({ title = 'Pixel-Client', className = '' }: CustomTitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [platform, setPlatform] = useState<'windows' | 'macos' | 'linux'>('windows');
  const appWindow = getCurrentWindow();

  // Detect platform on mount
  useEffect(() => {
    setPlatform(getPlatform());
  }, []);

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
    if (isMacOS()) {
      // On macOS, truly close the window (not hide to tray)
      await appWindow.close();
    } else {
      // On Windows/Linux, hide to tray
      await appWindow.hide();
    }
  }, [appWindow]);

  const handleDoubleClick = useCallback(async () => {
    if (!isMacOS()) {
      await appWindow.toggleMaximize();
    }
  }, [appWindow]);

  // macOS-specific: traffic light button colors
  const macOSCloseColor = '#ff5f57';
  const macOSMinimizeColor = '#febc2e';
  const macOSMaximizeColor = '#28c840';

  return (
    <div
      className={`
        custom-titlebar
        custom-titlebar-${platform}
        ${className}
      `}
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
    >
      {/* macOS: Traffic lights on the left */}
      {isMacOS() && (
        <div className="titlebar-traffic-lights" data-tauri-drag-region>
          <button
            className="traffic-light traffic-light-close"
            onClick={handleClose}
            aria-label="Close"
            title="Close"
          >
            <span className="traffic-light-dot" style={{ backgroundColor: macOSCloseColor }} />
          </button>
          <button
            className="traffic-light traffic-light-minimize"
            onClick={handleMinimize}
            aria-label="Minimize"
            title="Minimize"
          >
            <span className="traffic-light-dot" style={{ backgroundColor: macOSMinimizeColor }} />
          </button>
          <button
            className="traffic-light traffic-light-maximize"
            onClick={handleMaximize}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <span className="traffic-light-dot" style={{ backgroundColor: macOSMaximizeColor }} />
          </button>
        </div>
      )}

      {/* App Icon and Title - Hidden on macOS (macOS shows app name in native menu) */}
      {!isMacOS() && (
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
      )}

      {/* Spacer for drag region */}
      <div className="titlebar-spacer" data-tauri-drag-region />

      {/* Window Controls - Right side (Windows/Linux) */}
      {!isMacOS() && (
        <div className="titlebar-controls">
          <button
            className="titlebar-button titlebar-minimize"
            onClick={handleMinimize}
            title={isLinux() ? '最小化' : 'Minimize'}
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
            title={isLinux() ? '最小化到托盘' : 'Close to tray'}
            aria-label="Close to tray"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default CustomTitlebar;
