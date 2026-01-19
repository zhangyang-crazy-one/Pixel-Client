/**
 * Platform detection utility for cross-platform Tauri applications
 * Provides consistent platform detection across Windows, macOS, and Linux
 */

export type Platform = 'windows' | 'macos' | 'linux';

/**
 * Cached platform detection result
 */
let cachedPlatform: Platform | null = null;

/**
 * Get the current platform
 * Uses Tauri APIs when available, falls back to browser User-Agent
 */
export function getPlatform(): Platform {
  if (cachedPlatform) {
    return cachedPlatform;
  }

  // Check if running in Tauri environment
  if (typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      // Try to get platform from Tauri environment
      const userAgent = navigator.userAgent;
      cachedPlatform = detectPlatformFromUserAgent(userAgent);
    } catch {
      // Fallback to user agent detection
      const userAgent = navigator.userAgent;
      cachedPlatform = detectPlatformFromUserAgent(userAgent);
    }
  } else {
    // Browser environment
    const userAgent = navigator.userAgent;
    cachedPlatform = detectPlatformFromUserAgent(userAgent);
  }

  return cachedPlatform;
}

/**
 * Detect platform from User-Agent string
 */
function detectPlatformFromUserAgent(userAgent: string): Platform {
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
    return 'macos';
  }
  if (userAgent.includes('Windows') || userAgent.includes('Win32')) {
    return 'windows';
  }
  if (userAgent.includes('Linux') || userAgent.includes('X11')) {
    return 'linux';
  }
  // Default to Linux for unknown platforms
  return 'linux';
}

/**
 * Platform check helpers
 */
export function isWindows(): boolean {
  return getPlatform() === 'windows';
}

export function isMacOS(): boolean {
  return getPlatform() === 'macos';
}

export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

/**
 * Get platform-specific CSS class name
 */
export function getPlatformClass(): string {
  return `platform-${getPlatform()}`;
}

/**
 * Get platform-specific display name
 */
export function getPlatformDisplayName(): string {
  const platform = getPlatform();
  switch (platform) {
    case 'windows':
      return 'Windows';
    case 'macos':
      return 'macOS';
    case 'linux':
      return 'Linux';
    default:
      return 'Unknown';
  }
}

/**
 * Check if platform supports native traffic lights
 * macOS has native window controls, other platforms use custom
 */
export function hasNativeTrafficLights(): boolean {
  return isMacOS();
}

/**
 * Check if platform should use native menu bar
 * macOS typically uses native menu bar
 */
export function shouldUseNativeMenuBar(): boolean {
  return isMacOS();
}

/**
 * Get platform-specific window control position
 * macOS: left side (traffic lights)
 * Windows/Linux: right side
 */
export function getWindowControlsPosition(): 'left' | 'right' {
  return isMacOS() ? 'left' : 'right';
}

/**
 * Get platform-specific close behavior
 * macOS: truly close the app
 * Windows/Linux: hide to tray
 */
export function getCloseBehavior(): 'close' | 'hide' {
  return isMacOS() ? 'close' : 'hide';
}
