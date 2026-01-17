/**
 * Deep Thinking Hook
 * Manages Deep Thinking mode state and operations for chat sessions
 */

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../services/apiClient';

// ============================================================================
// Types
// ============================================================================

export type ThinkingDepth = 'surface' | 'moderate' | 'deep';

export interface DeepThinkingConfig {
  enabled: boolean;
  maxTokens: number;
  temperature: number;
  showReasoning: boolean;
}

export interface DeepThinkingStatus {
  enabled: boolean;
  tokenUsage: number;
  stepsCompleted: number;
  currentStep?: string;
}

export interface ReasoningBlock {
  step: number;
  content: string;
  confidence: number;
}

export interface ParsedReasoning {
  originalContent: string;
  reasoningBlocks: ReasoningBlock[];
  totalSteps: number;
  totalDurationMs: number;
}

// ============================================================================
// Hook
// ============================================================================

interface UseDeepThinkingReturn {
  // State
  isEnabled: boolean;
  depth: ThinkingDepth;
  status: DeepThinkingStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  enable: (config?: Partial<DeepThinkingConfig>) => Promise<void>;
  disable: () => Promise<void>;
  setDepth: (depth: ThinkingDepth) => Promise<void>;
  configure: (config: Partial<DeepThinkingConfig>) => Promise<void>;
  refreshStatus: () => Promise<void>;
  parseReasoning: (content: string, extractSteps?: boolean) => Promise<ParsedReasoning>;
  
  // Computed
  isActive: boolean;
  canEnable: boolean;
}

export function useDeepThinking(
  sessionId: string | null
): UseDeepThinkingReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [depth, setDepth] = useState<ThinkingDepth>('moderate');
  const [status, setStatus] = useState<DeepThinkingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh status when session changes
  useEffect(() => {
    if (sessionId) {
      refreshStatus();
    } else {
      setStatus(null);
      setIsEnabled(false);
    }
  }, [sessionId]);

  const refreshStatus = useCallback(async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    try {
      const result = await apiClient.getDeepThinkingStatus(sessionId);
      setStatus(result);
      setIsEnabled(result.enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get status');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const enable = useCallback(async (config?: Partial<DeepThinkingConfig>) => {
    if (!sessionId) {
      setError('No session selected');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.enableDeepThinking(sessionId, true, config);
      setIsEnabled(true);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, refreshStatus]);

  const disable = useCallback(async () => {
    if (!sessionId) {
      setError('No session selected');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.enableDeepThinking(sessionId, false);
      setIsEnabled(false);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, refreshStatus]);

  const setDepthCallback = useCallback(
    async (newDepth: ThinkingDepth) => {
      if (!sessionId) {
        setError('No session selected');
        return;
      }

      setIsLoading(true);
      setDepth(newDepth);
      try {
        await apiClient.enableDeepThinking(sessionId, true, {
          maxTokens: newDepth === 'deep' ? 16384 : 8192,
          temperature: newDepth === 'deep' ? 0.5 : newDepth === 'surface' ? 0.9 : 0.7,
        });
        await refreshStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set depth');
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, refreshStatus]
  );

  const configure = useCallback(
    async (config: Partial<DeepThinkingConfig>) => {
      if (!sessionId) {
        setError('No session selected');
        return;
      }

      setIsLoading(true);
      try {
        await apiClient.enableDeepThinking(sessionId, true, config);
        if (config.enabled === false) {
          setIsEnabled(false);
        }
        await refreshStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to configure');
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, refreshStatus]
  );

  const parseReasoning = useCallback(
    async (content: string, extractSteps = true): Promise<ParsedReasoning> => {
      try {
        return await apiClient.parseReasoningContent(content, extractSteps, false);
      } catch (err) {
        // Return empty result on error
        return {
          originalContent: content,
          reasoningBlocks: [],
          totalSteps: 0,
          totalDurationMs: 0,
        };
      }
    },
    []
  );

  return {
    isEnabled,
    depth,
    status,
    isLoading,
    error,
    enable,
    disable,
    setDepth: setDepthCallback,
    configure,
    refreshStatus,
    parseReasoning,
    isActive: isEnabled && sessionId !== null,
    canEnable: sessionId !== null,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get depth display info
 */
export function getDepthInfo(depth: ThinkingDepth): {
  label: string;
  description: string;
  icon: string;
  color: string;
} {
  switch (depth) {
    case 'surface':
      return {
        label: 'Surface',
        description: 'Quick responses with minimal reasoning',
        icon: '⚡',
        color: 'yellow',
      };
    case 'deep':
      return {
        label: 'Deep',
        description: 'Detailed step-by-step analysis',
        icon: '🧠',
        color: 'purple',
      };
    case 'moderate':
    default:
      return {
        label: 'Moderate',
        description: 'Balanced reasoning with some depth',
        icon: '💭',
        color: 'blue',
      };
  }
}

/**
 * Get thinking status display
 */
export function getStatusDisplay(status: DeepThinkingStatus): {
  label: string;
  color: 'green' | 'yellow' | 'gray';
} {
  if (!status.enabled) {
    return { label: 'Disabled', color: 'gray' };
  }
  if (status.stepsCompleted > 0) {
    return { label: `Thinking (${status.stepsCompleted} steps)`, color: 'green' };
  }
  return { label: 'Enabled', color: 'yellow' };
}

/**
 * Format token usage
 */
export function formatTokenUsage(used: number, max: number): string {
  const percent = max > 0 ? (used / max) * 100 : 0;
  return `${used.toLocaleString()} / ${max.toLocaleString()} (${percent.toFixed(1)}%)`;
}

/**
 * Get recommended depth for task type
 */
export function getRecommendedDepth(taskType: string): ThinkingDepth {
  const lowerTask = taskType.toLowerCase();
  
  if (
    lowerTask.includes('code') ||
    lowerTask.includes('debug') ||
    lowerTask.includes('analyze')
  ) {
    return 'deep';
  }
  
  if (
    lowerTask.includes('simple') ||
    lowerTask.includes('quick') ||
    lowerTask.includes('summary')
  ) {
    return 'surface';
  }
  
  return 'moderate';
}
