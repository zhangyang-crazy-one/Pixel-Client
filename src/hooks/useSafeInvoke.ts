/**
 * useSafeInvoke - Safe Tauri invoke wrapper that handles component lifecycle
 *
 * Prevents the Tauri warning:
 * "[TAURI] Couldn't find callback id XXXXXXXXX. This might happen when the app
 * is reloaded while Rust is running an asynchronous operation."
 *
 * This hook tracks component mount state and safely ignores callbacks that arrive
 * after the component has unmounted (e.g., during hot reload or navigation).
 */

import { useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Check if running in Tauri environment
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

/**
 * Result wrapper that includes cancellation state
 */
export interface SafeInvokeResult<T> {
  data: T | null;
  cancelled: boolean;
  error: Error | null;
}

/**
 * Options for safe invoke
 */
export interface SafeInvokeOptions {
  /** Suppress console warnings for cancelled operations */
  silent?: boolean;
}

/**
 * Hook that provides a safe wrapper around Tauri's invoke function.
 *
 * Features:
 * - Tracks component mount state
 * - Returns null instead of throwing when component is unmounted
 * - Logs cancelled operations for debugging (optional)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { safeInvoke, isMounted } = useSafeInvoke();
 *
 *   const handleClick = async () => {
 *     const result = await safeInvoke<string>('my_command', { arg: 'value' });
 *     if (result.cancelled) return; // Component unmounted during operation
 *     if (result.error) console.error(result.error);
 *     if (result.data) console.log('Success:', result.data);
 *   };
 *
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useSafeInvoke() {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Safe invoke wrapper that handles component lifecycle
   *
   * @param cmd - Tauri command name
   * @param args - Command arguments (optional)
   * @param options - Additional options (optional)
   * @returns SafeInvokeResult with data, cancelled flag, and error
   */
  const safeInvoke = useCallback(async <T>(
    cmd: string,
    args?: unknown,
    options?: SafeInvokeOptions
  ): Promise<SafeInvokeResult<T>> => {
    // Skip if not in Tauri environment
    if (!isTauri) {
      return {
        data: null,
        cancelled: false,
        error: new Error('Not in Tauri environment')
      };
    }

    // Check if already unmounted before starting
    if (!mountedRef.current) {
      if (!options?.silent) {
        console.debug(`[useSafeInvoke] Skipping '${cmd}' - component already unmounted`);
      }
      return { data: null, cancelled: true, error: null };
    }

    try {
      const result = await invoke<T>(cmd, args as Record<string, unknown>);

      // Check if unmounted during async operation
      if (!mountedRef.current) {
        if (!options?.silent) {
          console.debug(`[useSafeInvoke] Discarding result for '${cmd}' - component unmounted during operation`);
        }
        return { data: null, cancelled: true, error: null };
      }

      return { data: result, cancelled: false, error: null };
    } catch (error) {
      // Check if unmounted - don't report errors for unmounted components
      if (!mountedRef.current) {
        if (!options?.silent) {
          console.debug(`[useSafeInvoke] Ignoring error for '${cmd}' - component unmounted`);
        }
        return { data: null, cancelled: true, error: null };
      }

      // Handle callback not found error gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('callback id')) {
        console.debug(`[useSafeInvoke] Callback ID error for '${cmd}' (likely HMR related):`, errorMessage);
        return { data: null, cancelled: true, error: null };
      }

      return {
        data: null,
        cancelled: false,
        error: error instanceof Error ? error : new Error(errorMessage)
      };
    }
  }, []);

  /**
   * Simple invoke that just returns data or null
   * Useful when you don't need detailed error handling
   */
  const safeInvokeSimple = useCallback(async <T>(
    cmd: string,
    args?: unknown
  ): Promise<T | null> => {
    const result = await safeInvoke<T>(cmd, args, { silent: true });
    return result.data;
  }, [safeInvoke]);

  return {
    /** Safe invoke with full result details */
    safeInvoke,
    /** Simple invoke that just returns data or null */
    safeInvokeSimple,
    /** Check if component is still mounted */
    isMounted: () => mountedRef.current,
    /** Whether running in Tauri environment */
    isTauri,
  };
}

/**
 * Standalone function for use outside React components
 * Does NOT track mount state - use with caution
 *
 * @param cmd - Tauri command name
 * @param args - Command arguments
 * @returns Promise with result or null on error
 */
export async function safeInvokeStandalone<T>(
  cmd: string,
  args?: unknown
): Promise<T | null> {
  if (!isTauri) {
    console.debug(`[safeInvokeStandalone] Not in Tauri environment, skipping '${cmd}'`);
    return null;
  }

  try {
    return await invoke<T>(cmd, args as Record<string, unknown>);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle callback not found error gracefully
    if (errorMessage.includes('callback id')) {
      console.debug(`[safeInvokeStandalone] Callback ID error for '${cmd}' (likely HMR related)`);
      return null;
    }

    console.error(`[safeInvokeStandalone] Error invoking '${cmd}':`, error);
    return null;
  }
}

export default useSafeInvoke;
